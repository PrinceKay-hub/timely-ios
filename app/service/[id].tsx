import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import { useAuthStore } from '@/stores/auth';
import { useFavoriteStore } from '@/stores/favorite';
import { useReviewStore } from '@/stores/reviewService';
import WorkingHoursDisplay from '@/components/WorkingHoursDisplay';
import { useServiceDataStore } from '@/stores/serviceData';
import { Snackbar } from '@/components/Snackbar';
import { useEffect } from 'react';
import { PortfolioTabContent } from '@/components/portfolio/PortfolioTab';
import GalleryWidget from '@/components/Gallerywidget';
import { useTheme } from '@/providers/ThemeProvider';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { favoriteIds, toggleFavorite } = useFavoriteStore();
  const { reviews, fetchReviews, isLoading: reviewsLoading } = useReviewStore();
  const { currentService, isLoading, error, fetchServiceById } = useServiceDataStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    type: 'error' | 'success' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  };

  // Load service data
  useEffect(() => {
    if (id) fetchServiceById(id as string);
  }, [id]);

  // Fetch reviews when providerId is available
  useEffect(() => {
    if (currentService?.providerId) {
      fetchReviews(currentService.providerId);
    }
  }, [currentService]);

  const isFavorite = favoriteIds.has(currentService?.id || '');

  const handleBack = () => router.back();

  const handleToggleFavorite = () => {
    if (!currentService) return;
    toggleFavorite(currentService.id);
    setSnackbar({
      visible: true,
      message: isFavorite ? 'Removed from favorite' : 'Added to favorite',
      type: isFavorite ? 'error' : 'success',
    });
  };

  const handleShare = async () => {
    if (!currentService) return;
    const url = `https://timelygh.com/service/${currentService.id}`;
    try {
      await Share.share({ message: `Check out my services: ${url}` });
    } catch (error) {
      console.log(error);
    }
  };

  const handleCall = async () => {
    if (!currentService?.number) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    const url = `tel:${currentService.number}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot make a call');
    }
  };

  const handleWhatsApp = async () => {
    if (!currentService?.number) {
      Alert.alert('Error', 'WhatsApp number not available');
      return;
    }
    const trimmedNumber = currentService.number.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${trimmedNumber}&text=Hello!`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature.');
    }
  };

  const handleDirections = async () => {
    if (!currentService?.latitude || !currentService?.longitude) {
      Alert.alert('Error', 'Location not available');
      return;
    }
    setIsLoadingDirections(true);
    try {
      const lat = currentService.latitude;
      const lng = currentService.longitude;
      if (Platform.OS === 'ios') {
        const googleMapsAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
        const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        const googleAppSupported = await Linking.canOpenURL(googleMapsAppUrl);
        if (googleAppSupported) {
          await Linking.openURL(googleMapsAppUrl);
          return;
        }
        await Linking.openURL(googleMapsWebUrl);
      } else {
        const googleMapsAppUrl = `google.navigation:q=${lat},${lng}&mode=d`;
        const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        const supported = await Linking.canOpenURL(googleMapsAppUrl);
        if (supported) {
          await Linking.openURL(googleMapsAppUrl);
        } else {
          await Linking.openURL(googleMapsWebUrl);
        }
      }
    } catch (error) {
      const lat = currentService.latitude;
      const lng = currentService.longitude;
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      ).catch(() => Alert.alert('Error', 'Could not open maps application'));
    } finally {
      setIsLoadingDirections(false);
    }
  };

  const handleBook = () => {
    if (!user?.emailVerified) {
      Alert.alert('Email not verified', 'Please verify your email in the Profile screen to book.');
      return;
    }
    router.push({
      pathname: '/booking/[id]',
      params: { id: currentService?.id }
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60 && minutes % 60 === 0) {
      return `${minutes / 60} hr`;
    } else if (minutes > 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${minutes} mins`;
  };

  // ── Loading and error states ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.error || 'red' }}>Error: {error}</Text>
        <TouchableOpacity onPress={() => id && fetchServiceById(id as string)}>
          <Text style={{ color: colors.primary, marginTop: 10 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentService) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.text }}>Service not found</Text>
      </View>
    );
  }

  // ─── QuickAction helper (nested to access styles) ─────────────────────────
  const QuickAction = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: colors.card, shadowColor: colors.shadow || '#000' }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={24} color={colors.primary} />
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  // ── Render Header ─────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <FlatList
        data={currentService?.images || []}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentImageIndex(index);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              setGalleryIndex(currentImageIndex);
              setGalleryVisible(true);
            }}
          >
            <Image 
            source={{ uri: item }} 
            style={styles.headerImage} 
            contentFit="cover"
            transition={200}
            placeholder={colors.surface || '#f3f4f6'}
            />
          </TouchableOpacity>
        )}
        keyExtractor={(_, i) => i.toString()}
      />
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {currentService?.providerId !== user?.uid && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? 'red' : colors.text}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        {currentService?.images && currentService.images.length > 1 && (
          <View style={styles.indicatorContainer}>
            {currentService.images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  i === currentImageIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // ── Render About Tab ─────────────────────────────────────────────────────
  const renderAbout = () => (
    <Tabs.ScrollView style={[styles.tabContent, { backgroundColor: colors.surface }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.name, { color: colors.text }]}>{currentService?.name}</Text>
        </View>
        <View style={[styles.categoryChip, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
          <Ionicons name="cut" size={16} color={colors.primary} />
          <Text style={[styles.categoryText, { color: colors.primary }]}>{currentService?.category}</Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>{currentService?.district}</Text>
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="gold" />
          <Text style={[styles.ratingText, { color: colors.text }]}>{currentService?.rating.toFixed(1)}</Text>
          <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
            ({currentService?.totalReviews} reviews)
          </Text>
          {currentService?.providerId !== user?.uid && (
            <TouchableOpacity
              style={[styles.bookButton, { backgroundColor: colors.primary }]}
              onPress={handleBook}
            >
              <Text style={styles.bookButtonText}>Book</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.quickActions}>
        <QuickAction icon="call-outline" label="Call" onPress={handleCall} />
        <QuickAction icon="logo-whatsapp" label="WhatsApp" onPress={handleWhatsApp} />
        <QuickAction icon="navigate-outline" label="Direction" onPress={handleDirections} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{currentService?.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Services & Pricing</Text>
        {currentService?.services.map((s, i) => (
          <View key={i} style={[styles.serviceItem, { backgroundColor: colors.surface }]}>
            <View style={[styles.serviceIcon, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
              <Ionicons name="cut" size={20} color={colors.primary} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceName, { color: colors.text }]}>{s.name}</Text>
              <Text style={[styles.serviceDuration, { color: colors.textSecondary }]}>{formatDuration(s.duration)}</Text>
            </View>
            <Text style={[styles.servicePrice, { color: colors.primary }]}>₵{s.price}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Business Hours</Text>
        {currentService && <WorkingHoursDisplay service={currentService} />}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
        <View style={styles.amenitiesWrap}>
          {currentService?.amenities.map((a, i) => (
            <View key={i} style={[styles.amenityChip, { backgroundColor: colors.surface }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={[styles.amenityText, { color: colors.textSecondary }]}>{a}</Text>
            </View>
          ))}
        </View>
      </View>
    </Tabs.ScrollView>
  );

  // ── Render Reviews Tab ────────────────────────────────────────────────────
  const renderReviews = () => (
    <Tabs.ScrollView style={[styles.tabContent, { backgroundColor: colors.surface }]}>
      <View style={[styles.reviewSummary, { backgroundColor: colors.primary }]}>
        <Text style={styles.ratingLarge}>{currentService?.rating.toFixed(1)}</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Ionicons key={i} name="star" size={20} color="gold" />
          ))}
        </View>
        <Text style={styles.reviewBaseText}>Based on {currentService?.totalReviews} reviews</Text>
      </View>

      {reviewsLoading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}

      {reviews.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reviews Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Engage with service to write review.
          </Text>
        </View>
      )}
      {reviews.map((review, i) => (
        <View key={i} style={[styles.reviewCard, { backgroundColor: colors.card }]}>
          <View style={styles.reviewHeader}>
            <View style={[styles.reviewerAvatar, { backgroundColor: colors.surface }]}>
              <Text style={[styles.reviewerInitial, { color: colors.primary }]}>
                {review.userName?.[0]}
              </Text>
            </View>
            <View style={styles.reviewerInfo}>
              <Text style={[styles.reviewerName, { color: colors.text }]}>{review.userName}</Text>
              <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>{formatDate(review.createdAt)}</Text>
            </View>
            <View style={[styles.reviewRating, { backgroundColor: colors.surface }]}>
              <Ionicons name="star" size={14} color="gold" />
              <Text style={[styles.reviewRatingText, { color: colors.text }]}>{review.rating}</Text>
            </View>
          </View>
          <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{review.comment}</Text>
        </View>
      ))}
    </Tabs.ScrollView>
  );

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Tabs.Container
        renderHeader={renderHeader}
        headerHeight={HEADER_HEIGHT}
        initialTabName="About"
        renderTabBar={(props) => (
          <MaterialTabBar
            {...props}
            style={{ backgroundColor: colors.surface }}
            activeColor={colors.primary} 
            inactiveColor={colors.text} 
            indicatorStyle={{ backgroundColor: colors.primary }}
          />
        )}
      >
        <Tabs.Tab name="About" label="About">
          {renderAbout()}
        </Tabs.Tab>
        <Tabs.Tab name="Reviews" label="Reviews">
          {renderReviews()}
        </Tabs.Tab>
        <Tabs.Tab name="Portfolio" label="Portfolio">
          <PortfolioTabContent
            serviceId={currentService.id}
            serviceName={currentService.name}
          />
        </Tabs.Tab>
      </Tabs.Container>
      {isLoadingDirections && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      <Snackbar
        message={snackbar.message}
        visible={snackbar.visible}
        type={snackbar.type}
        onHide={hideSnackbar}
        duration={3000}
      />
      {galleryVisible && (
        <GalleryWidget
          images={currentService?.images}
          index={galleryIndex}
          onClose={() => setGalleryVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Date formatting helper ─────────────────────────────────────────────────
const formatDate = (timestamp: any) => {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    headerContainer: { backgroundColor: colors.card },
    header: { width, height: HEADER_HEIGHT, backgroundColor: colors.surface },
    headerImage: { width, height: HEADER_HEIGHT, resizeMode: 'cover' },
    headerOverlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingTop: 40,
      paddingHorizontal: 16,
    },
    backButton: {
      borderRadius: 20,
      padding: 8,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    headerActions: { flexDirection: 'row', gap: 12 },
    actionButton: {
      borderRadius: 20,
      padding: 8,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    indicatorContainer: {
      position: 'absolute',
      bottom: 16,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    activeIndicator: {
      backgroundColor: colors.primary,
      width: 16,
    },
    tabContent: { padding: 16 },
    card: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 24, fontWeight: 'bold', flex: 1 },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginTop: 12,
    },
    categoryText: { fontWeight: '600', fontSize: 13, marginLeft: 6 },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    locationText: { fontSize: 14, marginLeft: 8, flex: 1 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    ratingText: { fontWeight: 'bold', marginLeft: 4 },
    reviewCount: { fontSize: 12, marginLeft: 4 },
    bookButton: {
      marginLeft: 'auto',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 10,
    },
    bookButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    quickActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    quickAction: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    quickActionLabel: { fontSize: 12, fontWeight: '500', marginTop: 8 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    description: { fontSize: 14, lineHeight: 22 },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    serviceIcon: {
      padding: 8,
      borderRadius: 8,
      marginRight: 12,
    },
    serviceInfo: { flex: 1 },
    serviceName: { fontWeight: '600', fontSize: 15 },
    serviceDuration: { fontSize: 12 },
    servicePrice: { fontWeight: 'bold', fontSize: 16 },
    amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    amenityText: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
    reviewSummary: {
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      marginBottom: 20,
    },
    ratingLarge: { fontSize: 48, fontWeight: 'bold', color: 'white' },
    starRow: { flexDirection: 'row', marginVertical: 8 },
    reviewBaseText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    reviewCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    reviewerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    reviewerInitial: { fontSize: 20, fontWeight: 'bold' },
    reviewerInfo: { flex: 1 },
    reviewerName: { fontWeight: 'bold', fontSize: 15 },
    reviewDate: { fontSize: 12 },
    reviewRating: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    reviewRatingText: { fontWeight: 'bold', marginLeft: 4 },
    reviewText: { fontSize: 14, lineHeight: 20 },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
    },
    center: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
  });