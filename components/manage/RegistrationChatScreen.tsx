import React, { useState, useRef } from 'react';
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

const PURPLE = '#8B5CF6';

interface Props {
  categoryNames: string[];
  onProfileExtracted: (profile: ExtractedRegistration) => void;
}

export const RegistrationChatScreen: React.FC<Props> = ({
  categoryNames,
  onProfileExtracted,
}) => {
  const headerHeight = useHeaderHeight();
  const [isHandingOff, setIsHandingOff] = useState(false);
  const { messages, isLoading, isComplete, sendMessage } = useRegistrationChat(
    categoryNames,
    (profile) => {
      // Brief pause so the user actually sees the closing message
      // before the screen transitions away.
      setIsHandingOff(true);
      setTimeout(() => onProfileExtracted(profile), 1200);
    }
  );
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <FlatList
        ref={listRef}
        data={displayData}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          if (item.text === '__typing__') {
            return (
              <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                <TypingDots />
              </View>
            );
          }
          const isUser = item.role === 'user';
          return (
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      {isHandingOff ? (
        <View style={styles.handoffRow}>
          <ActivityIndicator size="small" color={PURPLE} />
          <Text style={styles.handoffText}>Setting up your profile...</Text>
        </View>
      ) : (
        !isComplete && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type your answer..."
              placeholderTextColor="#999"
              editable={!isLoading}
              multiline
              blurOnSubmit={false}
            />
            <TouchableOpacity onPress={handleSend} disabled={isLoading} style={styles.sendButton}>
              <Ionicons name="send" size={20} color={isLoading ? '#ccc' : PURPLE} />
            </TouchableOpacity>
          </View>
        )
      )}
    </KeyboardAvoidingView>
  );
};

const TypingDots: React.FC = () => {
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
      <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  messageList: { padding: 16 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 6,
  },
  bubbleUser: { backgroundColor: PURPLE, alignSelf: 'flex-end' },
  bubbleAssistant: { backgroundColor: '#F1F1F4', alignSelf: 'flex-start' },
  bubbleTextUser: { color: 'white', fontSize: 15, lineHeight: 21 },
  bubbleTextAssistant: { color: '#1a1a1a', fontSize: 15, lineHeight: 21 },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 16 },
  typingDotsRow: { flexDirection: 'row', gap: 4 },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  handoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  handoffText: { color: PURPLE, fontSize: 14, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F1F4',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: { marginLeft: 8, padding: 8, paddingBottom: 10 },
});