import { create } from 'zustand';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
// ADJUST: import path of your initialized Firestore instance
import { db } from '@/firebase';
import * as Haptics from 'expo-haptics';

export interface CallLog {
  id: string;
  callerId: string;
  calleeId: string;
  participants: string[];
  status: string; // e.g. 'ended'
  context?: string | null;
  serviceId?: string | null;
  chatId?: string | null;
  endedBy?: string | null;
  createdAt: any; // Firestore Timestamp
  answeredAt?: any | null;
  endedAt?: any | null;
  hiddenFor?: string[]; // uids who deleted this call from their own history
}

export interface CallProfile {
  name: string;
  photoUrl?: string;
}

// ─── Derived helpers ─────────────────────────────────────────────────────
export const wasAnswered = (c: CallLog) => !!c.answeredAt;
export const isDeclined = (c: CallLog) => c.status === 'declined';
export const isOngoing = (c: CallLog) => !!c.answeredAt && !c.endedAt;
export const callDurationSeconds = (c: CallLog) => {
  const a = c.answeredAt?.toDate?.()?.getTime();
  const e = c.endedAt?.toDate?.()?.getTime();
  if (!a || !e) return 0;
  return Math.max(0, Math.round((e - a) / 1000));
};
// A call still ringing or connected can't be deleted. The one-hour cap stops a
// call whose document never got closed from being undeletable forever.
export const isInProgress = (c: CallLog) => {
  if (c.status !== 'ringing' && c.status !== 'accepted') return false;
  const created = c.createdAt?.toDate?.()?.getTime();
  return !created || Date.now() - created < 60 * 60 * 1000;
};

interface CallState {
  calls: CallLog[];
  profiles: Record<string, CallProfile>;
  selectedCalls: Record<string, true>;
  callsLoading: boolean;
  callsError: string | null;
  subscribeToCalls: (uid: string) => void;
  unsubscribeCalls: () => void;
  toggleCallSelect: (id: string) => void;
  selectAllCalls: () => void;
  clearCallSelection: () => void;
  deleteSelectedCalls: () => Promise<boolean>;
}

let unsub: Unsubscribe | null = null;
let currentUid: string | null = null;
const requested = new Set<string>();

export const useCallStore = create<CallState>((set, get) => ({
  calls: [],
  profiles: {},
  selectedCalls: {},
  callsLoading: false,
  callsError: null,

  // Needs a composite index: participants (array-contains) + createdAt (desc)
  subscribeToCalls: (uid) => {
    currentUid = uid;
    unsub?.();
    set({ callsLoading: true, callsError: null });

    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        // Calls this user deleted are only hidden for them (shared document).
        const calls = (snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CallLog[]).filter(
          (c) => !c.hiddenFor?.includes(uid)
        );
        const ids = new Set(calls.map((c) => c.id));
        const selectedCalls = Object.fromEntries(
          Object.keys(get().selectedCalls)
            .filter((id) => ids.has(id))
            .map((id) => [id, true])
        ) as Record<string, true>;
        set({ calls, callsLoading: false, selectedCalls });
        loadProfiles(calls, uid, set, get);
      },
      (err) => set({ callsLoading: false, callsError: err.message })
    );
  },

  unsubscribeCalls: () => {
    unsub?.();
    unsub = null;
    set({ selectedCalls: {} });
  },

  toggleCallSelect: async (id) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const call = get().calls.find((c) => c.id === id);
    if (!call || isInProgress(call)) return;
    const next = { ...get().selectedCalls };
    if (next[id]) delete next[id];
    else next[id] = true;
    set({ selectedCalls: next });
  },

  selectAllCalls: () => {
    const next: Record<string, true> = {};
    get().calls.forEach((c) => {
      if (!isInProgress(c)) next[c.id] = true;
    });
    set({ selectedCalls: next });
  },

  clearCallSelection: () => {
    if (Object.keys(get().selectedCalls).length) set({ selectedCalls: {} });
  },

  // Hides the selected calls for this user only. Resolves false on failure.
  deleteSelectedCalls: async () => {
    const uid = currentUid;
    const ids = Object.keys(get().selectedCalls);
    if (!uid) return false;
    if (!ids.length) return true;
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.update(doc(db, 'calls', id), { hiddenFor: arrayUnion(uid) }));
      await batch.commit();
      set({ selectedCalls: {} });
      return true;
    } catch {
      return false;
    }
  },
}));

async function loadProfiles(
  calls: CallLog[],
  myUid: string,
  set: (p: Partial<CallState>) => void,
  get: () => CallState
) {
  const ids = new Set<string>();
  calls.forEach((c) =>
    c.participants?.forEach((id) => {
      if (id !== myUid && !requested.has(id)) ids.add(id);
    })
  );
  if (!ids.size) return;
  ids.forEach((id) => requested.add(id));

  const loaded: Record<string, CallProfile> = {};
  await Promise.all(
    [...ids].map(async (id) => {
      try {
        // ADJUST: collection and field names to match your user documents
        const snap = await getDoc(doc(db, 'users', id));
        const d = snap.data();
        if (!d) return;
        loaded[id] = {
          name: d.name ?? d.displayName ?? 'Unknown',
          photoUrl: d.photoUrl ?? d.photoURL ?? d.avatar,
        };
      } catch {
        requested.delete(id); // retry on next snapshot
      }
    })
  );

  if (Object.keys(loaded).length) {
    set({ profiles: { ...get().profiles, ...loaded } });
  }
}