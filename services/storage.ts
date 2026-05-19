import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../stores/useThemeStore'; // optional if you want to sync store

export async function loadStoredData() {
  try {
    // Load theme mode – this is automatically handled by Zustand persist middleware,
    // but you can manually load if needed.
    const themeMode = await AsyncStorage.getItem('theme-storage');
    if (themeMode) {
      const parsed = JSON.parse(themeMode);
      useThemeStore.getState().setThemeMode(parsed.state.themeMode);
    }

    // Load onboarding flag if needed elsewhere
    const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
    console.log('hasSeenOnboarding:', hasSeenOnboarding);

    // Load any other saved data
    // ...
  } catch (error) {
    console.error('Failed to load stored data', error);
  }
}