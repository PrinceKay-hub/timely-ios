import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

export type EndTone = "busy" | "failed";

const RINGBACK = require("../assets/sounds/ringback.mp3");
const BUSY = require("../assets/sounds/busy.mp3");
const FAILED = require("../assets/sounds/failed.mp3");

let ringback: AudioPlayer | null = null;
let endPlayer: AudioPlayer | null = null;
let ringbackWanted = false;
let modeSet = false;

async function ensureAudioMode() {
  if (modeSet) return;
  try {
    // playAndRecord on iOS: plays with the silent switch on and
    // matches the session WebRTC is already using
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
    modeSet = true;
  } catch (e) {
    console.log("setAudioModeAsync failed", e);
  }
}

// ----- Ringback (looping) -----
export async function startRingback() {
  if (ringbackWanted) return;
  ringbackWanted = true;
  await ensureAudioMode();
  // stopRingback() may have run while we were awaiting
  if (!ringbackWanted || ringback) return;
  try {
    ringback = createAudioPlayer(RINGBACK);
    ringback.loop = true;
    ringback.play();
  } catch (e) {
    console.log("startRingback failed", e);
  }
}

export function stopRingback() {
  if (!ringbackWanted) return;
  ringbackWanted = false;
  try {
    ringback?.pause();
    ringback?.remove();
  } catch (e) {
    console.log("stopRingback failed", e);
  }
  ringback = null;
}

// ----- End tones (play once) -----
export async function playEndTone(tone: EndTone) {
  await ensureAudioMode();
  try {
    endPlayer?.remove();
    const player = createAudioPlayer(tone === "busy" ? BUSY : FAILED);
    endPlayer = player;
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        player.remove();
        if (endPlayer === player) endPlayer = null;
      }
    });
    player.play();
  } catch (e) {
    console.log("playEndTone failed", e);
  }
}