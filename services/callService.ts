import { PermissionsAndroid, Platform, AppState } from "react-native";
import { httpsCallable } from "firebase/functions";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  MediaStream,
  RTCPeerConnection,
} from "@livekit/react-native-webrtc";
import type { CallSession } from "expo-callkit-telecom";
import { auth, db, functions } from "@/firebase";
import { isCallActive, setCall, useCallStore } from "@/stores/callStore";
import {
  playEndTone,
  startRingback,
  stopRingback,
  type EndTone,
} from "./callTones";
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";

// ---------- Lazy native modules ----------
type WebRTC = typeof import("@livekit/react-native-webrtc");
let webrtc: WebRTC | null | undefined;

function getWebRTC(): WebRTC | null {
  if (webrtc !== undefined) return webrtc;
  try {
    webrtc = require("@livekit/react-native-webrtc") as WebRTC;
    // Without this, native waits on JS for audio-device events and stalls setRemoteDescription
    (webrtc as any).audioDeviceModuleEvents?.setupListeners?.();
  } catch (e) {
    console.log("@livekit/react-native-webrtc not available in this build", e);
    webrtc = null;
  }
  return webrtc;
}

export const isCallingAvailable = () => getWebRTC() !== null;

type CallKit = typeof import("expo-callkit-telecom");
let callKit: CallKit | null | undefined;

function getCallKit(): CallKit | null {
  if (callKit !== undefined) return callKit;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    callKit = require("expo-callkit-telecom") as CallKit;
  } catch (e) {
    console.log("expo-callkit-telecom not available in this build", e);
    callKit = null;
  }
  return callKit;
}

// ---------- Module state (one call at a time) ----------
const RING_TIMEOUT_MS = 45_000;

type CandidateData = {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
};

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let callId: string | null = null; // our Firestore call id
let nativeId: string | null = null; // OS (CallKit) session id of the current call
let answerRequestId: string | null = null; // pending CallKit "answer" to fulfill
let isCaller = false;
let remoteDescriptionSet = false;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let unsubCall: Unsubscribe | null = null;
let unsubCandidates: Unsubscribe | null = null;
const pendingLocal: CandidateData[] = [];

// Incoming calls that CallKit is ringing for but we haven't answered yet
const incomingSessions = new Map<string, { serverId: string; name: string }>();
const ringingWatchers = new Map<string, Unsubscribe>(); // serverCallId -> unsub

// The library's types omit addEventListener, but it exists at runtime
type Listener = (e: any) => void;
function listen(peer: RTCPeerConnection, type: string, handler: Listener) {
  (
    peer as unknown as {
      addEventListener: (t: string, h: Listener) => void;
    }
  ).addEventListener(type, handler);
}

// ---------- Helpers ----------

// Call once after login so the prompt appears while the app is in front
export async function requestMicPermissionEarly() {
  if (Platform.OS !== "ios") return;
  try {
    const cur = await getRecordingPermissionsAsync();
    if (!cur.granted && cur.canAskAgain)
      await requestRecordingPermissionsAsync();
  } catch (e) {
    console.log("requestMicPermissionEarly failed", e);
  }
}

async function ensureMicPermission() {
  if (Platform.OS === "android") {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (res !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error("Microphone permission denied");
    }
    return;
  }
  const cur = await getRecordingPermissionsAsync();
  if (cur.granted) return;
  // A prompt can't show from the lock screen / background, so don't wait on it
  if (AppState.currentState !== "active" || !cur.canAskAgain) {
    throw new Error("Microphone permission not granted");
  }
  const res = await requestRecordingPermissionsAsync();
  if (!res.granted) throw new Error("Microphone permission denied");
}

async function fetchIceServers() {
  const fn = httpsCallable(functions, "getIceServers");
  const res = await fn();
  return (res.data as { iceServers: unknown[] }).iceServers;
}

function messageFor(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "functions/failed-precondition":
      return "This person is on another call.";
    case "functions/resource-exhausted":
      return "Too many calls. Please try again later.";
    case "functions/permission-denied":
      return "You can't call this person.";
    case "functions/unauthenticated":
      return "Please sign in to make calls.";
    default:
      return "Could not start the call. Please try again.";
  }
}

