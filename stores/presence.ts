import { create } from 'zustand';
import { useEffect } from 'react';
import { rtdb, auth } from '@/firebase';
import {
  ref,
  onValue,
  onDisconnect,
  set as dbSet,
  serverTimestamp as rtdbServerTimestamp,
} from 'firebase/database';

export interface PresenceInfo {
  state: 'online' | 'offline';
  lastSeen: number | null; // ms since epoch (RTDB server timestamp, resolved)
}

interface PresenceState {
  presenceByUid: Record<string, PresenceInfo>;
  startOwnPresence: (uid: string) => () => void;
  subscribeToPresence: (uid: string) => () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  presenceByUid: {},

  // Called once, globally, for the signed-in user — see RootLayout. This
  // is what makes "online" trustworthy: Realtime Database's onDisconnect
  // is a server-side hook, armed over the live socket connection, that
  // fires the instant that connection drops — app kill, network loss,
  // force quit, whatever. Firestore has no equivalent; it can only tell
  // you what a client last *wrote*, not when it silently went away. That
  // asymmetry is the whole reason this feature needs RTDB alongside
  // Firestore rather than living in Firestore entirely.
  startOwnPresence: (uid: string) => {
    const myStatusRef = ref(rtdb, `status/${uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === false) return; // we're offline; nothing to arm yet

      // Order matters: arm the disconnect hook FIRST, then mark online.
      // If the app dies between these two lines, RTDB still ends up with
      // a correct disconnect handler queued from this connection.
      onDisconnect(myStatusRef)
        .set({ state: 'offline', lastSeen: rtdbServerTimestamp() })
        .then(() => {
          dbSet(myStatusRef, { state: 'online', lastSeen: rtdbServerTimestamp() });
        })
        .catch((error) => console.error('Failed to arm presence onDisconnect:', error));
    });

    return () => {
      unsubscribeConnected();
      // Explicit sign-out / clean unmount: don't wait for the server to
      // notice the socket dropped — mark offline immediately so the
      // other person's UI updates right away instead of lagging behind
      // RTDB's own disconnect detection.
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === uid) {
        dbSet(myStatusRef, { state: 'offline', lastSeen: rtdbServerTimestamp() }).catch(() => {});
      }
    };
  },

  // Called per other-user you want to observe (a chat list row, a
  // conversation header). Keeps presenceByUid[uid] live.
  subscribeToPresence: (uid: string) => {
    const statusRef = ref(rtdb, `status/${uid}`);
    return onValue(statusRef, (snap) => {
      const data = snap.val();
      set((s) => ({
        presenceByUid: {
          ...s.presenceByUid,
          [uid]: data
            ? { state: data.state === 'online' ? 'online' : 'offline', lastSeen: data.lastSeen ?? null }
            : { state: 'offline', lastSeen: null },
        },
      }));
    });
  },
}));

// Read-only selector — use this where you already have a subscription
// running elsewhere (e.g. RootLayout) and just want the current value.
export function usePresence(uid?: string | null): PresenceInfo | null {
  return usePresenceStore((s) => (uid ? s.presenceByUid[uid] ?? null : null));
}

// Convenience hook that subscribes AND reads, managing its own cleanup.
// This is what chat list rows / the conversation header should actually
// use — each mounted row subscribes only to the uid it's currently
// displaying, and unsubscribes when it unmounts or the uid changes.
export function usePresenceSubscription(uid?: string | null): PresenceInfo | null {
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = usePresenceStore.getState().subscribeToPresence(uid);
    return unsubscribe;
  }, [uid]);

  return usePresence(uid);
}

// Human-readable label for presence — "Online" / "Last seen 5m ago" / etc.
export function formatPresenceLabel(presence: PresenceInfo | null): string {
  if (!presence) return '';
  if (presence.state === 'online') return 'Online';
  if (!presence.lastSeen) return '';

  const diffMs = Date.now() - presence.lastSeen;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Last seen just now';
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `Last seen ${diffDay}d ago`;

  return 'Last seen a while ago';
}