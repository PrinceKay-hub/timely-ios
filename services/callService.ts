import { PermissionsAndroid, Platform } from "react-native";
import { httpsCallable } from "firebase/functions";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { MediaStream, RTCPeerConnection } from "react-native-webrtc";
import { auth, db, functions } from "@/firebase";
import { isCallActive, setCall, useCallStore } from "@/stores/callStore";
import { playEndTone, startRingback, stopRingback, type EndTone } from "./callTones";

// ---------- Lazy native module ----------
type WebRTC = typeof import("react-native-webrtc");
let webrtc: WebRTC | null | undefined;

function getWebRTC(): WebRTC | null {
  if (webrtc !== undefined) return webrtc;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webrtc = require("react-native-webrtc") as WebRTC;
  } catch (e) {
    console.log("react-native-webrtc not available in this build", e);
    webrtc = null;
  }
  return webrtc;
}


export const isCallingAvailable = () => getWebRTC() !== null;

// ---------- Module state (one call at a time) ----------
const RING_TIMEOUT_MS = 45_000;

type CandidateData = {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
};

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let callId: string | null = null;
let isCaller = false;
let remoteDescriptionSet = false;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let unsubCall: Unsubscribe | null = null;
let unsubCandidates: Unsubscribe | null = null;
const pendingLocal: CandidateData[] = [];

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
async function ensureMicPermission() {
  if (Platform.OS !== "android") return; // iOS prompts inside getUserMedia
  const res = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (res !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Microphone permission denied");
  }
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

// ---------- Optional native speaker control ----------
type InCallManagerLike = {
  setForceSpeakerphoneOn: (flag: boolean | null) => void;
};
let inCallManager: InCallManagerLike | null | undefined;

function getInCallManager(): InCallManagerLike | null {
  if (inCallManager !== undefined) return inCallManager;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-incall-manager');
    inCallManager = (mod?.default ?? mod) as InCallManagerLike;
  } catch (e) {
    console.log('react-native-incall-manager not available in this build', e);
    inCallManager = null;
  }
  return inCallManager;
}

export const isSpeakerAvailable = () => getInCallManager() !== null;

export function toggleSpeaker() {
  const mgr = getInCallManager();
  if (!mgr) return;
  const next = !useCallStore.getState().speakerOn;
  try {
    mgr.setForceSpeakerphoneOn(next);
    setCall({ speakerOn: next });
  } catch (e) {
    console.log('toggleSpeaker failed', e);
  }
}

// Go back to the system's default route when a call ends
function resetSpeaker() {
  if (!useCallStore.getState().speakerOn) return;
  try {
    getInCallManager()?.setForceSpeakerphoneOn(null);
  } catch (e) {
    console.log('resetSpeaker failed', e);
  }
}

export function toggleMute() {
  const next = !useCallStore.getState().muted;
  localStream?.getAudioTracks().forEach((t) => {
    t.enabled = !next;
  });
  setCall({ muted: next });
}

// ---------- Shared setup ----------
async function setup() {
  const rtc = getWebRTC();
  if (!rtc) throw new Error("Calling is not available in this build");
  await ensureMicPermission();

  const iceServers = await fetchIceServers();
  const peer = new rtc.RTCPeerConnection({ iceServers } as never);
  pc = peer;

  // Handlers BEFORE setLocalDescription so no candidate is missed
  listen(peer, "icecandidate", (e) => onLocalCandidate(e));
  listen(peer, "connectionstatechange", () => {
    const state = (peer as unknown as { connectionState?: string })
      .connectionState;
    console.log("PC state:", state);
    if (state === "connected") {
      stopRingback();
      if (ringTimer) clearTimeout(ringTimer);
      setCall({ phase: 'connected', connectedAt: Date.now() });
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

// One entry point for every place a push can arrive (foreground,
// background tap, cold-start tap). Returns true if it was a call push.
export function handleCallPushData(
  data?: Record<string, unknown> | null,
): boolean {
  if (!data) return false;
  if (data.type === "incoming_call" && typeof data.callId === "string") {
    if (!isCallingAvailable() || isCallActive()) return true; // can't or busy
    setCall({
      incoming: {
        callId: data.callId,
        callerName:
          typeof data.callerName === "string" ? data.callerName : "Someone",
      },
    });
    return true;
  }
  if (data.type === "call_cancelled") return true;
  return false;
}

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
      try {
        await pc?.setRemoteDescription(
          new rtc.RTCSessionDescription({
            type: data.answer.type,
            sdp: data.answer.sdp,
          }),
        );
        listenToRemoteCandidates(id);
      } catch (e) {
        console.log("setRemoteDescription failed", e);
        await hangUp({ failed: true });
        return;
      }
    }

    if (["declined", "ended", "missed"].includes(data.status)) {
      const byMe = data.endedBy === auth.currentUser?.uid;
      await cleanup(
        !byMe && (data.status === "declined" || data.status === "ended")
          ? "busy"
          : undefined,
      );
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

    for (const c of pendingLocal) await writeCandidate(c);
    pendingLocal.length = 0;

    setCall({ phase: "ringing", callId });
    void startRingback();
    listenToCallDoc(callId);

    ringTimer = setTimeout(() => {
      if (useCallStore.getState().phase === "ringing") void hangUp();
    }, RING_TIMEOUT_MS);
    return callId;
  } catch (e) {
    const message = messageFor(e);
    await cleanup("failed");
    setCall({ error: message });
    throw e;
  }
}

// ---------- Callee ----------
export async function acceptCall(id: string, peerName?: string) {
  if (isCallActive()) return;
  isCaller = false;
  callId = id;
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
    await auth.authStateReady(); // matters on cold start
    const ref = doc(db, "calls", id);
    const data = (await getDoc(ref)).data();
    if (
      !data ||
      data.status !== "ringing" ||
      data.calleeId !== auth.currentUser?.uid
    ) {
      throw new Error("Call is no longer available");
    }

    await setup();
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
    setCall({ error: "This call is no longer available." });
    throw e;
  }
}

export async function declineCall(id: string) {
  try {
    const ref = doc(db, 'calls', id);
    const snap = await getDoc(ref);
    if (snap.data()?.status === 'ringing') {
      await updateDoc(ref, {
        status: 'declined',
        endedAt: serverTimestamp(),
        endedBy: auth.currentUser?.uid,
      });
    }
  } catch (e) {
    console.log('declineCall skipped', e);
  }
}

// ---------- End ----------
export async function hangUp(opts?: { failed?: boolean }) {
  const id = callId;
  if (id) {
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
  await cleanup(opts?.failed ? "failed" : undefined);
}

async function cleanup(endTone?: EndTone) {
  const shouldPlay =  !!endTone && isCaller && useCallStore.getState().connectedAt == null;
  stopRingback();
  resetSpeaker();
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

  callId = null;
  remoteDescriptionSet = false;
  pendingLocal.length = 0;
  setCall({ phase: 'ended', callId: null, muted: false, speakerOn: false, connectedAt: null });
  if (shouldPlay) void playEndTone(endTone!);
}
