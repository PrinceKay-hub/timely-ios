import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useChatStore, ChatSummary, isProviderInChat, MessageStatus } from '@/stores/chat';
import { usePresenceSubscription } from '@/stores/presence';
import { ChatAvatar } from '@/components/chat/chatavatar';
import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

// ─── Helper: format timestamp for the list ──────────────────────────────
function formatTimestamp(ts: any): string {
  if (!ts?.toDate) return '';
  const date = ts.toDate();
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Helper: get status of the last message ─────────────────────────────
function getLastMessageStatus(chat: ChatSummary, uid: string): MessageStatus | null {
  // Only show status if the current user is the sender
  if (chat.lastSenderId !== uid) return null;
  const msgMs = chat.lastMessageAt?.toDate?.()?.getTime();
  if (!msgMs) return null;

  const otherUid = chat.participants.find((id) => id !== uid);
  if (!otherUid) return null;

  const readMs = chat.readTo?.[otherUid]?.toDate?.()?.getTime();
  const deliveredMs = chat.deliveredTo?.[otherUid]?.toDate?.()?.getTime();

  if (readMs !== undefined && readMs >= msgMs) return 'seen';
  if (deliveredMs !== undefined && deliveredMs >= msgMs) return 'delivered';
  return 'sent';
}

// ─── Status ticks (matches the chat screen) ─────────────────────────────
const StatusTicks = React.memo<{ status: MessageStatus; color?: string }>(
  ({ status, color }) => {
    let icon: string;
    let style: any = { fontSize: 12, marginLeft: 4 };
    switch (status) {
      case 'sending':
        icon = '🕐';
        break;
      case 'seen':
        icon = '✓✓';
        style = { ...style, color: '#34B7F1' };
        break;
      case 'delivered':
        icon = '✓✓';
        style = { ...style, color: color || 'rgba(0,0,0,0.4)' };
        break;
      case 'sent':
      default:
        icon = '✓';
        style = { ...style, color: color || 'rgba(0,0,0,0.4)' };
        break;
    }
    return <Text style={style}>{icon}</Text>;
  }
);

// ─── Chat row component ──────────────────────────────────────────────────
const ChatRow = React.memo<{
  chat: ChatSummary;
  uid: string;
  styles: any;
  colors: any;
  onPress: () => void;
}>(({ chat, uid, styles, colors, onPress }) => {
  const unread = chat.unreadCount?.[uid] ?? 0;
  const otherUid = chat.participants.find((id) => id !== uid);
  const otherName =
    (otherUid && chat.participantNames?.[otherUid]) || chat.serviceName || 'Chat';
  const otherPhoto = otherUid ? chat.participantPhotos?.[otherUid] : undefined;
  const isProvider = isProviderInChat(chat, uid);
  const rowTitle = isProvider ? otherName : chat.serviceName || otherName;
  const presence = usePresenceSubscription(otherUid);

  // Compute status only if last message is from current user
  const lastMsgStatus = getLastMessageStatus(chat, uid);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <ChatAvatar
        uri={otherPhoto}
        name={otherName}
        size={52}
        online={presence?.state === 'online'}
        colors={colors}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {rowTitle}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTimestamp(chat.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          {/* Status tick (only if current user is sender) */}
          {lastMsgStatus && <StatusTicks status={lastMsgStatus} color={colors.textSecondary} />}
          <Text
            style={[
              styles.lastMessage,
              { color: colors.textSecondary },
              unread > 0 && { color: colors.text, fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {chat.lastMessage || 'Say hello 👋'}
          </Text>
          
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────
export default function ChatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const chats = useChatStore((s) => s.chats);
  const chatsLoading = useChatStore((s) => s.chatsLoading);

  const keyExtractor = (item: ChatSummary) => item.id;

  const renderItem = ({ item }: { item: ChatSummary }) => (
    <ChatRow
      chat={item}
      uid={user!.uid}
      styles={styles}
      colors={theme.colors}
      onPress={() => router.push(`/chats/${item.id}`)}
    />
  );

  if (chatsLoading && chats.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.gray100 }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!chats.length) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.gray100 }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme.colors.statusBar} />
        <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No conversations yet</Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          You have no messages yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.gray100 }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={theme.colors.statusBar} />
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: '#fff' }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={chats}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    listPad: { paddingVertical: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    rowBody: { flex: 1, gap: 4 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowBottom: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    name: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    time: { fontSize: 12 },
    lastMessage: { fontSize: 13, flex: 1, marginRight: 4 },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    emptySubtitle: { fontSize: 14, textAlign: 'center' },
    header: {
      paddingTop: 50,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    backButton: {
      borderRadius: 20,
      padding: 8,
      marginRight: 16,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'center',
      marginRight: 40,
    },
  });