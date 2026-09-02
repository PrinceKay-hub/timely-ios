import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ChatMessage } from '@/stores/chat';

interface Props {
  message: ChatMessage;
  isMine: boolean;
  colors: any;
  currentUserId?: string;
}

// Fixed content width for the quoted-reply row. Bubble's own width is
// otherwise "auto" (shrink-to-fit), and a flex:1 child only gets a real
// width once its parent already has one — with a short main message
// (e.g. "Ok"), the bubble sizes off that short text alone and the reply
// preview never gets a chance to claim more room, so it truncates hard.
// Giving this row an explicit width makes it real content the bubble's
// auto-sizing pass can measure directly, so the bubble (up to its own
// maxWidth: '78%' cap) grows to fit the reply preview too.
const QUOTED_WIDTH = 200;

export function QuotedReply({ message, isMine, colors, currentUserId }: Props) {
  if (!message.replyToId) return null;
  const isImage = message.replyToType === 'image';
  const barColor = isMine ? '#fff' : colors.primary;

  // replyToSenderName is written once, at send time, and stored on the
  // Firestore doc — it can't bake in "You" because the doc is shared
  // between both participants and means something different to each of
  // them. So the "you sent this" label has to be resolved per-viewer,
  // here, by comparing the stored replyToSenderId against whoever is
  // currently looking at the screen.
  const isReplyToMe = !!currentUserId && message.replyToSenderId === currentUserId;
  const senderLabel = isReplyToMe ? 'You' : message.replyToSenderName;

  return (
    <View style={[styles.wrap, { borderLeftColor: barColor, backgroundColor: barColor + '26' }]}>
      <View style={styles.textCol}>
        {!!senderLabel && (
          <Text style={[styles.sender, { color: barColor }]} numberOfLines={1}>
            {senderLabel}
          </Text>
        )}
        <Text
          style={[styles.text, { color: isMine ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}
          numberOfLines={1}
        >
          {isImage ? '📷 Photo' : message.replyToText || 'Message unavailable'}
        </Text>
      </View>
      {isImage && !!message.replyToImageUrl && (
        <Image source={{ uri: message.replyToImageUrl }} style={styles.thumb} contentFit="cover" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: QUOTED_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  // flex:1 now works correctly because `wrap` above has a definite width.
  textCol: { flex: 1, minWidth: 0 },
  sender: { fontSize: 11, fontWeight: '700' },
  text: { fontSize: 12 },
  thumb: { width: 32, height: 32, borderRadius: 4, marginLeft: 6 },
});