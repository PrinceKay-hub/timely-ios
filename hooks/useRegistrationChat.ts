import { useState, useCallback, useRef } from 'react';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ExtractedRegistration {
  name: string;
  category: string;
  description: string;
  services: Array<{ name: string; price: number; duration: number }>;
  workingDays: string[];
  workingHours: { startHour: number; startMinute: number; endHour: number; endMinute: number };
  amenities: string[];
}

const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VALID_AMENITIES = [
  'Free WiFi',
  'Parking',
  'Mobile Money Payment',
  'DSTV',
  'Wheelchair Access',
  'Refreshment',
  'Air Conditioned',
];

const MAX_RETRIES = 3;
const MAX_USER_TURNS = 8; // safety net: force extraction if the model won't wrap up

const buildSystemPrompt = (categoryNames: string[]) => `
You are a friendly onboarding assistant for a service marketplace app. Your
job is to gather enough information through natural conversation to fill out
a complete business profile.

You need to collect:
- name: the business name
- category: MUST be exactly one of these options: ${categoryNames.join(', ')}
- description: enough detail to write a professional 2-3 sentence description
- services: at least one service the business offers, each with a name, a
  price (in Ghana Cedis, numeric), and a duration in minutes
- workingDays: which days they're open, using only these abbreviations: ${VALID_DAYS.join(', ')}
- workingHours: opening and closing time
- amenities: any that apply from this list (it's fine if none apply): ${VALID_AMENITIES.join(', ')}

Rules:
- Ask ONE short, friendly question at a time (under 25 words).
- Don't ask about something the user has already told you, even if mentioned in passing.
- If the user gives multiple pieces of info in one message, acknowledge all of it and move to the next missing piece.
- For category, gently map what the user describes to the closest valid option — don't just ask them to pick from a list, infer it naturally and confirm.
- Keep the whole conversation under 8 questions total.
- Once you have name, category, description, at least one service with price+duration, working days, and working hours, STOP asking questions, even if amenities are unknown (default to empty list).
- When done, respond with ONLY this exact format, nothing else before or after:

READY|{"name": "...", "category": "...", "description": "...", "services": [{"name": "...", "price": 0, "duration": 0}], "workingDays": ["Mon"], "workingHours": {"startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0}, "amenities": []}

- Never include the READY marker until you actually have the minimum required fields.
- Keep your tone warm and conversational, like a helpful friend setting things up for you, not a form.
`;

const callGeminiChat = async (
  history: ChatMessage[],
  systemPrompt: string,
  attempt = 0
): Promise<string> => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No candidates returned');
    return text as string;
  }

  const errorBody = await response.json().catch(() => null);
  const quotaId = errorBody?.error?.details?.find((d: any) =>
    d['@type']?.includes('QuotaFailure')
  )?.violations?.[0]?.quotaId;

  if (response.status === 429 && quotaId?.includes('PerDay')) {
    throw new Error('DAILY_QUOTA_EXCEEDED');
  }

  if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
    const delayMs = 1000 * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return callGeminiChat(history, systemPrompt, attempt + 1);
  }

  throw new Error(`Gemini failed: ${response.status} ${JSON.stringify(errorBody)}`);
};

const callGroqChat = async (history: ChatMessage[], systemPrompt: string): Promise<string> => {
  const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    })),
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages }),
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

type TurnResult =
  | { isComplete: false; question: string }
  | { isComplete: true; profile: ExtractedRegistration };

