
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHomeStore } from '@/stores/home';  

interface SpecialOffersCardProps {
  user: Record<string, any>;
}

const PURPLE = '#8B5CF6';

export const SpecialOffersCard: React.FC<SpecialOffersCardProps> = ({ user }) => {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useHomeStore();

  const handleRegister = () => {
    if (user?.isEmailVerified === false) {
      showSnackbar('Email not verified. Go to Profile Screen', 'error');
    } else {
      navigation.navigate('manage/registration/index', { userId: user?.uid });
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        {/* Decorative background blob */}
        <View style={styles.blobLarge} />
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>FREE!!!</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Are you a Service Provider?</Text>
          </View>

          <Text style={styles.headline}>
            Register your service now for free!!!
          </Text>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>Register Now</Text>
            <Text style={styles.arrow}> →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  card: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  blobLarge: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 110,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  freeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
  freeBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    padding: 20,
    gap: 10,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
  },
  headline: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
    marginBottom: 4,
  },
  registerBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  registerBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  arrow: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});