// ---------- Native call UI helpers ----------
type EndReason = Parameters<CallKit["reportCallEnded"]>[1];

// Tell the OS the call is over (remote hung up, failed, ...). Safe to call twice.
async function endNative(reason: EndReason) {
  const id = nativeId;
  nativeId = null;
  answerRequestId = null;
  if (!id) return;
  try {
    await getCallKit()?.reportCallEnded(id, reason);
  } catch (e) {
    console.log("reportCallEnded skipped", e);
  }
}

// The user answered but we couldn't connect: fail the pending answer action
async function failNativeAnswer() {
  const ck = getCallKit();
  const id = nativeId;
  const req = answerRequestId;
  nativeId = null;
  answerRequestId = null;
  if (!ck || !id) return;
  try {
    if (req) await ck.failIncomingCallConnected(id, req);
    else await ck.reportCallEnded(id, "failed");
  } catch (e) {
    console.log("failNativeAnswer skipped", e);
  }
}

// Media is flowing: let CallKit move the call to "connected"
function reportNativeConnected() {
  const ck = getCallKit();
  if (!ck || !nativeId) return;
  if (isCaller) {
    ck.reportOutgoingCallConnected(nativeId).catch((e) =>
      console.log("reportOutgoingCallConnected failed", e),
    );
  } else if (answerRequestId) {
    const req = answerRequestId;
    answerRequestId = null;
    ck.fulfillIncomingCallConnected(req).catch((e) =>
      console.log("fulfillIncomingCallConnected failed", e),
    );
  }
}

// ---------- Speaker / mute ----------
export const isSpeakerAvailable = () => getCallKit() !== null;

export function toggleSpeaker() {
  const ck = getCallKit();
  if (!ck) return;
  const next = !useCallStore.getState().speakerOn;
  try {
    ck.setAudioSessionPortOverride(next);
    setCall({ speakerOn: next });
  } catch (e) {
    console.log("toggleSpeaker failed", e);
  }
}

// Idempotent: used by our own button and by the system UI's mute button
function applyMute(muted: boolean) {
  localStream?.getAudioTracks().forEach((t) => {
    t.enabled = !muted;
  });
  setCall({ muted });
}

export function toggleMute() {
  const next = !useCallStore.getState().muted;
  applyMute(next);
  if (nativeId) {
    getCallKit()
      ?.setMuted(nativeId, next)
      .catch((e) => console.log("setMuted failed", e));
  }
}

// ---------- Shared setup ----------
async function setup() {
  const rtc = getWebRTC();
  if (!rtc) throw new Error("Calling is not available in this build");
  await ensureMicPermission();

  const iceServers = await fetchIceServers();
  const peer = new rtc.RTCPeerConnection({ iceServers } as never);
  pc = peer;
  console.log("[call] pc assigned");

  // Handlers BEFORE setLocalDescription so no candidate is missed
  listen(peer, "icecandidate", (e) => onLocalCandidate(e));
  listen(peer, "connectionstatechange", () => {
    const state = (peer as unknown as { connectionState?: string })
      .connectionState;
    console.log("PC state:", state);
    if (state === "connected") {
      stopRingback();
      if (ringTimer) clearTimeout(ringTimer);
      setCall({ phase: "connected", connectedAt: Date.now() });
      reportNativeConnected();
    } else if (state === "failed") {
      void hangUp({ failed: true });
    }
  });

  localStream = await rtc.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  localStream.getAudioTracks().forEach((t) => peer.addTrack(t, localStream!));
  // Remote audio plays automatically; no RTCView needed
  console.log("[call] setup finished");
}

// ---------- ICE candidates ----------
function onLocalCandidate(e: any) {
  const c = e?.candidate;
  if (!c?.candidate) return;
  console.log("ICE local:", c.candidate); // look for "typ relay"
  const data: CandidateData = {
    candidate: c.candidate,
    sdpMid: c.sdpMid ?? null,
    sdpMLineIndex: c.sdpMLineIndex ?? null,
  };
  if (!callId)
    pendingLocal.push(data); // caller: no callId yet
  else void writeCandidate(data);
}

