import { create } from 'zustand';
import { db, storage } from '@/firebase';
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
  limit,
  getDocs,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { Image as RNImage } from 'react-native';
import { sendNotification } from '@/services/notificationService';

export type MessageType = 'text' | 'image';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  pending?: boolean;
  type?: MessageType;

  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;

  localImageUri?: string;
  uploadProgress?: number;
  uploadFailed?: boolean;

  // NEW
  isDeleted?: boolean; 
  deletedFor?: string[];

  replyToId?: string;
  replyToSenderId?: string;
  replyToSenderName?: string;
  replyToType?: MessageType;
  replyToText?: string | null;
  replyToImageUrl?: string;
}

// NEW — mirrors ChatMessage.isDeletedFor in the Flutter model
export function isMessageDeletedFor(message: ChatMessage, uid: string): boolean {
  return !!message.isDeleted || !!message.deletedFor?.includes(uid);
}

export interface ChatSummary {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  participantPhotos?: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: any;
  lastSenderId?: string;
  unreadCount: Record<string, number>;
  deliveredTo?: Record<string, any>;
  readTo?: Record<string, any>;
  createdAt?: any;
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
  providerId?: string;
}

interface ChatState {
  chats: ChatSummary[];
  chatsLoading: boolean;
  messagesByChat: Record<string, ChatMessage[]>;
  messagesLoading: Record<string, boolean>;
  // Local-only messages (images currently uploading), keyed by chatId.
  // Kept separate from messagesByChat for the same reason as the Flutter
  // version: the Firestore listener replaces messagesByChat[chatId]
  // wholesale on every snapshot, so merging pending messages directly in
  // there would make them vanish on the next unrelated snapshot before
  // the upload finishes. Reconciled in subscribeToMessages once the
  // matching doc id shows up server-side.
  pendingMessagesByChat: Record<string, ChatMessage[]>;

  subscribeToChats: (uid: string) => Unsubscribe;
  subscribeToMessages: (chatId: string) => Unsubscribe;
  getOrCreateChat: (params: GetOrCreateChatParams) => Promise<string>;
  sendMessage: (chatId: string, senderId: string, text: string, replyTo?: ChatMessage) => Promise<void>;
  sendImageMessage: (chatId: string, senderId: string, localUri: string, replyTo?: ChatMessage) => Promise<void>;
  retryImageMessage: (chatId: string, senderId: string, failed: ChatMessage) => Promise<void>;
  markChatRead: (chatId: string, uid: string) => Promise<void>;
  // Merged view: server-confirmed + still-uploading local images. UI
  // should read this, not messagesByChat directly.
  messagesFor: (chatId: string) => ChatMessage[];
  deleteMessageForMe: (chatId: string, messageId: string, uid: string) => Promise<void>;
  deleteMessageForEveryone: (chatId: string, messageId: string, senderId: string) => Promise<void>;
}

function chatIdFor(uidA: string, uidB: string, serviceId?: string): string {
  const pair = [uidA, uidB].sort().join('_');
  return serviceId ? `${pair}_${serviceId}` : pair;
}

function getImageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null) // don't block send on a dimension-read failure
    );
  });
}

function replyFields(replyTo: ChatMessage | undefined | null, chat: ChatSummary) {
  if (!replyTo) return {};
  const senderName = chat.participantNames?.[replyTo.senderId] || 'User';
  const isImage = replyTo.type === 'image';
  return {
    replyToId: replyTo.id,
    replyToSenderId: replyTo.senderId,
    replyToSenderName: senderName,
    replyToType: isImage ? 'image' : 'text',
    replyToText: isImage ? null : replyTo.text,
    ...(isImage ? { replyToImageUrl: replyTo.imageUrl ?? null } : {}),
  };
}

