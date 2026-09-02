import React, { useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ChatMessage, MessageStatus } from '@/stores/chat';
import { Image } from 'expo-image';
import { useTheme } from '@/providers/ThemeProvider';
import { QuotedReply } from '@/components/chat/QuotedReply';

interface Props {
  message: ChatMessage;
  isMine: boolean;
  status: MessageStatus;
  onRetry: () => void;
  onPress: (uri: string) => void;
  onLongPress?: () => void;
  currentUserId?: string;
}

function clampAspect(w?: number, h?: number): number {
  if (!w || !h) return 4 / 3;
  return Math.min(1.6, Math.max(0.6, w / h));
}

const StatusTicks = React.memo<{ status: MessageStatus }>(({ status }) => {
  if (status === 'sending') return <Text style={styles_ticks.tick}>🕐</Text>;
  if (status === 'seen') return <Text style={[styles_ticks.tick, { color: '#34B7F1' }]}>✓✓</Text>;
  if (status === 'delivered') return <Text style={styles_ticks.tick}>✓✓</Text>;
  return <Text style={styles_ticks.tick}>✓</Text>; // sent
});

const styles_ticks = StyleSheet.create({
  tick: { fontSize: 10, marginLeft: 6, color: 'rgba(255,255,255,0.85)' },
});

function formatTimestamp(ts: any): string {
  if (!ts?.toDate) return '';
  const date = ts.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ImageBubble({ message, isMine, status, onRetry, onPress, onLongPress, currentUserId }: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const isLocal = !message.imageUrl && !!message.localImageUri;
  const uri = message.localImageUri ?? message.imageUrl;
  const isUploading =
    !message.uploadFailed && message.uploadProgress != null && message.uploadProgress < 1;

  if (!uri) return null;

  return (
    <View style={styles.column}>
      {/* Quoted reply preview — sits above the image, same as Flutter's
          _QuotedReply inside a Column wrapping the image bubble. */}
      <View style={styles.quotedWrap}>
        <QuotedReply message={message} isMine={isMine} colors={colors} currentUserId={currentUserId} />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={message.uploadFailed ? onRetry : () => onPress(uri)}
        onLongPress={onLongPress}
        style={[styles.wrap, { aspectRatio: clampAspect(message.imageWidth, message.imageHeight) }]}
      >
        <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />

        {isUploading && (
          <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
            <ActivityIndicator color="#fff" />
          </View>
        )}

        {message.uploadFailed && (
          <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
            <Text style={styles.failedText}>⚠️ Tap to retry</Text>
          </View>
        )}

        <View style={styles.timeTick}>
          <Text style={styles.time}>{formatTimestamp(message.createdAt)}</Text>
          {isMine && <StatusTicks status={status} />}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => {
  return StyleSheet.create({
    column: {
      maxWidth: 220,
    },
    quotedWrap: {
      width: 220,
    },
    wrap: {
      width: 220,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#e5e7eb',
    },
    overlay: { backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    failedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    timeTick: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    time: {
      fontSize: 10,
      color: '#fff',
    },
  });
};