async function writeCandidate(data: CandidateData) {
  if (!callId) return;
  const col = isCaller ? "callerCandidates" : "calleeCandidates";
  try {
    await addDoc(collection(db, "calls", callId, col), data);
  } catch (e) {
    console.log("writeCandidate failed", e);
  }
}

// Only called after the remote description is set
function listenToRemoteCandidates(id: string) {
  const rtc = getWebRTC();
  if (!rtc) return;
  const col = isCaller ? "calleeCandidates" : "callerCandidates";
  unsubCandidates = onSnapshot(collection(db, "calls", id, col), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const d = change.doc.data();
      pc?.addIceCandidate(
        new rtc.RTCIceCandidate({
          candidate: d.candidate,
          sdpMid: d.sdpMid,
          sdpMLineIndex: d.sdpMLineIndex,
        }),
      ).catch((err) => console.log("addIceCandidate failed", err));
    });
  });
}

// ---------- Incoming call entry points ----------

// Fallback for the visible alert push (foreground / tap / cold-start tap).
// With CallKit it rings the system UI; without it, the in-app screen.
// Returns true if it was a call push.
export function handleCallPushData(
  data?: Record<string, unknown> | null,
): boolean {
  if (!data) return false;
  if (data.type === "incoming_call" && typeof data.callId === "string") {
    if (!isCallingAvailable() || isCallActive()) return true; // can't or busy
    const callerName =
      typeof data.callerName === "string" ? data.callerName : "Someone";
    if (getCallKit()) {
      void reportIncomingFromAlert(
        data.callId,
        callerName,
        typeof data.callerId === "string" ? data.callerId : undefined,
      );
      return true;
    }
    setCall({ incoming: { callId: data.callId, callerName } });
    return true;
  }
  if (data.type === "call_cancelled") return true; // ringing watcher handles it
  return false;
}

async function reportIncomingFromAlert(
  id: string,
  callerName: string,
  callerId?: string,
) {
  const ck = getCallKit();
  if (!ck) return;
  try {
    // Already ringing (the VoIP push got there first)?
    const active = await ck.getActiveCallSession();
    if (active?.incomingCallEvent?.serverCallId === id) return;
    if ([...incomingSessions.values()].some((s) => s.serverId === id)) return;

    // Stale tap on an old notification? Only ring if it's still ringing.
    await auth.authStateReady();
    const snap = await getDoc(doc(db, "calls", id));
    if (snap.data()?.status !== "ringing") return;

    await ck.reportIncomingCall({
      eventId: id, // same eventId as the VoIP push => native dedup
      serverCallId: id,
      hasVideo: false,
      startedAt: new Date().toISOString(),
      caller: { id: callerId ?? id, displayName: callerName },
      metadata: { callId: id },
    });
  } catch (e) {
    console.log("reportIncomingFromAlert failed", e);
  }
}

// In-app Answer/Decline screen (fallback when CallKit isn't available)
export async function answerIncoming() {
  const inc = useCallStore.getState().incoming;
  if (!inc) return;
  setCall({ incoming: null });
  await acceptCall(inc.callId, inc.callerName).catch(() => {});
}

export async function declineIncoming() {
  const inc = useCallStore.getState().incoming;
  if (!inc) return;
  setCall({ incoming: null });
  await declineCall(inc.callId);
}

// ---------- CallKit event wiring ----------
let callKitReady = false;

