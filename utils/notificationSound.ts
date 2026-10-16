import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { isCallActive, useCallStore } from "@/stores/callStore";

// 1. A custom hook to manage the notification sound player
export const useNotificationSound = () => {
  // The hook manages the player's lifecycle automatically.
  // The sound is loaded when the component mounts.
  const player = useAudioPlayer(require("@/assets/sounds/notification.mp3"));
  player.volume = 0.8; // Set the initial volume

  // 2. The play function remains an async utility
  const playNotificationSound = async () => {
    try {
      // Trigger haptic feedback first
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // In expo-audio, the player stays at the end of the track after playing.
      // We must manually reset the position to 0 to allow it to play again.
      player.seekTo(0);
      player.play();
    } catch (error) {
      console.log("Error playing notification sound:", error);
    }
  };

  return { playNotificationSound };
};

// 3. Configure the audio session (can be called once at app startup)

let pendingConfig = false;
export const configureAudioSession = async () => {
  if (isCallActive()) {
    pendingConfig = true; // never touch the session during a call
    return;
  }
  pendingConfig = false;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionModeAndroid: "duckOthers",
  });
};

// Re-apply after the call finishes
useCallStore.subscribe((s, prev) => {
  if (prev.phase !== "ended" && s.phase === "ended" && pendingConfig) {
    void configureAudioSession();
  }
});