const deliveredMarkCache = new Set<string>();

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  chatsLoading: false,
  messagesByChat: {},
  messagesLoading: {},
  pendingMessagesByChat: {},

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

        for (const chat of chats) {
          if (!chat.lastSenderId || chat.lastSenderId === uid || !chat.lastMessageAt) continue;
          const lastMsgMs = (chat.lastMessageAt as any)?.toMillis?.();
          if (!lastMsgMs) continue;

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

  subscribeToMessages: (chatId: string) => {
    set((s) => ({ messagesLoading: { ...s.messagesLoading, [chatId]: true } }));
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

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

        set((s) => {
          // Reconcile: drop any pending local entry whose id now has a
          // confirmed server doc, same as the Flutter cubit.
          const currentPending = s.pendingMessagesByChat[chatId];
          let pendingMessagesByChat = s.pendingMessagesByChat;
          if (currentPending && currentPending.length) {
            const confirmedIds = new Set(messages.map((m) => m.id));
            const remaining = currentPending.filter((m) => !confirmedIds.has(m.id));
            if (remaining.length !== currentPending.length) {
              pendingMessagesByChat = { ...s.pendingMessagesByChat, [chatId]: remaining };
            }
          }
          return {
            messagesByChat: { ...s.messagesByChat, [chatId]: messages },
            messagesLoading: { ...s.messagesLoading, [chatId]: false },
            pendingMessagesByChat,
          };
        });
      },
      (error) => {
        console.error('Failed to subscribe to messages:', error);
        set((s) => ({ messagesLoading: { ...s.messagesLoading, [chatId]: false } }));
      }
    );
  },

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
    const chatId = chatIdFor(currentUserId, otherUserId, serviceId);
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

  sendMessage: async (chatId, senderId, text, replyTo) => {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) throw new Error('Chat does not exist');

  const chat = chatSnap.data() as ChatSummary;
  const otherUid = chat.participants.find((id) => id !== senderId);
  if (!otherUid) throw new Error('Could not determine recipient');

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    text,
    type: 'text',
    createdAt: serverTimestamp(),
    ...replyFields(replyTo, chat),
  });

  const senderName = chat.participantNames?.[senderId] || 'User';
  await notifyOtherParticipant(otherUid, chatId, senderName, text);

  await updateDoc(chatRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    [`unreadCount.${otherUid}`]: increment(1),
  });
},

  // ── Send an image message ─────────────────────────────────────────────
  // Mirrors the Flutter flow: pre-allocate the doc id (free, no network
  // round-trip via doc() with no args), show it immediately from the
  // local URI with a progress overlay, then write the real doc under
  // that same id once upload + getDownloadURL resolve. subscribeToMessages
  // reconciles the pending entry away once that doc's snapshot arrives.
  sendImageMessage: async (chatId, senderId, localUri, replyTo) => {
  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  const messageId = messageRef.id;
  const dimensions = await getImageSize(localUri);

  const optimisticMessage: ChatMessage = {
    id: messageId,
    senderId,
    text: '',
    createdAt: new Date(),
    pending: true,
    type: 'image',
    imageWidth: dimensions?.width,
    imageHeight: dimensions?.height,
    localImageUri: localUri,
    uploadProgress: 0,
    replyToId: replyTo?.id,
    replyToSenderId: replyTo?.senderId,
    replyToType: replyTo?.type,
    replyToText: replyTo?.type === 'image' ? undefined : replyTo?.text,
    replyToImageUrl: replyTo?.type === 'image' ? replyTo?.imageUrl : undefined,
  };

  set((s) => ({
    pendingMessagesByChat: {
      ...s.pendingMessagesByChat,
      [chatId]: [...(s.pendingMessagesByChat[chatId] ?? []), optimisticMessage],
    },
  }));

    const updatePending = (updater: (m: ChatMessage) => ChatMessage) => {
      set((s) => {
        const list = s.pendingMessagesByChat[chatId];
        if (!list) return s;
        return {
          pendingMessagesByChat: {
            ...s.pendingMessagesByChat,
            [chatId]: list.map((m) => (m.id === messageId ? updater(m) : m)),
          },
        };
      });
    };

    try {
      const response = await fetch(localUri);
      const blob = await response.blob();

      const fileRef = storageRef(storage, `chats/${chatId}/${messageId}.jpg`);
      const uploadTask = uploadBytesResumable(fileRef, blob, { contentType: 'image/jpeg' });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes <= 0) return;
            const progress = snapshot.bytesTransferred / snapshot.totalBytes;
            updatePending((m) => ({ ...m, uploadProgress: progress }));
          },
          reject,
          () => resolve()
        );
      });

      const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);

      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) throw new Error('Chat does not exist');
      const chat = chatSnap.data() as ChatSummary;
      const otherUid = chat.participants.find((id) => id !== senderId);
      if (!otherUid) throw new Error('Could not determine recipient');

      await setDoc(messageRef, {
        senderId,
        text: '',
        type: 'image',
        imageUrl,
        ...(dimensions ? { imageWidth: dimensions.width, imageHeight: dimensions.height } : {}),
        createdAt: serverTimestamp(),
        ...replyFields(replyTo, chat),
      });

      const senderName = chat.participantNames?.[senderId] || 'User';
      await notifyOtherParticipant(otherUid, chatId, senderName, '📷 Photo');

      await updateDoc(chatRef, {
        lastMessage: '📷 Photo',
        lastMessageAt: serverTimestamp(),
        lastSenderId: senderId,
        [`unreadCount.${otherUid}`]: increment(1),
      });
      // No manual pending-removal here — the messages listener's
      // reconciliation drops it once this doc's snapshot fires.
    } catch (e) {
      console.error('sendImageMessage error:', e);
      updatePending((m) => ({ ...m, uploadFailed: true }));
    }
  },

  // Re-attempt using the same local file. Fresh message id, drop the old
  // failed pending entry — a retry is just a new attempt.
  retryImageMessage: async (chatId, senderId, failed) => {
    if (!failed.localImageUri) return;
    set((s) => ({
      pendingMessagesByChat: {
        ...s.pendingMessagesByChat,
        [chatId]: (s.pendingMessagesByChat[chatId] ?? []).filter((m) => m.id !== failed.id),
      },
    }));
    // Note: retry doesn't carry replyTo forward in the Flutter version either
    // (it re-sends via sendImageMessage(chatId, senderId, File(path)) with no reply arg) — matched here.
    await get().sendImageMessage(chatId, senderId, failed.localImageUri);
  },

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

  deleteMessageForMe: async (chatId: string, messageId: string, uid: string) => {
  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    const current: string[] = snap.data()?.deletedFor ?? [];
    if (current.includes(uid)) return; // already hidden for this user
    await updateDoc(msgRef, { deletedFor: [...current, uid] });
  } catch (e) {
    console.error('deleteMessageForMe error:', e);
  }
},