// Call ONCE, as early as possible (RootLayout mount). Events that happened
// before JS started (killed-app VoIP push, answer from lock screen) are
// replayed by the library once these listeners exist.
export function initCallKit() {
  const ck = getCallKit();
  if (!ck || callKitReady) return;
  callKitReady = true;
  getWebRTC();

  ck.registerVoIPPush();

  ck.addCallSessionAddedListener(({ session }) => {
    if (session.origin === "incoming") void onIncomingSession(session);
  });
  ck.addCallAnsweredListener(({ id, requestId }) => {
    console.log("[call] answeredFromSystem", id, requestId, "nativeId=", nativeId);
    if (nativeId === id) {
      console.log("[call] duplicate answer ignored", requestId);
      return;
    }
    void onAnsweredFromSystem(id, requestId);
  });
  ck.addCallEndedListener(({ session }) => {
    console.log("[call] endedFromSystem", session.id, "current=", nativeId);
    void onEndedFromSystem(session);
  });
  ck.addSetMutedActionListener(({ isMuted }) => applyMute(isMuted));
}

async function onIncomingSession(session: CallSession) {
  const ck = getCallKit();
  const ev = session.incomingCallEvent;
  if (!ck || !ev) return;
  const serverId = ev.serverCallId;
  incomingSessions.set(session.id, {
    serverId,
    name: ev.caller.displayName ?? "Someone",
  });

  await auth.authStateReady(); // matters on cold start
  if (!auth.currentUser) {
    incomingSessions.delete(session.id);
    await ck.reportCallEnded(session.id, "failed").catch(() => {});
    return;
  }

  // Busy with another call: decline this one
  if (isCallActive() && callId !== serverId) {
    incomingSessions.delete(session.id);
    await declineCall(serverId);
    await ck.reportCallEnded(session.id, "declinedElsewhere").catch(() => {});
    return;
  }

  // While it rings: if the caller cancels / it times out, stop the system UI.
  // (Needed on cold start, where no push tells JS that the caller hung up.)
  stopWatching(serverId);
  const unsub = onSnapshot(doc(db, "calls", serverId), (snap) => {
    if (callId === serverId) return; // we answered; listenToCallDoc takes over
    const status = snap.data()?.status as string | undefined;
    if (snap.exists() && status === "ringing") return;
    stopWatching(serverId);
    incomingSessions.delete(session.id);
    ck.reportCallEnded(
      session.id,
      status === "accepted" ? "answeredElsewhere" : "remoteEnded",
    ).catch(() => {});
  });
  ringingWatchers.set(serverId, unsub);
}

async function onAnsweredFromSystem(id: string, requestId: string) {
  const ck = getCallKit();
  if (!ck) return;
  let info = incomingSessions.get(id);
  if (!info) {
    const s = await ck.getActiveCallSession();
    const serverId =
      s?.id === id ? s.incomingCallEvent?.serverCallId : undefined;
    if (serverId) {
      info = {
        serverId,
        name: s?.incomingCallEvent?.caller.displayName ?? "Someone",
      };
    }
  }
  if (!info || isCallActive()) {
    // Nothing we can connect to: fail the answer so CallKit ends the call
    await ck.failIncomingCallConnected(id, requestId).catch(() => {});
    return;
  }
  incomingSessions.delete(id);
  await acceptCall(info.serverId, info.name, { nativeId: id, requestId }).catch(
    () => {},
  );
}

// The user ended / declined from the system UI, or the OS ended the call,
// or our own hangUp() asked the OS to end it.
async function onEndedFromSystem(session: CallSession) {
  if (session.id === nativeId) {
    nativeId = null;
    answerRequestId = null;
    await markEnded();
    await cleanup();
    return;
  }
  // Declined (or dismissed) while still ringing, before we answered
  const info = incomingSessions.get(session.id);
  const serverId = info?.serverId ?? session.incomingCallEvent?.serverCallId;
  incomingSessions.delete(session.id);
  if (serverId && serverId !== callId) {
    stopWatching(serverId);
    await declineCall(serverId);
  }
}

function stopWatching(serverId: string) {
  ringingWatchers.get(serverId)?.();
  ringingWatchers.delete(serverId);
}

