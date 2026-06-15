import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
import { Tabs } from 'react-native-collapsible-tab-view';
import { useAuthStore } from '@/stores/auth';
import { useFavoriteStore } from '@/stores/favorite';
import { useReviewStore } from '@/stores/reviewService';
import WorkingHoursDisplay from '@/components/WorkingHoursDisplay';
import { useServiceDataStore } from '@/stores/serviceData';
import { Snackbar } from '@/components/Snackbar';
import { useEffect } from 'react';
import { PortfolioTabContent } from '@/components/portfolio/PortfolioTab';
import GalleryWidget from '@/components/Gallerywidget';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;
const PURPLE = '#8B5CF6';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { favoriteIds, toggleFavorite } = useFavoriteStore();
  const { reviews, fetchReviews, isLoading: reviewsLoading } = useReviewStore();
  const { currentService, isLoading, error, fetchServiceById } = useServiceDataStore();

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
  React.useEffect(() => {
    if (id) fetchServiceById(id as string);
  }, [id]);


  // Fetch reviews when providerId is available
  React.useEffect(() => {
    if (currentService?.providerId) {
      fetchReviews(currentService.providerId);
    }
  }, [currentService]);

  const isFavorite = favoriteIds.has(currentService?.id || '');


  // Load reviews
  React.useEffect(() => {
    if (currentService?.providerId) {
      fetchReviews(currentService.providerId);
    }
  }, [currentService]);

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
    const label = encodeURIComponent(currentService.name || 'Destination');

    if (Platform.OS === 'ios') {
      // Try Apple Maps first, fallback to Google Maps app, then web
      const appleMapsUrl = `maps://?daddr=${lat},${lng}&dirflg=d`;
      const googleMapsAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    //  const appleSupported = await Linking.canOpenURL(appleMapsUrl);
    //  if (appleSupported) {
     //   await Linking.openURL(appleMapsUrl);
      //  return;
     // }

      const googleAppSupported = await Linking.canOpenURL(googleMapsAppUrl);
      if (googleAppSupported) {
        await Linking.openURL(googleMapsAppUrl);
        return;
      }

      // Final fallback — always works
      await Linking.openURL(googleMapsWebUrl);

    } else {
      // Android — try Google Maps app first, fallback to web
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
    // Ultimate fallback if everything above fails
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
    })
  };

  // Loading and error states
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
        <TouchableOpacity onPress={() => id && fetchServiceById(id as string)}>
          <Text style={{ color: PURPLE, marginTop: 10 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentService) {
    return (
      <View style={styles.loading}>
        <Text>Service not found</Text>
      </View>
    );
  }

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
            <Image source={{ uri: item }} style={styles.headerImage} />
          </TouchableOpacity>
        )}
        keyExtractor={(_, i) => i.toString()}
      />
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {currentService?.providerId !== user?.uid && (
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? 'red' : 'black'}
              />
            </TouchableOpacity>
          )}
         
           <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="black" />
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

  const renderAbout = () => (
    <Tabs.ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{currentService?.name}</Text>
        </View>
        <View style={styles.categoryChip}>
          <Ionicons name="cut" size={16} color={PURPLE} />
          <Text style={styles.categoryText}>{currentService?.category}</Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={20} color={PURPLE} />
          <Text style={styles.locationText}>{currentService?.location}</Text>
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="gold" />
          <Text style={styles.ratingText}>{currentService?.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({currentService?.totalReviews} reviews)</Text>
          {currentService?.providerId !== user?.uid && (
            <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
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
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{currentService?.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services & Pricing</Text>
        {currentService?.services.map((s, i) => (
          <View key={i} style={styles.serviceItem}>
            <View style={styles.serviceIcon}>
              <Ionicons name="cut" size={20} color={PURPLE} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.serviceDuration}>{s.duration} mins</Text>
            </View>
            <Text style={styles.servicePrice}>₵{s.price}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Hours</Text>
        {currentService && <WorkingHoursDisplay service={currentService} />}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenitiesWrap}>
          {currentService?.amenities.map((a, i) => (
            <View key={i} style={styles.amenityChip}>
              <Ionicons name="checkmark-circle" size={16} color={PURPLE} />
              <Text style={styles.amenityText}>{a}</Text>
            </View>
          ))}
        </View>
      </View>
    </Tabs.ScrollView>
  );

  const renderReviews = () => (
    <Tabs.ScrollView style={styles.tabContent}>
      <View style={styles.reviewSummary}>
        <Text style={styles.ratingLarge}>{currentService?.rating.toFixed(1)}</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Ionicons key={i} name="star" size={20} color="gold" />
          ))}
        </View>
        <Text style={styles.reviewBaseText}>Based on {currentService?.totalReviews} reviews</Text>
      </View>

      {reviewsLoading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {reviews.length === 0 && 
      <View style={styles.center}>
        <Ionicons name="images-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
        <Text style={styles.emptyText}>
          Engage with service to write review.
        </Text>
      </View>}
      {reviews.map((review, i) => (
        <View key={i} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewerAvatar}>
              <Text style={styles.reviewerInitial}>{review.userName?.[0]}</Text>
            </View>
            <View style={styles.reviewerInfo}>
              <Text style={styles.reviewerName}>{review.userName}</Text>
              <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
            </View>
            <View style={styles.reviewRating}>
              <Ionicons name="star" size={14} color="gold" />
              <Text style={styles.reviewRatingText}>{review.rating}</Text>
            </View>
          </View>
          <Text style={styles.reviewText}>{review.comment}</Text>
        </View>
      ))}
    </Tabs.ScrollView>
  );


  return (
    <View style={styles.container}>
      <Tabs.Container
        renderHeader={renderHeader}
        headerHeight={HEADER_HEIGHT}
        initialTabName="About"
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
        duration={3000} // or Infinity if you want to control dismissal manually
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

// Helper component for quick actions
const QuickAction = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <Ionicons name={icon as any} size={24} color={PURPLE} />
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { backgroundColor: 'white' },
  header: { width, height: HEADER_HEIGHT, backgroundColor: '#ddd' },
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
  },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
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
    backgroundColor: PURPLE,
    width: 16,
  },
  tabBar: { backgroundColor: 'white' },
  tabContent: { backgroundColor: '#f5f5f5', padding: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
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
    backgroundColor: '#EDE9FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  categoryText: { color: PURPLE, fontWeight: '600', fontSize: 13, marginLeft: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  locationText: { color: 'gray', fontSize: 14, marginLeft: 8, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ratingText: { fontWeight: 'bold', marginLeft: 4 },
  reviewCount: { color: 'gray', fontSize: 12, marginLeft: 4 },
  bookButton: {
    marginLeft: 'auto',
    backgroundColor: PURPLE,
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
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionLabel: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  description: { color: 'gray', fontSize: 14, lineHeight: 22 },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  serviceIcon: {
    backgroundColor: '#EDE9FE',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontWeight: '600', fontSize: 15 },
  serviceDuration: { color: 'gray', fontSize: 12 },
  servicePrice: { fontWeight: 'bold', fontSize: 16, color: PURPLE },
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityText: { color: PURPLE, fontSize: 12, fontWeight: '500', marginLeft: 4 },
  reviewSummary: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLarge: { fontSize: 48, fontWeight: 'bold', color: 'white' },
  starRow: { flexDirection: 'row', marginVertical: 8 },
  reviewBaseText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: { fontSize: 20, fontWeight: 'bold', color: PURPLE },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontWeight: 'bold', fontSize: 15 },
  reviewDate: { color: 'gray', fontSize: 12 },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    color: '#666',
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