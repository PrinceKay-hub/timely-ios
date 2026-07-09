import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { usePortfolioStore } from '@/stores/portfolioStore';
import PortfolioCard from '@/components/portfolio/PortfolioCard';
import PortfolioViewer from '@/components/portfolio/PortfolioViewer';
import FabWithOptions from '@/components/portfolio/FabWithOptions';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

const PortfolioScreen = ({ route, navigation }: any) => {
  const { id, serviceName } = useLocalSearchParams<{ id: string; serviceName: string }>();
  const { images, loading, error, loadPortfolio, addPortfolioImage, deletePortfolioImage } =
    usePortfolioStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    loadPortfolio(id);
  }, [id]);

  const requestPermissions = async (forCamera: boolean) => {
    if (forCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to take photos. Please enable it in settings.'
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to select images. Please enable it in settings.'
        );
        return false;
      }
    }
    return true;
  };

  const handleAddImage = async (source: 'camera' | 'gallery', fromCamera: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      base64: false,
    };

    let result;
    if (source === 'camera') {
      const hasPermission = await requestPermissions(fromCamera);
      if (!hasPermission) {
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      Alert.prompt(
        'Add Caption',
        'Describe this work (optional)',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: (caption) => {
              addPortfolioImage(asset, id, serviceName, caption || '');
            },
          },
        ],
        'plain-text'
      );
    }
  };

  const handleDelete = (image: any) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to remove this image from your portfolio?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePortfolioImage(image.id, image.imageUrl, id),
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Portfolio Yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Start building your portfolio by adding images of your best work
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => handleAddImage('gallery', false)}
      >
        <Text style={styles.addButtonText}>Add First Image from gallery</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading overlay that appears when `loading` is true
  const LoadingOverlay = () => (
    <Modal transparent visible={loading} animationType="fade">
      <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: '#fff' }]}>Loading...</Text>
      </View>
    </Modal>
  );

  if (loading && images.length === 0) {
    return (
      <Modal transparent visible={loading} animationType="fade">
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: '#fff' }]}>Loading portfolio...</Text>
        </View>
      </Modal>
    );
  }

  if (error && images.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Oops! Something went wrong</Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => loadPortfolio(id)}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.background }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Portfolio</Text>
      </View>

      {images.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={images}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PortfolioCard
              image={item}
              index={index}
              onPress={() => {
                setSelectedImageIndex(index);
                setViewerVisible(true);
              }}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PortfolioViewer
        visible={viewerVisible}
        images={images}
        initialIndex={selectedImageIndex}
        onClose={() => setViewerVisible(false)}
        onDelete={handleDelete}
      />

      <FabWithOptions
        options={[
          { icon: '📷', label: 'Camera', onPress: () => handleAddImage('camera', true) },
          { icon: '🖼️', label: 'Gallery', onPress: () => handleAddImage('gallery', false) },
        ]}
      />
      <LoadingOverlay />
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      borderRadius: 20,
      padding: 8,
    },
    closeButton: {
      borderRadius: 20,
      padding: 8,
    },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    backIcon: {
      fontSize: 24,
      color: colors.primary,
    },
    list: {
      paddingHorizontal: 8,
      paddingBottom: 80,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    addButton: {
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 8,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    errorText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    errorSubtext: {
      marginBottom: 16,
      textAlign: 'center',
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    fullScreenCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
    },
  });

export default PortfolioScreen;