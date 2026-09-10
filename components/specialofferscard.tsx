import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSharedValue } from 'react-native-reanimated';
import { CarouselDots } from './CarouselDots';
import {Carousel} from 'react-native-reanimated-carousel';
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

export const SpecialOffersCard: React.FC<SpecialOffersCardProps> = ({ user }) => {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useHomeStore();
  const { status, offers, subscribe, unsubscribe } = useOffersStore();
  const progress = useSharedValue<number>(0);

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
    }),
    [navigation, user, showSnackbar],
  );

  if (status === 'loading' || status === 'idle') return <ShimmerBanner />;
  if (status === 'error') return null;

  return (
    <View style={styles.wrapper}>
      <Carousel
        width={SCREEN_WIDTH}   
        height={CAROUSEL_HEIGHT}
        style={{ width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT }}
        data={offers}
        loop={offers.length > 1}
        autoPlay={offers.length > 1}
        autoPlayInterval={10000}
        scrollAnimationDuration={2500}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: 50,
        }}
        onProgressChange={(_, absoluteProgress) => {
          progress.value = absoluteProgress;
        }}
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

      {offers.length > 1 && <CarouselDots progress={progress} length={offers.length} />}
    </View>
  );
};


const createStyles = (theme: any) => {
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  slide: {
  width: ITEM_WIDTH,
  height: CAROUSEL_HEIGHT,
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

  