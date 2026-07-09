import { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useColorScheme } from 'react-native';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  MainTabs: undefined;
};

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  illustration: string;
}

const data: OnboardingItem[] = [
  {
    id: '1',
    title: 'Discover Top Salons',
    description: 'Find the best hair salons, barbershops, and beauty studios near you with verified reviews and ratings.',
    icon: 'search',
    color: '#8B5CF6',
    illustration: 'search',
  },
  {
    id: '2',
    title: 'Book Appointments',
    description: 'Schedule your appointments instantly with real-time availability. No more waiting on calls or uncertain bookings.',
    icon: 'calendar',
    color: '#06B6D4',
    illustration: 'calendar',
  },
  {
    id: '3',
    title: 'Expert Stylists',
    description: 'Choose from experienced professionals, view their portfolios, and read authentic customer reviews.',
    icon: 'people',
    color: '#EC4899',
    illustration: 'stylist',
  },
  {
    id: '4',
    title: 'Get Started',
    description: 'Your perfect look is just a tap away. Join thousands of satisfied customers today!',
    icon: 'star',
    color: '#F59E0B',
    illustration: 'success',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const colorScheme = useColorScheme();
  const isDark = theme.dark;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = (index: number) => {
    flatListRef.current?.scrollToIndex({ index });
  };

  const handleNext = () => {
    if (currentIndex < data.length - 1) {
      scrollTo(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    scrollTo(data.length - 1);
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/AuthWrapper');
  };

  const renderItem = ({ item, index }: { item: OnboardingItem; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
    });

    return (
      <View style={[styles.slide, { width }]}>
        <Animated.View style={[styles.illustrationContainer, { transform: [{ scale }], opacity }]}>
          <View style={[styles.circleBackground, { backgroundColor: item.color + '20' }]}>
            <View style={[styles.mainIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={70} color="white" />
            </View>
            {item.illustration === 'search' && (
              <>
                <Ionicons name="location" size={24} color={item.color} style={[styles.floating, { top: 30, left: 40 }]} />
                <Ionicons name="star" size={24} color={item.color} style={[styles.floating, { bottom: 50, right: 40 }]} />
              </>
            )}
          </View>
        </Animated.View>
        <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {currentIndex < data.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
      />

      <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
        <View style={styles.indicatorContainer}>
          {data.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const backgroundColor = scrollX.interpolate({
              inputRange,
              outputRange: [colors.border || '#D1D5DB', data[i].color, colors.border || '#D1D5DB'],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, backgroundColor }]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: data[currentIndex].color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === data.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    skipButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
    },
    skipText: {
      fontSize: 16,
      fontWeight: '600',
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },
    illustrationContainer: {
      marginBottom: 40,
    },
    circleBackground: {
      width: 280,
      height: 280,
      borderRadius: 140,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainIcon: {
      width: 140,
      height: 140,
      borderRadius: 70,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 30,
      elevation: 10,
    },
    floating: {
      position: 'absolute',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
    },
    description: {
      fontSize: 16,
      color: colors.textSecondary || '#6B7280',
      textAlign: 'center',
      lineHeight: 24,
    },
    bottomContainer: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    indicatorContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 30,
    },
    dot: {
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 30,
    },
    nextButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      marginRight: 8,
    },
  });