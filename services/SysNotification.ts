import { create } from 'zustand';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase';
import * as Haptics from 'expo-haptics';

export interface AppNotification {
  id: string; // Firestore doc id (the stored 'id' field is empty)
  type: string;
  title: string;
  body: string;
  userId: string;
  bookingId?: string | null;
  read: boolean;
  createdAt: any | null; // null briefly while serverTimestamp is pending
}

interface NotificationState {
  notifications: AppNotification[];
  selectedNotifs: Record<string, true>;
  notificationsLoading: boolean;
  notificationsError: string | null;
  subscribeToNotifications: (uid: string) => void;
  unsubscribeNotifications: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  toggleNotifSelect: (id: string) => void;
  selectAllNotifs: () => void;
  clearNotifSelection: () => void;
  deleteSelectedNotifs: () => Promise<boolean>;
}

let unsub: Unsubscribe | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  selectedNotifs: {},
  notificationsLoading: false,
  notificationsError: null,

  // Needs a composite index: userId (asc) + createdAt (desc)
  subscribeToNotifications: (uid) => {
    unsub?.();
    set({ notificationsLoading: true, notificationsError: null });

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        const notifications = snap.docs.map((d) => ({
          ...(d.data() as any),
          id: d.id, // override the empty stored 'id'
        })) as AppNotification[];
        const ids = new Set(notifications.map((n) => n.id));
        const selectedNotifs = Object.fromEntries(
          Object.keys(get().selectedNotifs)
            .filter((id) => ids.has(id))
            .map((id) => [id, true])
        ) as Record<string, true>;
        set({ notifications, notificationsLoading: false, selectedNotifs });
      },
      (err) => set({ notificationsLoading: false, notificationsError: err.message })
    );
  },

  unsubscribeNotifications: () => {
    unsub?.();
    unsub = null;
    set({ selectedNotifs: {} });
  },

  markRead: async (id) => {
    // optimistic
    set({
      notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch {}
  },

  markAllRead: async () => {
    const unread = get().notifications.filter((n) => !n.read);
    if (!unread.length) return;
    set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) });
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
      await batch.commit();
    } catch {}
  },

  toggleNotifSelect: async (id) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...get().selectedNotifs };
    if (next[id]) delete next[id];
    else next[id] = true;
    set({ selectedNotifs: next });
  },

  selectAllNotifs: () => {
    const next: Record<string, true> = {};
    get().notifications.forEach((n) => {
      next[n.id] = true;
    });
    set({ selectedNotifs: next });
  },

  clearNotifSelection: () => {
    if (Object.keys(get().selectedNotifs).length) set({ selectedNotifs: {} });
  },

  // Permanently deletes the selected notifications. Resolves false on failure.
  deleteSelectedNotifs: async () => {
    const ids = Object.keys(get().selectedNotifs);
    if (!ids.length) return true;
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.delete(doc(db, 'notifications', id)));
      await batch.commit();
      set({ selectedNotifs: {} });
      return true;
    } catch {
      return false;
    }
  },
}));