const sanitizeProfile = (
  raw: any,
  categoryNames: string[]
): ExtractedRegistration => {
  // Fuzzy-match category against the real list rather than trusting
  // the model's exact string — case-insensitive substring match,
  // falling back to the first category if nothing matches at all.
  const rawCategory = String(raw.category || '').toLowerCase().trim();
  const matchedCategory =
    categoryNames.find((c) => c.toLowerCase() === rawCategory) ||
    categoryNames.find(
      (c) => c.toLowerCase().includes(rawCategory) || rawCategory.includes(c.toLowerCase())
    ) ||
    categoryNames[0] ||
    '';

  const services = Array.isArray(raw.services)
    ? raw.services
        .map((s: any) => ({
          name: String(s?.name || '').trim(),
          price: Number(s?.price),
          duration: Number(s?.duration),
        }))
        .filter((s: any) => s.name && !isNaN(s.price) && s.price > 0 && !isNaN(s.duration) && s.duration > 0)
    : [];

  const workingDays = Array.isArray(raw.workingDays)
    ? raw.workingDays.filter((d: any) => VALID_DAYS.includes(d))
    : [];

  const amenities = Array.isArray(raw.amenities)
    ? raw.amenities.filter((a: any) => VALID_AMENITIES.includes(a))
    : [];

  const wh = raw.workingHours || {};
  const workingHours = {
    startHour: Number.isInteger(wh.startHour) ? wh.startHour : 9,
    startMinute: Number.isInteger(wh.startMinute) ? wh.startMinute : 0,
    endHour: Number.isInteger(wh.endHour) ? wh.endHour : 17,
    endMinute: Number.isInteger(wh.endMinute) ? wh.endMinute : 0,
  };

  return {
    name: String(raw.name || '').trim(),
    category: matchedCategory,
    description: String(raw.description || '').trim(),
    services,
    workingDays,
    workingHours,
    amenities,
  };
};

const parseResponse = (raw: string, categoryNames: string[]): TurnResult => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('READY|')) {
    const jsonPart = trimmed.slice('READY|'.length).trim();
    try {
      const parsed = JSON.parse(jsonPart);
      return { isComplete: true, profile: sanitizeProfile(parsed, categoryNames) };
    } catch (e) {
      console.warn('Failed to parse READY payload:', e);
      return {
        isComplete: false,
        question: "Sorry, could you repeat that last bit? I didn't quite catch it.",
      };
    }
  }
  return { isComplete: false, question: trimmed };
};

/**
 * Manages the full-registration onboarding conversation. Collects name,
 * category, description, services/pricing, working days/hours, and
 * amenities. Location and photos are intentionally excluded — those need
 * their own native pickers and aren't a good fit for free text.
 *
 * @param categoryNames - the real, current list of valid categories
 *   (fetch from useHomeStore before opening this chat, so the AI's output
 *   can be constrained and fuzzy-matched against actual options).
 */
export const useRegistrationChat = (
  categoryNames: string[],
  onComplete: (profile: ExtractedRegistration) => void
) => {
  const systemPrompt = useRef(buildSystemPrompt(categoryNames)).current;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "Hi! Let's get your business set up. What's it called, and what kind of service do you offer?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const userTurnCount = useRef(0);

  const forceExtraction = useCallback(
    async (history: ChatMessage[]) => {
      const forcePrompt: ChatMessage = {
        role: 'user',
        text:
          "Please give me your best guess for the READY JSON now, using sensible defaults for anything I haven't told you.",
      };
      const finalHistory = [...history, forcePrompt];
      let raw: string;
      try {
        raw = await callGeminiChat(finalHistory, systemPrompt);
      } catch (e) {
        raw = await callGroqChat(finalHistory, systemPrompt);
      }
      return parseResponse(raw, categoryNames);
    },
    [categoryNames, systemPrompt]
  );

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading || isComplete) return;

      const updatedHistory = [...messages, { role: 'user' as ChatRole, text: trimmed }];
      setMessages(updatedHistory);
      setIsLoading(true);
      userTurnCount.current += 1;

      try {
        let raw: string;
        try {
          raw = await callGeminiChat(updatedHistory, systemPrompt);
        } catch (e) {
          console.warn('Gemini chat failed, falling back to Groq:', e);
          raw = await callGroqChat(updatedHistory, systemPrompt);
        }

        let result = parseResponse(raw, categoryNames);

        // Safety net: if the model is still asking questions well past a
        // reasonable point, force a final extraction instead of looping
        // the user forever.
        if (!result.isComplete && userTurnCount.current >= MAX_USER_TURNS) {
          result = await forceExtraction(updatedHistory);
        }

        if (result.isComplete) {
          setIsComplete(true);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: "Perfect, I've got everything I need! Setting up your profile...",
            },
          ]);
          onComplete(result.profile);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', text: result.question }]);
        }
      } catch (e) {
        console.error('All providers failed:', e);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: "Sorry, I'm having trouble right now. Mind trying that again?",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isComplete, categoryNames, systemPrompt, forceExtraction, onComplete]
  );

  return { messages, isLoading, isComplete, sendMessage };
};
