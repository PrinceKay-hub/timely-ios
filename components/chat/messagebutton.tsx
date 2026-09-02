import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useTheme } from '@/providers/ThemeProvider';

interface MessageButtonProps {
  otherUserId: string;
  otherUserName?: string;
  otherUserPhoto?: string;
  // Optional: pass these if the button is launched from a service page,
  // just to give the conversation some starting context. Not required —
  // e.g. a "Message" button on a provider's profile with no specific
  // service in mind can omit both.
  serviceId?: string;
  serviceName?: string;
  label?: string; // defaults to "Message"
}

// Drop this into any screen where a client can reach out to a provider
// (or vice versa) — provider profile, service detail page, search
// results, etc. It's not tied to a booking: pressing it always opens
// (or creates) the single ongoing conversation between these two people.
//
// NOTE: otherUserId is assumed to be the provider (getOrCreateChat
// defaults providerId to otherUserId when not passed explicitly) — this
// drives which name shows in the chat header/list for each side. If you
// ever use this button the other way around (a provider messaging a
// client), pass providerId explicitly to override that default.
//
// Example, on a provider profile screen:
//   <MessageButton otherUserId={provider.id} otherUserName={provider.displayName} />
//
// Example, from a service page, for a little extra context:
//   <MessageButton
//     otherUserId={service.providerId}
//     otherUserName={service.providerName}
//     serviceId={service.id}
//     serviceName={service.name}
//   />
export function MessageButto({
  otherUserId,
  otherUserName,
  otherUserPhoto,
  serviceId,
  serviceName,
  label = 'Message',
}: MessageButtonProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);

  const handlePress = useCallback(async () => {
    if (!user?.uid) {
      console.warn('MessageButton pressed with no authenticated user');
      return;
    }
    setLoading(true);
    try {
      const chatId = await useChatStore.getState().getOrCreateChat({
        currentUserId: user.uid,
        currentUserName: profile?.displayName || user.displayName,
        currentUserPhoto: profile?.photoURL || user.photoURL,
        otherUserId,
        otherUserName,
        otherUserPhoto,
        serviceId,
        serviceName,
      });
      router.push(`/chats/${chatId}`);
    } catch (error) {
      console.error('Failed to open chat:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, profile?.displayName, profile?.photoURL, otherUserId, otherUserName, otherUserPhoto, serviceId, serviceName]);

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: theme.colors.primary }]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>💬  {label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});