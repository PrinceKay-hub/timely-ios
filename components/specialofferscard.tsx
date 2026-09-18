import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSharedValue } from 'react-native-reanimated';
import { CarouselDots } from './CarouselDots';
import { Carousel, type CarouselRef } from 'react-native-reanimated-carousel';
import { useHomeStore } from '@/stores/home';
import { useOffersStore } from '@/stores/offers';
import { OfferModel } from '@/types/offer';
import ShimmerBanner from './ShimmerBanner';
import { Image } from 'expo-image';
import { useTheme } from '@/providers/ThemeProvider';

interface SpecialOffersCardProps {
  user: Record<string, any>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - 20;
const ITEM_WIDTH = CAROUSEL_WIDTH * 0.95;
const CAROUSEL_HEIGHT = 160;
const AUTO_PLAY_MS = 4000;

export const SpecialOffersCard: React.FC<SpecialOffersCardProps> = ({ user }) => {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useHomeStore();
  const { status, offers, subscribe, unsubscribe } = useOffersStore();
  const [activeIndex, setActiveIndex] = useState(0);

  const carouselRef = useRef<CarouselRef>(null);
  const isDragging = useRef(false);           // ref, not state -> no re-renders

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colors = theme.colors;

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);



  const actions: Record<string, () => void> = useMemo(
    () => ({
      registration: () => {
        if (user?.isEmailVerified === false) {
          showSnackbar('Email not verified. Go to Profile Screen', 'error');
        } else {
          navigation.navigate('manage/registration/index', { userId: user?.uid });
        }
      },
      tryon: () => navigation.navigate('hairstyles/virtualtry'),
      hairstyles: () => navigation.navigate('hairstyles/feedscreen'),
      shop: () => navigation.navigate('shop'),
    }),
    [navigation, user, showSnackbar],
  );

  if (status === 'loading' || status === 'idle') return <ShimmerBanner />;
  if (status === 'error') return null;

  return (
    <View style={styles.wrapper}>
      <Carousel
        ref={carouselRef}
        width={ITEM_WIDTH}
        height={CAROUSEL_HEIGHT}
        style={{ width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT }}
        data={offers}
        loop={offers.length > 1}
        autoplay={offers.length > 1} 
        autoplayInterval={5000} 
        scrollAnimationDuration={2000}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: 50,
        }}
        onScrollStart={() => { isDragging.current = true; }}
        onScrollEnd={() => { isDragging.current = false; }}
        onSnapToItem={(index) => setActiveIndex(index)}
        renderItem={({ item }: { item: OfferModel }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={actions[item.key]}
            style={styles.slide}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              placeholder={colors.surface || '#f3f4f6'}
            />
          </TouchableOpacity>
        )}
      />

      {offers.length > 1 && (
        <CarouselDots activeIndex={activeIndex} length={offers.length} />
      )}
    </View>
  );
};


const createStyles = (theme: any) => {
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  slide: {
  width: ITEM_WIDTH,
  height: CAROUSEL_HEIGHT,
  paddingHorizontal: 4,
},
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  dotsContainer: {
    gap: 6,
    marginTop: 8,
  },
  dot: {
    borderRadius: 100,
    backgroundColor: '#D9D9D9',
  },
  activeDot: {
    borderRadius: 100,
    backgroundColor: '#333333',
  },
  });
};

  