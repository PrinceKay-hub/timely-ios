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
import { doc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/firebase';

interface AuthState {
  user: any | null;
  profile: any | null;
  profileLoading: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, userType: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (idToken: string, fullName?: string | null, email?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
  fetchProfile: (uid: string, appleFullName?: string | null, appleEmail?: string | null) => Promise<void>;
  setProfile: (profile: any) => void;
  updateUserProfile: (updates: { displayName?: string; email?: string; phone?: string }) => Promise<void>;
}

// Strips undefined-valued keys before any Firestore write.
// setDoc/updateDoc throw synchronously if any field is `undefined`,
// which was silently killing profile creation for some Apple sign-ins
// (Apple only returns fullName/email on the user's very first
// authorization, so subsequent flows can produce undefined values here).
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// Module-level counter so overlapping fetchProfile calls (e.g. from
// React Strict Mode double-invoking effects, or duplicate auth listeners)
// can detect they've been superseded and avoid overwriting a fresher
// result with a stale one. NOTE: this only protects the local `set()`
// call from stale data — it does NOT make the Firestore read+write
// atomic. That's what the runTransaction in fetchProfile is for.
let fetchProfileCallId = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  profileLoading: false,
  isLoading: false,
  error: null,

  // ── Email / password ───────────────────────────────────────────────────────
  // fetchProfile is intentionally NOT called here. AuthProvider's
  // onAuthStateChanged listener fires immediately after this resolves
  // (Firebase auth methods trigger it) and calls fetchProfile itself.
  // Calling it from both places raced two fetchProfile invocations
  // against the same Firestore doc on every sign-in, and since neither
  // call knew about the other, each independently decided the doc was
  // missing/incomplete and wrote its own fresh `createdAt`, with
  // whichever setDoc resolved last winning — causing createdAt to drift
  // forward on repeated sign-ins.
  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      set({ user: userCredential.user, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ── Google ─────────────────────────────────────────────────────────────────
  // See signIn comment above — fetchProfile deliberately omitted here too.
  signInWithGoogle: async (idToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      set({ user: userCredential.user, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ── Apple ──────────────────────────────────────────────────────────────────
  // Unlike signIn/signInWithGoogle, this one DOES still call fetchProfile
  // directly — deliberately. fullName/email are only ever handed to this
  // function, on the user's very first Apple authorization; AuthProvider's
  // onAuthStateChanged listener has no access to them and would create
  // the profile without a real name if we relied on it alone. It's safe
  // for both this call and the listener's own fetchProfile call to race
  // now, because fetchProfile's Firestore write is wrapped in a
  // transaction — whichever one commits first creates the doc (with
  // fullName if available), and the other just reads it back.
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
  // fetchProfile IS still called here deliberately: sign-up needs the
  // profile doc created with `userType` (client/pro/etc.) before any
  // other code (e.g. navigation logic keyed off `profile`) runs, and
  // that value isn't available to AuthProvider's listener at all. The
  // runTransaction inside fetchProfile makes this safe even though
  // AuthProvider's listener will likely also call fetchProfile right
  // after — whichever call's transaction commits first "wins" the
  // creation, and the second will just read back the same doc.
  signUpWithEmail: async (email, password, name, userType) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      const userRef = doc(db, 'users', userCredential.user.uid);
      const newProfile = stripUndefined({
        displayName: name,
        email,
        userType,
        createdAt: new Date().toISOString(),
      });
      await setDoc(userRef, newProfile);
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

  // ── Manual profile setter (used by ProfileCompletionModal, etc.) ───────────
  setProfile: (profile: any) => set({ profile }),

  // ── Update profile (single source of truth for any "edit profile" UI) ──────
  // Writes to BOTH Firestore and Firebase Auth in one call. Anything that
  // lets a user edit their name/email should go through this — not a
  // one-off setDoc — so we never again end up with the name living in
  // only one of the two places (which is how "Prince" kept getting lost
  // and silently replaced by an email-derived fallback).
  updateUserProfile: async (updates) => {
    const { user, profile } = get();
    if (!user) throw new Error('No authenticated user');

    const cleanUpdates = stripUndefined(updates);
    if (Object.keys(cleanUpdates).length === 0) return;

    const docRef = doc(db, 'users', user.uid);
    // merge:true — safe whether the doc already exists or not.
    await setDoc(docRef, cleanUpdates, { merge: true });

    if (cleanUpdates.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: cleanUpdates.displayName });
    }

    set({ profile: { ...profile, ...cleanUpdates } });
  },

  // ── Fetch or create Firestore profile ─────────────────────────────────────
  // appleFullName / appleEmail are only passed on first Apple sign-in.
  //
  // This whole check-then-create sequence now runs inside a Firestore
  // transaction. That's the actual fix for createdAt drifting forward:
  // previously this did a plain getDoc() followed by a plain setDoc(),
  // which is NOT atomic. Any time two fetchProfile calls overlapped
  // (onAuthStateChanged firing more than once per launch, React Strict
  // Mode double-invoking effects, or — before this file's other fix —
  // a sign-in method AND the listener both calling fetchProfile), both
  // calls could read the doc as missing/incomplete at the same time and
  // each write their own fresh `new Date().toISOString()` for
  // createdAt, with the later setDoc silently overwriting the earlier
  // one's value. Wrapping the read + write in runTransaction makes
  // Firestore serialize concurrent attempts: only one transaction can
  // observe "doc missing/incomplete" and commit a createdAt write for
  // it — any other concurrent call is forced to retry and will then see
  // the doc as already complete, so it won't touch createdAt again.
  fetchProfile: async (uid: string, appleFullName?: string | null, appleEmail?: string | null) => {
    const callId = ++fetchProfileCallId;
    const isStale = () => callId !== fetchProfileCallId;

    set({ profileLoading: true });
    try {
      const docRef = doc(db, 'users', uid);
      const currentUser = auth.currentUser;

      const finalData = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);

        if (snap.exists()) {
          const data = snap.data();
          // The doc can exist without the core profile fields if
          // saveDeviceInfoToFirestore / saveFCMTokenToFirestore (both
          // setDoc with merge:true, which creates the doc if missing)
          // won the race and created it first, before this ran. Detect
          // that and backfill instead of assuming "exists" means "complete".
          const hasEssentials = !!data.displayName && !!data.createdAt;

          if (hasEssentials) return data;

          const backfill = stripUndefined({
            displayName:
              data.displayName ||
              appleFullName ||
              currentUser?.displayName ||
              currentUser?.email?.split('@')[0] ||
              'User',
            email: data.email || appleEmail || currentUser?.email,
            userType: data.userType || 'client',
            // Preserve an existing createdAt if one is already there —
            // only fall back to "now" if it's genuinely never been set.
            createdAt: data.createdAt || new Date().toISOString(),
          });
          tx.set(docRef, backfill, { merge: true });
          return { ...data, ...backfill };
        }

        // Doc genuinely doesn't exist yet. Safe to stamp createdAt here
        // because the transaction guarantees no other concurrent
        // fetchProfile call can also be inside this "doesn't exist"
        // branch for the same doc — Firestore will abort and retry the
        // loser, which will then see the doc as existing.
        const defaultProfile = stripUndefined({
          displayName:
            appleFullName ||
            currentUser?.displayName ||
            currentUser?.email?.split('@')[0] ||
            'User',
          email: appleEmail || currentUser?.email,
          userType: 'client',
          createdAt: new Date().toISOString(),
        });
        tx.set(docRef, defaultProfile, { merge: true });
        return defaultProfile;
      });

      if (isStale()) return;
      set({ profile: finalData });

      // Persist the (possibly derived) name onto Auth too, so any
      // future recovery has a real fallback instead of re-deriving
      // from the email prefix again.
      if (currentUser && finalData.displayName && currentUser.displayName !== finalData.displayName) {
        updateProfile(currentUser, { displayName: finalData.displayName }).catch((e) =>
          console.error('Failed to sync displayName to Auth:', e)
        );
      }
    } catch (error) {
      console.error('Failed to fetch/create profile:', error);
      if (!isStale()) set({ error: 'Failed to load profile', profile: null });
    } finally {
      if (!isStale()) set({ profileLoading: false });
    }
  },

}));