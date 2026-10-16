import { ChatAvatar } from '@/components/chat/chatavatar';
import { NotificationRow } from '@/components/chat/notificationrow';
import { SelectBadge } from '@/components/chat/selectbadge';
import { useTheme } from '@/providers/ThemeProvider';
import {
  callDurationSeconds,
  CallLog,
  CallProfile,
  isDeclined,
  isOngoing,
  useCallStore,
  wasAnswered,
} from '@/services/calls';
import { AppNotification, useNotificationStore } from '@/services/SysNotification';
import { useAuthStore } from '@/stores/auth';
import { ChatSummary, isProviderInChat, MessageStatus, useChatStore } from '@/stores/chat';
import { usePresenceSubscription } from '@/stores/presence';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// ADJUST: path of the module that exports startCall
import { startCall } from '@/services/callService';

type Tab = 'chats' | 'calls' | 'notifications';

const TAB_LABELS: Record<Tab, string> = {
  chats: 'Chats',
  calls: 'Calls',
  notifications: 'Notifications',
};

// ─── Helper: format timestamp for the list ──────────────────────────────
function formatTimestamp(ts: any): string {
  if (!ts?.toDate) return '';
  const date = ts.toDate();
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Helper: time label for call rows ───────────────────────────────────
function formatCallWhen(ts: any): string {
  if (!ts?.toDate) return '';
  const date: Date = ts.toDate();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDay) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
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
  const serviceProductName = chat.serviceName;

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
          <View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={[styles.servicename, { color: colors.text }]} numberOfLines={1}>
              {serviceProductName}
            </Text>
          </View>
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

// ─── Call row component ──────────────────────────────────────────────────
const CallRow = React.memo<{
  call: CallLog;
  uid: string;
  profile?: CallProfile;
  styles: any;
  colors: any;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onCallBack: () => void;
}>(({ call, uid, profile, styles, colors, selecting, selected, onPress, onLongPress, onCallBack }) => {
  const isOutgoing = call.callerId === uid;
  const otherName = profile?.name ?? 'Unknown';
  const missed = !wasAnswered(call) && !isOutgoing;

  let detail: string;
  if (isDeclined(call)) detail = isOutgoing ? 'Declined' : 'You declined';
  else if (missed) detail = 'Missed';
  else if (!wasAnswered(call)) detail = 'No answer';
  else if (isOngoing(call)) detail = 'Ongoing';
  else detail = formatDuration(callDurationSeconds(call));

  const dirColor = missed ? '#E53935' : '#2E9E5B';
  // arrow-up rotated 45° = outgoing (↗); arrow-down rotated 45° = incoming (↙)
  const dirIcon = isOutgoing ? 'arrow-up' : 'arrow-down';

  return (
    <TouchableOpacity
      style={[styles.row, selected && { backgroundColor: colors.primary + '24' }]}
      activeOpacity={0.7}
      onPress={selecting ? onPress : undefined}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <View>
        <ChatAvatar uri={profile?.photoUrl} name={otherName} size={52} online={false} colors={colors} />
        {selected && <SelectBadge color={colors.primary} ring={colors.gray100} />}
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[styles.callName, { color: missed ? '#E53935' : colors.text }]}
          numberOfLines={1}
        >
          {otherName}
        </Text>
        <View style={styles.rowBottom}>
          <Ionicons
            name={dirIcon as any}
            size={14}
            color={dirColor}
            style={{ transform: [{ rotate: '45deg' }], marginRight: 6 }}
          />
          <Text style={[styles.callDetail, { color: colors.textSecondary }]}>
            {detail} · {formatCallWhen(call.createdAt)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onCallBack}
        disabled={selecting}
        hitSlop={10}
        style={[styles.callBtn, selecting && { opacity: 0.3 }]}
      >
        <Ionicons name="call" size={22} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────
export default function ChatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('chats');

  const user = useAuthStore((s) => s.user);
  const chats = useChatStore((s) => s.chats);
  const chatsLoading = useChatStore((s) => s.chatsLoading);

  const calls = useCallStore((s) => s.calls);
  const profiles = useCallStore((s) => s.profiles);
  const callsLoading = useCallStore((s) => s.callsLoading);
  const callsError = useCallStore((s) => s.callsError);
  const subscribeToCalls = useCallStore((s) => s.subscribeToCalls);
  const unsubscribeCalls = useCallStore((s) => s.unsubscribeCalls);

  const notifications = useNotificationStore((s) => s.notifications);
  const notificationsLoading = useNotificationStore((s) => s.notificationsLoading);
  const notificationsError = useNotificationStore((s) => s.notificationsError);
  const unreadNotifs = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const subscribeToNotifications = useNotificationStore((s) => s.subscribeToNotifications);
  const unsubscribeNotifications = useNotificationStore((s) => s.unsubscribeNotifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const selectedCalls = useCallStore((s) => s.selectedCalls);
  const toggleCallSelect = useCallStore((s) => s.toggleCallSelect);
  const selectAllCalls = useCallStore((s) => s.selectAllCalls);
  const clearCallSelection = useCallStore((s) => s.clearCallSelection);
  const deleteSelectedCalls = useCallStore((s) => s.deleteSelectedCalls);

  const selectedNotifs = useNotificationStore((s) => s.selectedNotifs);
  const toggleNotifSelect = useNotificationStore((s) => s.toggleNotifSelect);
  const selectAllNotifs = useNotificationStore((s) => s.selectAllNotifs);
  const clearNotifSelection = useNotificationStore((s) => s.clearNotifSelection);
  const deleteSelectedNotifs = useNotificationStore((s) => s.deleteSelectedNotifs);

  useEffect(() => {
    if (!user?.uid) return;
    subscribeToCalls(user.uid);
    subscribeToNotifications(user.uid);
    return () => {
      unsubscribeCalls();
      unsubscribeNotifications();
    };
  }, [user?.uid]);

  const callSelCount = Object.keys(selectedCalls).length;
  const notifSelCount = Object.keys(selectedNotifs).length;
  const selCount = tab === 'calls' ? callSelCount : tab === 'notifications' ? notifSelCount : 0;
  const selecting = selCount > 0;

  const clearSelection = () => {
    clearCallSelection();
    clearNotifSelection();
  };

  const selectAll = () => {
    if (tab === 'calls') selectAllCalls();
    else if (tab === 'notifications') selectAllNotifs();
  };

  const confirmDelete = () => {
    const isCalls = tab === 'calls';
    const noun = isCalls ? 'call' : 'notification';
    Alert.alert(
      `Delete ${selCount} ${noun}${selCount === 1 ? '' : 's'}?`,
      isCalls
        ? 'This removes them from your call history only. The other person keeps theirs.'
        : "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = isCalls ? await deleteSelectedCalls() : await deleteSelectedNotifs();
            if (!ok) Alert.alert('Could not delete', 'Please try again.');
          },
        },
      ]
    );
  };

  const renderChat = ({ item }: { item: ChatSummary }) => (
    <ChatRow
      chat={item}
      uid={user!.uid}
      styles={styles}
      colors={colors}
      onPress={() => router.push(`/chats/${item.id}`)}
    />
  );

  const renderCall = ({ item }: { item: CallLog }) => {
    const otherUid = item.participants.find((id) => id !== user!.uid);
    return (
      <CallRow
        call={item}
        uid={user!.uid}
        profile={otherUid ? profiles[otherUid] : undefined}
        styles={styles}
        colors={colors}
        selecting={callSelCount > 0}
        selected={!!selectedCalls[item.id]}
        onPress={() => toggleCallSelect(item.id)}
        onLongPress={() => toggleCallSelect(item.id)}
        onCallBack={() => {
          if (!otherUid) return;
          // startCall throws "Already in a call" if one is active; the call
          // store already holds the error state, so just swallow it here.
          startCall({
            calleeId: otherUid,
            contextType: (item.context as 'chat' | 'service') ?? 'service',
            chatId: item.chatId ?? undefined,
            serviceId: item.serviceId ?? undefined,
            peerName: otherUid ? profiles[otherUid]?.name : undefined,
          }).catch(() => {});
        }}
      />
    );
  };

  const renderEmpty = (emoji: string, title: string, subtitle: string) => (
    <View style={styles.center}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );

  const renderBody = () => {
    if (tab === 'chats') {
      if (chatsLoading && chats.length === 0) {
        return (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        );
      }
      if (!chats.length) {
        return renderEmpty('💬', 'No conversations yet', 'You have no messages yet.');
      }
      return (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChat}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (tab === 'notifications') {
      if (notificationsLoading && notifications.length === 0) {
        return (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        );
      }
      if (notificationsError && notifications.length === 0) {
        return renderEmpty('⚠️', 'Could not load notifications', notificationsError);
      }
      if (!notifications.length) {
        return renderEmpty('🔔', 'No notifications yet', 'Booking updates will show up here.');
      }
      return (
        <FlatList
          data={notifications}
          extraData={selectedNotifs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: AppNotification }) => (
            <NotificationRow
              item={item}
              colors={colors}
              selecting={notifSelCount > 0}
              selected={!!selectedNotifs[item.id]}
              onLongPress={() => toggleNotifSelect(item.id)}
              onPress={() => {
                if (notifSelCount > 0) {
                  toggleNotifSelect(item.id);
                  return;
                }
                if (!item.read) markRead(item.id);
                // TODO: if (item.bookingId) router.push(`/bookings/${item.bookingId}`);
              }}
            />
          )}
          ListHeaderComponent={
            unreadNotifs > 0 && !selecting ? (
              <TouchableOpacity onPress={markAllRead} style={styles.markAll}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Mark all as read</Text>
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (callsLoading && calls.length === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (callsError && calls.length === 0) {
      return renderEmpty('⚠️', 'Could not load calls', callsError);
    }
    if (!calls.length) {
      return renderEmpty('📞', 'No calls yet', 'Your call history will show up here.');
    }
    return (
      <FlatList
        data={calls}
        extraData={selectedCalls}
        keyExtractor={(item) => item.id}
        renderItem={renderCall}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.gray100 }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={colors.statusBar} />
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={selecting ? clearSelection : () => router.back()}
          style={[styles.backButton, { backgroundColor: '#fff' }]}
        >
          <Ionicons name={selecting ? 'close' : 'arrow-back'} size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selecting ? `${selCount} selected` : 'Inbox'}</Text>
        {selecting ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={selectAll} hitSlop={8}>
              <Ionicons name="checkmark-done" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={styles.tabBar}>
        {(['chats', 'calls', 'notifications'] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tab, active && { borderBottomColor: colors.primary }]}
              onPress={() => {
                clearSelection();
                setTab(t);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.primary : colors.textSecondary },
                  active && { fontWeight: '700' },
                ]}
              >
                {TAB_LABELS[t]}
              </Text>
              {t === 'notifications' && unreadNotifs > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {renderBody()}
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
    name: { fontSize: 12, flex: 1, marginRight: 8 },
    servicename: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    time: { fontSize: 12 },
    lastMessage: { fontSize: 13, flex: 1, marginRight: 4 },
    callName: { fontSize: 15, fontWeight: '700' },
    callDetail: { fontSize: 13 },
    callBtn: { padding: 8 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
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
    tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 8 },
    tab: {
      flex: 1,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: { fontSize: 14, fontWeight: '500' },
    tabBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#E53935',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
      marginLeft: 6,
    },
    tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    markAll: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8 },
  });