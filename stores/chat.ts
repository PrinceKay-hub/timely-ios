import { create } from 'zustand';
import { db } from '@/firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { sendNotification } from '@/services/notificationService';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any; // Firestore Timestamp, null momentarily while the write is pending offline
  pending?: boolean; // true while this client's own write hasn't reached the server yet
}

export interface ChatSummary {
  id: string; // deterministic pair id — see chatIdFor() below
  participants: string[]; // [uidA, uidB], sorted — used for the array-contains query
  participantNames?: Record<string, string>; // uid -> display name, set at creation
  participantPhotos?: Record<string, string>; // uid -> avatar/photo URL, set at creation
  lastMessage?: string;
  lastMessageAt?: any;
  lastSenderId?: string;
  unreadCount: Record<string, number>; // uid -> unread count for that user
  // uid -> last time that user's client observed a newer message in this
  // chat (see subscribeToChats). Used to derive "delivered" ticks.
  deliveredTo?: Record<string, any>;
  // uid -> last time that user opened/viewed this chat (see markChatRead).
  // Used to derive "seen" ticks.
  readTo?: Record<string, any>;
  createdAt?: any;
  // Optional context for how the conversation started — purely informational,
  // doesn't affect who can message whom. providerId is which participant
  // is "the provider" for this chat's service context — needed because
  // participants[] is otherwise symmetric and doesn't encode roles.
  serviceId?: string;
  serviceName?: string;
  providerId?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

interface GetOrCreateChatParams {
  currentUserId: string;
  currentUserName?: string;
  currentUserPhoto?: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserPhoto?: string;
  serviceId?: string;
  serviceName?: string;
  // Which of the two people is "the provider" for this chat's service
  // context. Defaults to otherUserId if omitted, since every current
  // entry point (a client pressing "Message" on a provider's service/
  // profile page) has the provider as the other person, not the caller.
  // Pass this explicitly if that ever isn't true (e.g. a provider
  // messaging a client from a booking).
  providerId?: string;
}

interface ChatState {
  chats: ChatSummary[];
  chatsLoading: boolean;
  messagesByChat: Record<string, ChatMessage[]>;
  messagesLoading: Record<string, boolean>;

  subscribeToChats: (uid: string) => Unsubscribe;
  subscribeToMessages: (chatId: string) => Unsubscribe;
  getOrCreateChat: (params: GetOrCreateChatParams) => Promise<string>;
  sendMessage: (chatId: string, senderId: string, text: string) => Promise<void>;
  markChatRead: (chatId: string, uid: string) => Promise<void>;
}

// One chat per pair of people, regardless of how many bookings/services
// they interact over. Sorting the two uids makes this deterministic —
// either person calling getOrCreateChat lands on the same doc.
function chatIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

// Dedup guard for the "mark delivered" side-effect in subscribeToChats.
// Keyed by `${chatId}:${lastMessageAtMillis}` so we only fire one write
// per genuinely-new message per chat, even though the chats listener can
// re-fire for unrelated reasons (metadata changes, reconnects, etc.).
// Session-scoped is fine — worst case on a fresh app launch is one
// redundant (but harmless, idempotent) write for the most recent message.
const deliveredMarkCache = new Set<string>();

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  chatsLoading: false,
  messagesByChat: {},
  messagesLoading: {},

