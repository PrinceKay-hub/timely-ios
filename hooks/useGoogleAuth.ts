
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// ─── Configure once at app startup ───────────────────────────────────────────
// Call configureGoogleSignIn() in your root _layout.tsx before rendering anything
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    // Must be your WEB client ID (not Android/iOS client ID)
    webClientId: '131563851716-nv4agnun3tn00mtbbgshpk8m9jcdd0me.apps.googleusercontent.com',
    offlineAccess: false,
  });
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export type GoogleAuthResult =
  | { type: 'success'; idToken: string }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };

export const useGoogleAuth = () => {
  const promptAsync = async (): Promise<GoogleAuthResult> => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out first to always show account picker
      await GoogleSignin.signOut();

      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      if (!tokens.idToken) {
        return { type: 'error', message: 'No ID token returned from Google.' };
      }

      return { type: 'success', idToken: tokens.idToken };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { type: 'cancelled' };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return { type: 'error', message: 'Sign-in already in progress.' };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { type: 'error', message: 'Google Play Services not available.' };
      }
      console.log('Google Sign-In error:', error);
      return { type: 'error', message: error.message || 'Google sign-in failed.' };
    }
  };

  return { promptAsync };
};