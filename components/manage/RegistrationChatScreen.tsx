import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useRegistrationChat, ExtractedRegistration } from '@/hooks/useRegistrationChat';
import { useTheme } from '@/providers/ThemeProvider';
import { useRouter } from 'expo-router';

interface Props {
  categoryNames: string[];
  onProfileExtracted: (profile: ExtractedRegistration) => void;
}

// ─── TypingDots ────────────────────────────────────────────────────────────
const TypingDots: React.FC<{ color: string }> = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
      },
    ],
  });

  return (
    <View style={styles.typingDotsRow}>
      <Animated.View style={[styles.typingDot, dotStyle(dot1), { backgroundColor: color }]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot2), { backgroundColor: color }]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot3), { backgroundColor: color }]} />
    </View>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────
export const RegistrationChatScreen: React.FC<Props> = ({
  categoryNames,
  onProfileExtracted,
}) => {
  const headerHeight = useHeaderHeight();
  const [isHandingOff, setIsHandingOff] = useState(false);
  const { messages, isLoading, isComplete, sendMessage } = useRegistrationChat(
    categoryNames,
    (profile) => {
      setIsHandingOff(true);
      setTimeout(() => onProfileExtracted(profile), 1200);
    }
  );
  const { theme } = useTheme();
  const colors = theme.colors;

  const router = useRouter();

  // Dynamic styles
  const dynamicStyles = useMemo(() => createStyles(colors), [colors]);

  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleBack = () => router.back();

  const handleSend = () => {
    if (!input.trim() || isLoading || isComplete) return;
    sendMessage(input);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const displayData = isLoading && !isHandingOff
    ? [...messages, { role: 'assistant' as const, text: '__typing__' }]
    : messages;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: '#fff' }]}>
                  <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ai Assistant</Text>
              </View>
      <FlatList
        ref={listRef}
        data={displayData}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          if (item.text === '__typing__') {
            return (
              <View style={[dynamicStyles.bubbleAssistant, styles.typingBubble]}>
                <TypingDots color={colors.primary} />
              </View>
            );
          }
          const isUser = item.role === 'user';
          return (
            <View style={isUser ? dynamicStyles.bubbleUser : dynamicStyles.bubbleAssistant}>
              <Text style={isUser ? dynamicStyles.bubbleTextUser : dynamicStyles.bubbleTextAssistant}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      {isHandingOff ? (
        <View style={styles.handoffRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.handoffText, { color: colors.primary }]}>
            Setting up your profile...
          </Text>
        </View>
      ) : (
        !isComplete && (
          <View style={[styles.inputRow, { borderTopColor: colors.border || '#eee' }]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                }
              ]}
              value={input}
              onChangeText={setInput}
              placeholder="Type your answer..."
              placeholderTextColor={colors.textSecondary || '#999'}
              editable={!isLoading}
              multiline
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isLoading}
              style={styles.sendButton}
            >
              <Ionicons
                name="send"
                size={20}
                color={isLoading ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>
          </View>
        )
      )}
    </KeyboardAvoidingView>
  );
};

// ─── Static styles (layout only) ────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  messageList: { padding: 16 },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 16 },
  typingDotsRow: { flexDirection: 'row', gap: 4 },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
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
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
  handoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  handoffText: { fontSize: 14, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: { marginLeft: 8, padding: 8, paddingBottom: 10 },
});

// ─── Dynamic styles factory ─────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    bubbleUser: {
      backgroundColor: colors.primary,
      alignSelf: 'flex-end',
      maxWidth: '78%',
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginVertical: 6,
    },
    bubbleAssistant: {
      backgroundColor: colors.surface || '#F1F1F4',
      alignSelf: 'flex-start',
      maxWidth: '78%',
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginVertical: 6,
    },
    bubbleTextUser: {
      color: '#fff',
      fontSize: 15,
      lineHeight: 21,
    },
    bubbleTextAssistant: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },
  });