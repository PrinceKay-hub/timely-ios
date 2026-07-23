import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useAuthStore } from '@/stores/auth';

type AuthContextType = {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  profile: ReturnType<typeof useAuthStore.getState>['profile'];
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Single source of truth: the Zustand store. This component no longer
  // keeps its own copy of user/profile — it just drives the store from
  // Firebase's auth state and re-exposes it via context for screens that
  // prefer useAuth() over useAuthStore() directly.
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const profileLoading = useAuthStore((s) => s.profileLoading);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const logoutFromStore = useAuthStore((s) => s.logout);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Set user AND profileLoading together in one atomic update.
        // Doing these as two separate setState calls (user first, then
        // profileLoading inside fetchProfile) can leave a render in
        // between where user is truthy but profileLoading is still
        // false and profile is still the old null — which reads as
        // "no profile doc" and pops ProfileCompletionModal open.
        useAuthStore.setState({ user: firebaseUser, profileLoading: true });
        await fetchProfile(firebaseUser.uid);
      } else {
        useAuthStore.setState({ user: null, profile: null, profileLoading: false });
      }

      setAuthChecked(true);
    });

    return unsubscribe;
  }, [fetchProfile]);

  // Hold off rendering until the very first Firebase auth check resolves,
  // so screens never flash a logged-out state before Firebase reports
  // whether a session already exists. Distinct from profileLoading, which
  // only applies once we know there IS a user.
  if (!authChecked) return null;

  return (
    <AuthContext.Provider value={{ user, profile, logout: logoutFromStore, loading: profileLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};