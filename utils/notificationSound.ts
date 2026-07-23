
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let soundObject: Audio.Sound | null = null;

export const playNotificationSound = async () => {
  try {
    // Unload previous instance if exists
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/sounds/notification.mp3'),
      { shouldPlay: true, volume: 0.8 }
    );

    soundObject = sound;

    // Unload after playing to free memory
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        soundObject = null;
      }
    });
  } catch (error) {
    console.log('Error playing notification sound:', error);
  }
};


export const configureAudioSession = async () => {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,       // play even when muted
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
};