import { create } from 'zustand';
import { auth } from '@/firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface AuthState {
  user: any | null;
  profile: any | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, userType: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (idToken: string, fullName?: string | null, email?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
  fetchProfile: (uid: string, appleFullName?: string | null, appleEmail?: string | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,
  error: null,

  // ── Email / password ───────────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      set({ user: userCredential.user, isLoading: false });
      await get().fetchProfile(userCredential.user.uid);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ── Google ─────────────────────────────────────────────────────────────────
  signInWithGoogle: async (idToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      set({ user: userCredential.user, isLoading: false });
      await get().fetchProfile(userCredential.user.uid);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ── Apple ──────────────────────────────────────────────────────────────────
  signInWithApple: async (idToken: string, fullName?: string | null, email?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken });
      const userCredential = await signInWithCredential(auth, credential);

      // Apple only sends fullName on the very first sign-in — save it immediately
      if (fullName && !userCredential.user.displayName) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }

      set({ user: userCredential.user, isLoading: false });
      await get().fetchProfile(userCredential.user.uid, fullName, email);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ── Email sign-up ──────────────────────────────────────────────────────────
  signUpWithEmail: async (email, password, name, userType) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        displayName: name,
        email,
        userType,
        createdAt: new Date().toISOString(),
      });
      set({ user: userCredential.user, isLoading: false });
      await get().fetchProfile(userCredential.user.uid);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    await signOut(auth);
    set({ user: null, profile: null });
  },

  // ── Check existing session ─────────────────────────────────────────────────
  checkAuthStatus: async () => {
    const user = auth.currentUser;
    set({ user });
    if (user) {
      await get().fetchProfile(user.uid);
    }
  },

  // ── Fetch or create Firestore profile ─────────────────────────────────────
  // appleFullName / appleEmail are only passed on first Apple sign-in
  fetchProfile: async (uid: string, appleFullName?: string | null, appleEmail?: string | null) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        set({ profile: docSnap.data() });
      } else {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const defaultProfile = {
            displayName:
              appleFullName ||
              currentUser.displayName ||
              currentUser.email?.split('@')[0] ||
              'User',
            email: appleEmail || currentUser.email,
            userType: 'client',
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, defaultProfile);
          set({ profile: defaultProfile });
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  },
}));