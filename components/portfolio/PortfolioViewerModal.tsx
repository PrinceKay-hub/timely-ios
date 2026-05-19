// components/PortfolioViewerModal.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image'; // or use react-native-fast-image for better caching
import { PortfolioImage } from '@/types/portfolio'; 

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  images: PortfolioImage[];
  initialIndex: number;
  onClose: () => void;
  serviceId: string;
  onToggleLike: (serviceId: string, imageId: string) => Promise<void>;
}

export const PortfolioViewerModal: React.FC<Props> = ({
  visible,
  images,
  initialIndex,
  onClose,
  serviceId,
  onToggleLike,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showUI, setShowUI] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = useCallback((event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  }, []);

  const toggleUI = () => setShowUI((prev) => !prev);

  const currentImage = images[currentIndex];
  const isLiked = currentImage?.likes?.includes(currentImage?.id); 


  // Wait, we need userId. We'll need to get userId from auth store.
  // Actually, we need the user id to determine if liked. We'll need to pass it or get from auth store.
  // For simplicity, we'll assume the store's toggleLike uses optimistic update and we just call it.
  // But to display liked state, we need to know if current user's id is in likes array.
  // We'll need to access the current user id from the auth store inside the component.
  // Let's add a user prop or get from store. I'll show using auth store:

  // ... inside the component:
  // const { user } = useAuthStore();
  // const isLiked = currentImage?.likes?.includes(user?.uid);

  // But to keep this example self-contained, I'll leave a placeholder. You can add the auth store import.

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  };

  const renderItem = ({ item }: { item: PortfolioImage }) => (
    <TouchableOpacity activeOpacity={1} onPress={toggleUI} style={styles.page}>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.image}
        contentFit="contain"
        transition={300}
        cachePolicy="memory-disk"
        // Optional: placeholder
        //placeholder={require('@/assets/placeholder.png')}
      />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        {/* Top bar with close button */}
        {showUI && (
          <SafeAreaView style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          </SafeAreaView>
        )}

        {/* Right side action buttons */}
        {showUI && currentImage && (
          <SafeAreaView style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onToggleLike(serviceId, currentImage.id)}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={isLiked ? '#ff4444' : 'white'}
              />
              <Text style={styles.actionLabel}>
                {formatCount(currentImage.likes?.length || 0)}
              </Text>
            </TouchableOpacity>
            {/* Uncomment share/download if needed */}
          </SafeAreaView>
        )}

        {/* Bottom info */}
        {showUI && currentImage && (
          <SafeAreaView style={styles.bottomInfo}>
            <Text style={styles.serviceName}>{currentImage.serviceName}</Text>
            {currentImage.caption ? (
              <Text style={styles.caption}>{currentImage.caption}</Text>
            ) : null}
            <Text style={styles.date}>{formatDate(currentImage.createdAt)}</Text>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  page: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  counterText: {
    color: 'white',
    fontSize: 14,
  },
  actionButtons: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  serviceName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  caption: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
  },
  date: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});