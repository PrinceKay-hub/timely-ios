// components/PortfolioTabContent.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Tabs } from 'react-native-collapsible-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { PortfolioViewerModal } from './PortfolioViewerModal';

const PURPLE = '#8B5CF6';

interface Props {
  serviceId: string;
  serviceName?: string;
}

export const PortfolioTabContent: React.FC<Props> = ({ serviceId, serviceName }) => {
  const { images, loading, error, loadPortfolio, toggleLike } = usePortfolioStore();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (serviceId) loadPortfolio(serviceId);
  }, [serviceId]);

  // Show loading spinner only when no images are present yet
  if (loading && images.length === 0) {
    return (
      <Tabs.ScrollView contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </Tabs.ScrollView>
    );
  }

  if (error) {
    return (
      <Tabs.ScrollView contentContainerStyle={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => loadPortfolio(serviceId)} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Tabs.ScrollView>
    );
  }

  if (images.length === 0) {
    return (
      <Tabs.ScrollView contentContainerStyle={styles.center}>
        <Ionicons name="images-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Portfolio Yet</Text>
        <Text style={styles.emptyText}>
          This service hasn't added any portfolio images.
        </Text>
      </Tabs.ScrollView>
    );
  }

  const handleImagePress = (index: number) => {
    setSelectedIndex(index);
    setViewerVisible(true);
  };

  return (
    <>
      <Tabs.FlatList
        data={images}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gridContainer}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleImagePress(index)}
            style={styles.card}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            {/* Gradient overlay */}
            <View style={styles.overlay}>
              <Text style={styles.caption} numberOfLines={2}>
                {item.caption}
              </Text>
              <View style={styles.likeRow}>
                <Ionicons name="heart" size={12} color="white" />
                <Text style={styles.likeCount}>
                  {item.likes?.length
                    ? item.likes.length > 999
                      ? `${(item.likes.length / 1000).toFixed(1)}K`
                      : item.likes.length
                    : '0'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <PortfolioViewerModal
        visible={viewerVisible}
        images={images}
        initialIndex={selectedIndex}
        onClose={() => setViewerVisible(false)}
        serviceId={serviceId}
        onToggleLike={toggleLike}
      />
    </>
  );
};

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: PURPLE,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
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
  gridContainer: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    aspectRatio: 0.85,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  caption: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  likeCount: {
    color: 'white',
    fontSize: 11,
    marginLeft: 4,
  },
});