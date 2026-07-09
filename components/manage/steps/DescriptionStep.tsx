import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useTheme } from '@/providers/ThemeProvider';

const MIN_CHARS = 50;
const MAX_CHARS = 500;
const MAX_RETRIES = 3;

export const DescriptionStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const description = currentService?.description || '';
  const serviceName = currentService?.name || '';
  const category = currentService?.category || '';

  const [isLoading, setIsLoading] = useState(false);

  const callGeminiWithRetry = async (attempt = 0): Promise<string> => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    const prompt = `Write a short, professional marketplace description for "${serviceName}" under the "${category}" category. Keep it under 3 sentences.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No candidates returned');
      return text as string;
    }

    const errorBody = await response.json().catch(() => null);
    const quotaId = errorBody?.error?.details?.find(
      (d: any) => d['@type']?.includes('QuotaFailure')
    )?.violations?.[0]?.quotaId;

    if (response.status === 429 && quotaId?.includes('PerDay')) {
      throw new Error('DAILY_QUOTA_EXCEEDED');
    }

    if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
      const delayMs = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return callGeminiWithRetry(attempt + 1);
    }

    throw new Error(`Failed to load text: ${response.status} ${JSON.stringify(errorBody)}`);
  };

  const callGroq = async (): Promise<string> => {
    const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const prompt = `Write a short, professional marketplace description for "${serviceName}" under the "${category}" category. Keep it under 3 sentences.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq failed: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from Groq');
    return content as string;
  };

  const handleSuggestDescription = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Missing info', 'Please enter a Service Name first!');
      return;
    }

    setIsLoading(true);
    try {
      let aiText: string;
      try {
        aiText = await callGeminiWithRetry();
      } catch (e) {
        console.warn('Gemini failed, falling back to Groq:', e);
        aiText = await callGroq();
      }

      const trimmed = aiText.trim();
      const clamped = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;
      updateServiceField('description', clamped);
    } catch (e) {
      console.error('All providers failed:', e);
      Alert.alert('Could not generate description', 'Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name="document-text-outline" size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Describe Your Business</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Tell potential customers about your services and what makes you unique
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.text }]}>Business Description</Text>
          <Text style={[
            styles.charCount,
            description.length >= MIN_CHARS ? styles.charCountValid : { color: colors.textSecondary }
          ]}>
            {description.length}/{MAX_CHARS}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.suggestButton,
            { backgroundColor: colors.primary },
            isLoading && styles.suggestButtonDisabled
          ]}
          onPress={handleSuggestDescription}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="sparkles" size={16} color="white" />
          )}
          <Text style={styles.suggestButtonText}>
            {isLoading ? 'Writing...' : 'Suggest Description'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[
            styles.textArea,
            {
              borderColor: colors.border || '#ddd',
              color: colors.text,
              backgroundColor: colors.surface,
            }
          ]}
          value={description}
          onChangeText={(text) => updateServiceField('description', text)}
          placeholder="Welcome to our salon where we provide exceptional services..."
          placeholderTextColor={colors.textSecondary || '#999'}
          multiline
          maxLength={MAX_CHARS}
          textAlignVertical="top"
        />
        {description.length < MIN_CHARS && (
          <View style={[styles.warning, { backgroundColor: colors.error + '1a' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.error} />
            <Text style={[styles.warningText, { color: colors.error }]}>
              Minimum {MIN_CHARS} characters required ({MIN_CHARS - description.length} more)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    subtitle: { fontSize: 16, marginBottom: 24 },
    card: { borderRadius: 15, padding: 16 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    label: { fontWeight: '600', fontSize: 14 },
    charCount: { fontSize: 12 },
    charCountValid: { color: 'green' },
    suggestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
      alignSelf: 'flex-start',
      gap: 6,
    },
    suggestButtonDisabled: { opacity: 0.6 },
    suggestButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
    textArea: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      minHeight: 120,
    },
    warning: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
    },
    warningText: { fontSize: 12, marginLeft: 8, flex: 1 },
  });