// ---------- VoIP push token ----------
// Saves the iOS VoIP token on the user's doc so the backend can ring them.
// NOTE: assumes a `users/{uid}` collection; adjust if yours differs.
export function registerVoipTokenForUser(uid: string): () => void {
  const ck = getCallKit();
  if (!ck) return () => {};
  const save = (token?: string, type?: string) => {
    if (!token || type !== "APNS_VOIP") return;
    console.log("VoIP token:", token);
    updateDoc(doc(db, "users", uid), {
      voipToken: token,
      voipTokenUpdatedAt: serverTimestamp(),
    }).catch((e) => console.log("save voipToken failed", e));
  };
  const current = ck.getVoIPPushToken();
  save(current?.token, current?.type);
  const sub = ck.addVoIPPushTokenUpdatedListener((e) => save(e.token, e.type));
  return () => sub.remove();
}

// ---------- Call document ----------
function listenToCallDoc(id: string) {
  unsubCall = onSnapshot(doc(db, "calls", id), async (snap) => {
    const data = snap.data();
    if (!data) return;
    const rtc = getWebRTC();

    // Caller: the answer has arrived
    if (isCaller && !remoteDescriptionSet && data.answer && rtc) {
      remoteDescriptionSet = true;
      stopRingback();
      reportNativeConnected();    
      const hb = setInterval(() => console.log("hb", Date.now() % 100000), 500);
      try { 
        await pc?.setRemoteDescription(
          new rtc.RTCSessionDescription({
            type: data.answer.type,
            sdp: data.answer.sdp,
          }),
        );
        listenToRemoteCandidates(id);
        console.log(
          "answer lag ms:",
          Date.now() - (data.answeredAt?.toMillis?.() ?? Date.now()),
        );
      } catch (e) {
        console.log("setRemoteDescription failed", e);
        await hangUp({ failed: true });
        return;
      } finally {
        clearInterval(hb);
      }
    }

    if (["declined", "ended", "missed"].includes(data.status)) {
      const byMe = data.endedBy === auth.currentUser?.uid;
      await cleanup(
        !byMe && (data.status === "declined" || data.status === "ended")
          ? "busy"
          : undefined,
      );
      // Remote side ended it: tell the OS (no-op if we already ended it)
      await endNative("remoteEnded");
    }
  });
}

// ---------- Caller ----------
export async function startCall(opts: {
  calleeId: string;
  contextType: "chat" | "service";
  chatId?: string;
  serviceId?: string;
  peerName?: string;
}): Promise<string> {
  if (isCallActive()) throw new Error("Already in a call");
  isCaller = true;
  setCall({
    phase: "connecting",
    callId: null,
    peerName: opts.peerName ?? null,
    isIncoming: false,
    error: null,
    muted: false,
    connectedAt: null,
    speakerOn: false,
  });

  try {
    // Register the call with CallKit first (system call UI, audio session)
    const ck = getCallKit();
    if (ck) {
      nativeId = await ck.startOutgoingCall(
        { id: opts.calleeId, displayName: opts.peerName ?? "Timely call" },
        { hasVideo: false },
      );
    }

    await setup();
    const peer = pc!;
    const offer = await peer.createOffer({});
    await peer.setLocalDescription(offer); // ICE gathering starts here

    const create = httpsCallable(functions, "createCall");
    const res = await create({
      calleeId: opts.calleeId,
      context: opts.contextType,
      chatId: opts.chatId ?? null,
      serviceId: opts.serviceId ?? null,
      offer: { type: offer.type, sdp: offer.sdp },
    });
    callId = (res.data as { callId: string }).callId;

    setCall({ phase: "ringing", callId });
    // CallKit plays its own dialtone; only use ours without it
    void startRingback();
    listenToCallDoc(callId); // listen BEFORE flushing candidates

    // Send the candidates found while we waited for the callId, all at once,
    // without blocking the call flow
    const early = pendingLocal.splice(0);
    void Promise.all(early.map((c) => writeCandidate(c)));

    ringTimer = setTimeout(() => {
      if (useCallStore.getState().phase === "ringing") void hangUp();
    }, RING_TIMEOUT_MS);
    return callId;
  } catch (e) {
    const message = messageFor(e);
    await cleanup("failed");
    await endNative("failed");
    setCall({ error: message });
    throw e;
  }
}

