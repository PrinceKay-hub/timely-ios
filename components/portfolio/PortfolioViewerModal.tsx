// components/PortfolioViewerModal.tsx
import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import { Image } from 'expo-image';
import { PortfolioImage } from '@/types/portfolio';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/auth'; // Import to check if user liked

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
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuthStore(); // Get current user for like status

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleScroll = useCallback((event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  }, []);

  const toggleUI = () => setShowUI((prev) => !prev);

  const currentImage = images[currentIndex];
  const isLiked = currentImage?.likes?.includes(user?.uid) || false;

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
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <View style={[styles.counter, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
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
                color={isLiked ? colors.error || '#ff4444' : 'white'}
              />
              <Text style={styles.actionLabel}>
                {formatCount(currentImage.likes?.length || 0)}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}

        {/* Bottom info */}
        {showUI && currentImage && (
          <SafeAreaView style={[styles.bottomInfo, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.serviceName}>
              {currentImage.serviceName}
            </Text>
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

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
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
      borderRadius: 30,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    counter: {
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