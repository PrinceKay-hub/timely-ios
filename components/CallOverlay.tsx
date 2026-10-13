import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { auth, db } from '@/firebase';
import {
  answerIncoming,
  declineIncoming,
  hangUp,
  isSpeakerAvailable,
  toggleMute,
  toggleSpeaker,
} from '@/services/callService';
import { setCall, useCallStore } from '@/stores/callStore';

const C = {
  bg: '#0E2321',
  ring: '#2F5F59',
  avatar: '#1D3C38',
  text: '#F1F6F5',
  muted: '#8FB0AB',
  control: '#1D3C38',
  controlOn: '#F1F6F5',
  controlOnIcon: '#0E2321',
  end: '#E5484D',
  accept: '#2FB67C',
};

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function useElapsed(connectedAt: number | null) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!connectedAt) {
      setSeconds(0);
      return;
    }
    const tick = () => setSeconds(Math.floor((Date.now() - connectedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [connectedAt]);
  return seconds;
}

function Avatar({ name, pulsing }: { name: string; pulsing: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulsing) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.avatarWrap}>
      <Animated.View style={[styles.pulseRing, { opacity, transform: [{ scale }] }]} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  active = false,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  tone?: 'default' | 'end' | 'accept';
}) {
  const bg =
    tone === 'end' ? C.end : tone === 'accept' ? C.accept : active ? C.controlOn : C.control;
  const fg = tone === 'default' && active ? C.controlOnIcon : C.text;
  return (
    <View style={styles.buttonCol}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: bg },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons
          name={icon}
          size={28}
          color={fg}
          style={tone === 'end' ? { transform: [{ rotate: '135deg' }] } : undefined}
        />
      </Pressable>
      <Text style={styles.buttonLabel}>{label}</Text>
    </View>
  );
}

export function CallOverlay() {
  const insets = useSafeAreaInsets();
  const incoming = useCallStore((s) => s.incoming);
  const phase = useCallStore((s) => s.phase);
  const peerName = useCallStore((s) => s.peerName);
  const isIncoming = useCallStore((s) => s.isIncoming);
  const muted = useCallStore((s) => s.muted);
  const speakerOn = useCallStore((s) => s.speakerOn);
  const connectedAt = useCallStore((s) => s.connectedAt);
  const error = useCallStore((s) => s.error);
  const elapsed = useElapsed(connectedAt);

  const callId = incoming?.callId;
  const callerName = incoming?.callerName;

  useEffect(() => {
    if (error) Toast.show({ type: 'error', text1: error });
  }, [error]);

  // Close the incoming screen if the caller gives up
  useEffect(() => {
    if (!callId) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await auth.authStateReady(); // matters when opened from a killed app
      if (cancelled) return;
      unsub = onSnapshot(
        doc(db, 'calls', callId),
        (snap) => {
          if (snap.data()?.status !== 'ringing') {
            setCall({ incoming: null });
            Toast.show({
              type: 'info',
              text1: `Missed call from ${callerName ?? 'someone'}`,
            });
          }
        },
        () => setCall({ incoming: null }),
      );
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [callId, callerName]);

  const inCall =
    phase === 'connecting' || phase === 'ringing' || phase === 'connected';
  if (!inCall && !incoming) return null;

  const screenPadding = {
    paddingTop: insets.top + 48,
    paddingBottom: insets.bottom + 32,
  };

  // ---- Incoming, not yet answered ----
  if (!inCall && incoming) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={[styles.screen, screenPadding]}>
          <View style={styles.top}>
            <Avatar name={incoming.callerName} pulsing />
            <Text style={styles.name} numberOfLines={1}>
              {incoming.callerName}
            </Text>
            <Text style={styles.status}>Incoming call</Text>
          </View>
          <View style={styles.controls}>
            <RoundButton
              icon="call"
              label="Decline"
              tone="end"
              onPress={() => void declineIncoming()}
            />
            <RoundButton
              icon="call"
              label="Answer"
              tone="accept"
              onPress={() => void answerIncoming()}
            />
          </View>
        </View>
      </Modal>
    );
  }

  // ---- In a call ----
  const name = peerName ?? 'Call';
  const status =
    phase === 'connected'
      ? formatDuration(elapsed)
      : phase === 'ringing'
        ? 'Ringing…'
        : isIncoming
          ? 'Connecting…'
          : 'Calling…';

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.screen, screenPadding]}>
        <View style={styles.top}>
          <Avatar name={name} pulsing={phase !== 'connected'} />
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.status} accessibilityLiveRegion="polite">
            {status}
          </Text>
        </View>

        <View style={styles.controls}>
          <RoundButton
            icon={muted ? 'mic-off' : 'mic'}
            label={muted ? 'Unmute' : 'Mute'}
            active={muted}
            onPress={toggleMute}
          />
          <RoundButton
            icon="call"
            label="End call"
            tone="end"
            onPress={() => void hangUp()}
          />
          {isSpeakerAvailable() && (
            <RoundButton
              icon={speakerOn ? 'volume-high' : 'volume-medium'}
              label="Speaker"
              active={speakerOn}
              onPress={toggleSpeaker}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const AVATAR = 132;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  top: { alignItems: 'center', width: '100%' },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: C.ring,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: C.avatar,
    borderWidth: 2,
    borderColor: C.ring,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.text, fontSize: 56, fontWeight: '600' },
  name: { color: C.text, fontSize: 30, fontWeight: '600', textAlign: 'center' },
  status: {
    color: C.muted,
    fontSize: 18,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    width: '100%',
  },
  buttonCol: { alignItems: 'center', gap: 10, minWidth: 84 },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { color: C.muted, fontSize: 14 },
});