// ---------- Callee ----------
export async function acceptCall(
  id: string,
  peerName?: string,
  native?: { nativeId: string; requestId?: string },
) {
  if (isCallActive()) return;
  isCaller = false;
  callId = id;
  nativeId = native?.nativeId ?? null;
  answerRequestId = native?.requestId ?? null;
  stopWatching(id); // listenToCallDoc takes over from here
  setCall({
    phase: "connecting",
    callId: id,
    peerName: peerName ?? null,
    isIncoming: true,
    error: null,
    muted: false,
    speakerOn: false,
    connectedAt: null,
  });

  try {
    await auth.authStateReady();
    const ref = doc(db, "calls", id);
    const data = (await getDoc(ref)).data();
    if (
      !data ||
      data.status !== "ringing" ||
      data.calleeId !== auth.currentUser?.uid
    ) {
      throw new Error("Call is no longer available");
    }
    await Promise.race([
      setup(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Call setup timed out")), 15_000),
      ),
    ]);
    const rtc = getWebRTC()!;
    await pc!.setRemoteDescription(
      new rtc.RTCSessionDescription({
        type: data.offer.type,
        sdp: data.offer.sdp,
      }),
    );
    remoteDescriptionSet = true;

    const answer = await pc!.createAnswer();
    await pc!.setLocalDescription(answer);

    // Rules only allow this while the status is still "ringing"
    await updateDoc(ref, {
      answer: { type: answer.type, sdp: answer.sdp },
      status: "accepted",
      answeredAt: serverTimestamp(),
    });

    listenToRemoteCandidates(id);
    listenToCallDoc(id);
  } catch (e) {
    console.log("acceptCall failed", e);
    await cleanup();
    await failNativeAnswer();
    setCall({ error: "This call is no longer available." });
    throw e;
  }
}

export async function declineCall(id: string) {
  try {
    const ref = doc(db, "calls", id);
    const snap = await getDoc(ref);
    if (snap.data()?.status === "ringing") {
      await updateDoc(ref, {
        status: "declined",
        endedAt: serverTimestamp(),
        endedBy: auth.currentUser?.uid,
      });
    }
  } catch (e) {
    console.log("declineCall skipped", e);
  }
}

// ---------- End ----------
async function markEnded() {
  const id = callId;
  if (!id) return;
  try {
    await updateDoc(doc(db, "calls", id), {
      status: "ended",
      endedAt: serverTimestamp(),
      endedBy: auth.currentUser?.uid,
    });
  } catch (e) {
    console.log("hangUp update skipped", e);
  }
}

export async function hangUp(opts?: { failed?: boolean }) {
  console.log("[call] hangUp", opts);
  // Normal hang-up with a system call: ask the OS to end it. The OS then
  // fires onCallEnded -> onEndedFromSystem, which updates Firestore + cleans up.
  if (!opts?.failed && nativeId) {
    try {
      await getCallKit()?.endCall(nativeId);
      return;
    } catch (e) {
      console.log("endCall failed, tearing down manually", e);
    }
  }
  await markEnded();
  await cleanup(opts?.failed ? "failed" : undefined);
  await endNative(opts?.failed ? "failed" : "remoteEnded");
}

export async function clearVoipTokenForUser(uid: string) {
  try {
    await updateDoc(doc(db, "users", uid), {
      voipToken: deleteField(),
      voipTokenUpdatedAt: deleteField(),
    });
  } catch (e) {
    console.log("clearVoipToken failed", e);
  }
}

async function cleanup(endTone?: EndTone) {
  const shouldPlay =
    !!endTone && isCaller && useCallStore.getState().connectedAt == null;
  stopRingback();
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
  unsubCall?.();
  unsubCandidates?.();
  unsubCall = null;
  unsubCandidates = null;

  localStream?.getTracks().forEach((t) => t.stop());
  pc?.close();
  localStream = null;
  pc = null;

  if (callId) stopWatching(callId);
  callId = null;
  answerRequestId = null;
  remoteDescriptionSet = false;
  pendingLocal.length = 0;
  setCall({
    phase: "ended",
    callId: null,
    muted: false,
    speakerOn: false,
    connectedAt: null,
  });
  if (shouldPlay) void playEndTone(endTone!);
}
