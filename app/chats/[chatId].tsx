import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { useChatStore, ChatMessage, MessageStatus, getMessageStatus, isProviderInChat } from '@/stores/chat';
import { usePresenceSubscription, formatPresenceLabel } from '@/stores/presence';
import { ChatAvatar } from '@/components/chat/chatavatar';
import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


type ChatItem = string | ChatMessage;

function formatDateHeader(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = date.toDateString();
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  // Same year: show day/month, else full date
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}


function formatTimestamp(ts: any): string {
  if (!ts?.toDate) return '';
  const date = ts.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


const StatusTicks = React.memo<{ status: MessageStatus }>(({ status }) => {
  if (status === 'sending') return <Text style={styles_ticks.tick}>🕐</Text>;
  if (status === 'seen') return <Text style={[styles_ticks.tick, { color: '#34B7F1' }]}>✓✓</Text>;
  if (status === 'delivered') return <Text style={[styles_ticks.tick, { color: 'rgba(255,255,255,0.75)' }]}>✓✓</Text>;
  return <Text style={[styles_ticks.tick, { color: 'rgba(255,255,255,0.75)' }]}>✓</Text>; // sent
});

const styles_ticks = StyleSheet.create({
  tick: { fontSize: 10, marginLeft: 6, color: 'rgba(255,255,255,0.75)' },
});

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44;

const Bubble = React.memo<{ message: ChatMessage; isMine: boolean; status: MessageStatus; styles: any; colors: any }>(
  ({ message, isMine, status, styles, colors }) => (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View style={[styles.bubble, { backgroundColor: isMine ? colors.primary : colors.background || '#f3f4f6' }]}>
        <View style={styles.bubbleContentRow}>
          <Text style={[styles.bubbleText, { color: isMine ? '#fff' : colors.text }]}>{message.text}</Text>
        </View>
        <View style={styles.timeTick}>
            <Text style={[styles.time, {color: isMine ? colors.text  : colors.primary}]}>{formatTimestamp(message.createdAt)}</Text>
            {isMine && <StatusTicks status={status} />}
          </View>
      </View>
    </View>
  )
);

const EMPTY_MESSAGES: ChatMessage[] = [];

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);

  const messages = useChatStore((s) => (chatId ? s.messagesByChat[chatId] : undefined)) ?? EMPTY_MESSAGES;
  const loading = useChatStore((s) => (chatId ? s.messagesLoading[chatId] ?? false : false));
  // Pulled from the chats list already kept live by RootLayout's global
  // subscription — no extra fetch needed just to know who we're talking to.
  const chatSummary = useChatStore((s) => s.chats.find((c) => c.id === chatId));
  const otherUid = chatSummary?.participants.find((id) => id !== user?.uid);
  const otherName = (otherUid && chatSummary?.participantNames?.[otherUid]) || 'Chat';
  const otherPhoto = otherUid ? chatSummary?.participantPhotos?.[otherUid] : undefined;
  const serviceId = chatSummary?.serviceId;
  const presence = usePresenceSubscription(otherUid);
  const presenceLabel = formatPresenceLabel(presence);

  const isProvider = isProviderInChat(chatSummary, user?.uid);
  // Provider sees the client's name as the title, presence underneath —
  // unchanged from before. Client sees the service this conversation is
  // about as the title (falling back to the provider's name if the chat
  // has no service context), with the provider's name + presence as the
  // subtitle instead.
  const headerTitle = isProvider ? otherName : chatSummary?.serviceName || otherName;

  const [text, setText] = useState('');
  const unsubRef = useRef<(() => void) | undefined>(undefined);



   // ─── Group messages with date headers ──────────────────────────────────
  const groupedItems = useMemo(() => {
    if (messages.length === 0) return [] as ChatItem[];

    const sorted = [...messages].sort((a, b) => {
      const ta = a.createdAt?.toDate?.() ?? new Date(0);
      const tb = b.createdAt?.toDate?.() ?? new Date(0);
      return ta.getTime() - tb.getTime();
    });

    const groups: ChatItem[] = [];
    let currentDate: string | null = null;

    for (const msg of sorted) {
      const date = msg.createdAt?.toDate?.() ?? new Date();
      const dateKey = date.toDateString();

      if (dateKey !== currentDate) {
        groups.push(formatDateHeader(date));
        currentDate = dateKey;
      }
      groups.push(msg);
    }

    return groups;
  }, [messages]);


  // Reverse for inverted FlatList (newest at bottom)
  const dataForList = useMemo(() => [...groupedItems].reverse(), [groupedItems]);

  // ─── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    unsubRef.current = useChatStore.getState().subscribeToMessages(chatId);
    return () => unsubRef.current?.();
  }, [chatId]);

  useEffect(() => {
    if (chatId && user?.uid) {
      useChatStore.getState().markChatRead(chatId, user.uid);
    }
  }, [chatId, user?.uid, messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !chatId || !user?.uid) return;
    setText('');
    try {
      await useChatStore.getState().sendMessage(chatId, user.uid, trimmed);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [text, chatId, user?.uid]);

  const handleBook = () => {
      if (!serviceId) return;
      if (!user?.emailVerified) {
        Alert.alert('Email not verified', 'Please verify your email in the Profile screen to book.');
        return;
      }
      router.push({
        pathname: '/booking/[id]',
        params: { id: serviceId }
      });
    };

  // ─── Render helpers ──────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ChatItem }) => {
      if (typeof item === 'string') {
        // Date header
        return (
          <View style={styles.dateHeaderContainer}>
            <View style={[styles.dateHeader, { backgroundColor: colors.surface || '#f3f4f6' }]}>
              <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          </View>
        );
      }

      const isMine = item.senderId === user?.uid;
      const status = isMine && user?.uid
        ? getMessageStatus(item, chatSummary, user.uid)
        : 'sent';
      return <Bubble message={item} isMine={isMine} status={status} styles={styles} colors={theme.colors} />;
    },
    [user?.uid, chatSummary, styles, theme.colors]
  );

  // ─── Main render ──────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.gray100 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} >
            <Ionicons name="arrow-back" size={24} color={ '#fff'} />
          </TouchableOpacity>
          <ChatAvatar
            uri={otherPhoto}
            name={otherName}
            size={36}
            online={isProvider ? presence?.state === 'online' : undefined}
            colors={theme.colors}
          />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerName, { color: '#fff' }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            {isProvider ? (
              !!presenceLabel && (
                <Text
                  style={[
                    styles.headerStatus,
                    { color: presence?.state === 'online' ? '#22c55e' : theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {presenceLabel}
                </Text>
              )
            ) : (
              <Text style={[styles.headerStatus, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {!!presenceLabel && (
                  <Text style={{ color: presence?.state === 'online' ? '#22c55e' : theme.colors.textSecondary }}>
                    {presenceLabel}
                  </Text>
                )}
              </Text>
            )}
          </View>
          {!isProvider && serviceId && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#fff' }]}
              onPress={handleBook}
            >
              <Text style={[{ color: theme.colors.primary }]}>Book Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={dataForList}
          keyExtractor={(item, index) => {
            if (typeof item === 'string') {
              return `header-${item}-${index}`;
            }
            return `msg-${item.id}`;
          }}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.colors.background || '#fff' }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface || '#f3f4f6', color: theme.colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.colors.primary, opacity: text.trim() ? 1 : 0.5 }]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => {

  return StyleSheet.create({
    container: {
      paddingTop: STATUS_BAR_HEIGHT + 12,
      paddingBottom: 20,
      paddingHorizontal: 20,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listPad: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1, justifyContent: 'flex-end' },
    bubbleRow: { marginVertical: 4, flexDirection: 'row' },
    bubbleRowMine: { justifyContent: 'flex-end' },
    bubbleRowTheirs: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleContentRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
    bubbleText: { fontSize: 15 },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border || '#e5e7eb',
    },
    input: {
      flex: 1,
      maxHeight: 100,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
    },
    sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    sendBtnText: { color: '#fff', fontSize: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, },
    headerTextWrap: { flexShrink: 1, width: 380 },
    headerName: { fontSize: 16, fontWeight: '700' },
    headerStatus: { fontSize: 12, marginTop: 1 },
    backButton: {
      borderRadius: 20,
      padding: 8,
      marginRight: 16,
    },
    timeTick: {
      flexDirection: "row",
      justifyContent: 'flex-end'
    },
    time: {
      fontSize: 10
    },

    dateHeaderContainer: {
      alignItems: 'center',
      marginVertical: 12,
    },
    dateHeader: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 12,
    },
    dateHeaderText: {
      fontSize: 12,
      fontWeight: '500',
    },
    btn: {
      padding: 8,
      borderRadius: 10,
    }
  });
};