deleteMessageForEveryone: async (chatId: string, messageId: string, senderId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);

    // Read first — need to know if there's a Storage object to clean up,
    // and the update below wipes imageUrl so we'd lose that reference
    // after this point.
    const msgSnap = await getDoc(msgRef);
    const hadImage = msgSnap.data()?.type === 'image';

    await updateDoc(msgRef, { isDeleted: true, text: '', imageUrl: null });

    if (hadImage) {
      try {
        await deleteObject(storageRef(storage, `chats/${chatId}/${messageId}.jpg`));
      } catch (e) {
        // Object may already be gone (e.g. a retried send under a
        // different messageId) — not fatal to the delete itself.
        console.warn('Storage cleanup failed:', e);
      }
    }

    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return;
    const chat = chatSnap.data() as ChatSummary;
    if (chat.lastSenderId === senderId) {
      const latestSnap = await getDocs(
        query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(1))
      );
      if (!latestSnap.empty && latestSnap.docs[0].id === messageId) {
        await updateDoc(chatRef, { lastMessage: 'This message was deleted' });
      }
    }
  } catch (e) {
    console.error('deleteMessageForEveryone error:', e);
  }
},


  messagesFor: (chatId: string) => {
    const s = get();
    const server = s.messagesByChat[chatId] ?? [];
    const pending = s.pendingMessagesByChat[chatId] ?? [];
    if (pending.length === 0) return server;
    return [...server, ...pending];
  },
}));

async function notifyOtherParticipant(
  otherUid: string,
  chatId: string,
  senderName: string,
  body: string
) {
  try {
    const userSnap = await getDoc(doc(db, 'users', otherUid));
    if (!userSnap.exists()) return;
    const token = userSnap.data()?.fcmToken;
    if (!token) return;
    await sendNotification({
      deviceToken: token,
      title: senderName,
      body,
      data: { type: 'chat', chatId },
    }).catch((err) => console.warn('Notification failed', err));
  } catch (e) {
    console.warn('Push notification error', e);
  }
}

export function useUnreadChatCount(uid?: string | null): number {
  return useChatStore((s) =>
    uid ? s.chats.reduce((sum, chat) => sum + (chat.unreadCount?.[uid] ?? 0), 0) : 0
  );
}

export function isProviderInChat(chat: ChatSummary | undefined, uid?: string | null): boolean {
  return !!chat?.providerId && chat.providerId === uid;
}

function toMillis(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  return null;
}

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
  if (msgMs == null) return 'sent';

  const readMs = toMillis(chat.readTo?.[otherUid]);
  if (readMs != null && readMs >= msgMs) return 'seen';

  const deliveredMs = toMillis(chat.deliveredTo?.[otherUid]);
  if (deliveredMs != null && deliveredMs >= msgMs) return 'delivered';

  return 'sent';
}
