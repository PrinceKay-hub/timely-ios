import { AppNotification } from '@/services/SysNotification';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SelectBadge } from './selectbadge';

function formatWhen(ts: any): string {
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

export const NotificationRow = React.memo<{
  item: AppNotification;
  colors: any;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}>(({ item, colors, selecting, selected, onPress, onLongPress }) => {
  const icon = item.type === 'appointment' ? 'calendar' : 'notifications';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[
        styles.row,
        !item.read && { backgroundColor: colors.primary + '10' },
        selected && { backgroundColor: colors.primary + '24' },
      ]}
    >
      <View>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '26' }]}>
          <Ionicons name={icon as any} size={22} color={colors.primary} />
        </View>
        {selected && <SelectBadge color={colors.primary} ring={colors.gray100} />}
      </View>
      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.text, fontWeight: item.read ? '500' : '700' }]}
        >
          {item.title}
        </Text>
        <Text numberOfLines={2} style={[styles.text, { color: colors.textSecondary }]}>
          {item.body}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.time, { color: colors.textSecondary }]}>{formatWhen(item.createdAt)}</Text>
        {!item.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15 },
  text: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});