  // ── Chat list (the "list of chats" screen) ─────────────────────────────
  // NOTE: this query needs a composite Firestore index (array-contains +
  // orderBy). The first time you run this, Firestore will throw an error
  // in the console with a direct link to auto-create it — click it once
  // and you're done, no manual index config needed.
  subscribeToChats: (uid: string) => {
    set({ chatsLoading: true });
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatSummary));
        set({ chats, chatsLoading: false });

        // "Delivered" piggybacks on this same subscription — every
        // signed-in user already has it running globally (see
        // RootLayout), so observing a chat update here means this
        // client genuinely received the new message data, independent
        // of whether the conversation screen itself is open.
        for (const chat of chats) {
          if (!chat.lastSenderId || chat.lastSenderId === uid || !chat.lastMessageAt) continue;
          const lastMsgMs = (chat.lastMessageAt as any)?.toMillis?.();
          if (!lastMsgMs) continue; // still resolving server timestamp

          const cacheKey = `${chat.id}:${lastMsgMs}`;
          if (deliveredMarkCache.has(cacheKey)) continue;
          deliveredMarkCache.add(cacheKey);

          updateDoc(doc(db, 'chats', chat.id), {
            [`deliveredTo.${uid}`]: serverTimestamp(),
          }).catch((e) => console.error('Failed to mark message delivered:', e));
        }
      },
      (error) => {
        console.error('Failed to subscribe to chats:', error);
        set({ chatsLoading: false });
      }
    );
  },

  // ── Messages for a single chat (the conversation screen) ───────────────
  subscribeToMessages: (chatId: string) => {
    set((s) => ({ messagesLoading: { ...s.messagesLoading, [chatId]: true } }));
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    // includeMetadataChanges: true is what lets us see the "sending" ->
    // "sent" transition — without it, onSnapshot only fires once the
    // write is server-confirmed, and we'd never observe the pending state.
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const messages = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
              pending: d.metadata.hasPendingWrites,
            } as ChatMessage)
        );
        set((s) => ({
          messagesByChat: { ...s.messagesByChat, [chatId]: messages },
          messagesLoading: { ...s.messagesLoading, [chatId]: false },
        }));
      },
      (error) => {
        console.error('Failed to subscribe to messages:', error);
        set((s) => ({ messagesLoading: { ...s.messagesLoading, [chatId]: false } }));
      }
    );
  },

  // ── Get-or-create the chat doc for a pair of people ─────────────────────
  // Called whenever a "Message" button is pressed — from a provider's
  // profile, a service page, wherever. Idempotent: pressing it again for
  // the same two people just returns the existing conversation instead of
  // creating a new one.
  getOrCreateChat: async ({
    currentUserId,
    currentUserName,
    currentUserPhoto,
    otherUserId,
    otherUserName,
    otherUserPhoto,
    serviceId,
    serviceName,
    providerId,
  }) => {
    const chatId = chatIdFor(currentUserId, otherUserId);
    const chatRef = doc(db, 'chats', chatId);
    const snap = await getDoc(chatRef);
    const resolvedProviderId = providerId ?? otherUserId;

    if (!snap.exists()) {
      const newChat: Omit<ChatSummary, 'id'> = {
        participants: [currentUserId, otherUserId].sort(),
        participantNames: {
          ...(currentUserName ? { [currentUserId]: currentUserName } : {}),
          ...(otherUserName ? { [otherUserId]: otherUserName } : {}),
        },
        participantPhotos: {
          ...(currentUserPhoto ? { [currentUserId]: currentUserPhoto } : {}),
          ...(otherUserPhoto ? { [otherUserId]: otherUserPhoto } : {}),
        },
        serviceId,
        serviceName,
        providerId: resolvedProviderId,
        unreadCount: { [currentUserId]: 0, [otherUserId]: 0 },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await setDoc(chatRef, newChat);
    } else {
      // Chat already exists — merge in any display names/photos we now
      // have but didn't before (e.g. the other person only just set a
      // displayName/photo), and backfill providerId for chats created
      // before that field existed.
      const existing = snap.data() as ChatSummary;
      const updates: Record<string, any> = {};
      if (currentUserName && existing.participantNames?.[currentUserId] !== currentUserName) {
        updates[`participantNames.${currentUserId}`] = currentUserName;
      }
      if (otherUserName && existing.participantNames?.[otherUserId] !== otherUserName) {
        updates[`participantNames.${otherUserId}`] = otherUserName;
      }
      if (currentUserPhoto && existing.participantPhotos?.[currentUserId] !== currentUserPhoto) {
        updates[`participantPhotos.${currentUserId}`] = currentUserPhoto;
      }
      if (otherUserPhoto && existing.participantPhotos?.[otherUserId] !== otherUserPhoto) {
        updates[`participantPhotos.${otherUserId}`] = otherUserPhoto;
      }
      if (!existing.providerId) {
        updates.providerId = resolvedProviderId;
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(chatRef, updates).catch((e) =>
          console.error('Failed to refresh chat metadata:', e)
        );
      }
    }

    return chatId;
  },

  // ── Send a message ──────────────────────────────────────────────────────
  sendMessage: async (chatId: string, senderId: string, text: string) => {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) throw new Error('Chat does not exist');

    const chat = chatSnap.data() as ChatSummary;
    const otherUid = chat.participants.find((id) => id !== senderId);
    if (!otherUid) throw new Error('Could not determine recipient');

    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId,
      text,
      createdAt: serverTimestamp(),
    });

    const senderName = chat.participantNames?.[senderId] || 'User';


    // Send notification to provider
        const userRef = doc(db, 'users', otherUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userToken = userData.fcmToken;
          if (userToken) {
            await sendNotification({
              deviceToken: userToken,
              title: senderName,
              body: text,
              data: {
                'type': 'chat',
                'chatId': chatId,
              }
            }).catch(err => console.warn('Notification failed', err));
          }
        }

    // Bump the recipient's unread count and refresh the list preview.
    // Dot-path key here is Firestore's nested-field update syntax, not a
    // literal object — safe since Firebase UIDs never contain dots.
    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastSenderId: senderId,
      [`unreadCount.${otherUid}`]: increment(1),
    });
  },

  // ── Mark a chat as read for the current user ────────────────────────────
  markChatRead: async (chatId: string, uid: string) => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${uid}`]: 0,
        [`readTo.${uid}`]: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to mark chat as read:', error);
    }
  },
}));

// ── Total unread count across all chats, for the tab bar badge ───────────
// Reads directly off the store's `chats` array, so it stays in sync with
// whatever is currently subscribed (see subscribeToChats). This is a
// derived selector, not separate state — nothing to keep in sync by hand.
export function useUnreadChatCount(uid?: string | null): number {
  return useChatStore((s) =>
    uid ? s.chats.reduce((sum, chat) => sum + (chat.unreadCount?.[uid] ?? 0), 0) : 0
  );
}


// Is `uid` the provider for this chat's service context? Used to decide
// what to show as the header/list title — the provider sees the client's
// name, the client sees the service name.
export function isProviderInChat(chat: ChatSummary | undefined, uid?: string | null): boolean {
  return !!chat?.providerId && chat.providerId === uid;
}

function toMillis(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts === 'number') return ts;
  return null;
}

// Derives a message's tick status by comparing its createdAt against the
// OTHER participant's deliveredTo/readTo timestamps on the parent chat
// doc — no per-message write needed. Only meaningful for messages the
// current user sent; calling this for the other person's messages isn't
// wrong, just not something you'd render ticks for.
export function getMessageStatus(
  message: ChatMessage,
  chat: ChatSummary | undefined,
  myUid: string
): MessageStatus {
  if (message.pending) return 'sending';
  if (!chat) return 'sent';

  const otherUid = chat.participants.find((id) => id !== myUid);
  if (!otherUid) return 'sent';

  const msgMs = toMillis(message.createdAt);
  if (msgMs == null) return 'sent'; // this message's own serverTimestamp hasn't resolved yet

  const readMs = toMillis(chat.readTo?.[otherUid]);
  if (readMs != null && readMs >= msgMs) return 'seen';

  const deliveredMs = toMillis(chat.deliveredTo?.[otherUid]);
  if (deliveredMs != null && deliveredMs >= msgMs) return 'delivered';

  return 'sent';
}