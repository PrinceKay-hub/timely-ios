// components/BackButton.tsx
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  /**
   * Where to go when there's no navigation history to pop.
   * Defaults to the chats list — sensible for chat screens opened
   * from a cold-start notification tap.
   */
  fallback?: Href;
  /** Icon color. Defaults to the current theme's text color via your theme. */
  color?: string;
  /** Optional style override for the TouchableOpacity wrapper. */
  style?: StyleProp<ViewStyle>;
  /** Icon size. Defaults to 24. */
  size?: number;
};

export const BackButton = ({
  fallback = '/(tabs)/home' as Href,
  color = '#fff',
  style,
  size = 24,
}: Props) => {
  const router = useRouter();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Cold boot from notification: no history, so route to fallback.
      // `replace` (not `push`) so this screen is removed from the stack.
      router.replace(fallback);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});