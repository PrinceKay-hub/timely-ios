import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';

const PURPLE = '#8B5CF6';

interface Props {
  userId: string;
}

export const PhotosStep: React.FC<Props> = ({ userId }) => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const [images, setImages] = useState<string[]>(currentService?.images || []);
  const [modalVisible, setModalVisible] = useState(false);

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

  const pickImage = async (fromCamera: boolean) => {
    const hasPermission = await requestPermissions(fromCamera);
    if (!hasPermission) {
      setModalVisible(false);
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 1,
          selectionLimit: 3 - images.length,
        });

    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      const updated = [...images, ...newUris].slice(0, 3);
      setImages(updated);
      updateServiceField('images', updated);
    }
    setModalVisible(false);
  };

  const removeImage = (index: number) => {
    Alert.alert('Remove Image', 'Are you sure you want to remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        onPress: () => {
          const updated = images.filter((_, i) => i !== index);
          setImages(updated);
          updateServiceField('images', updated);
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Ionicons name="images-outline" size={60} color={PURPLE} />
      <Text style={styles.title}>Add Photos</Text>
      <Text style={styles.subtitle}>Showcase your business with great photos</Text>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={PURPLE} />
        <Text style={styles.infoText}>Add at least 3 photos for better visibility</Text>
      </View>

      {images.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No images added yet</Text>
        </View>
      ) : (
        <FlatList
          data={images}
          numColumns={3}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item }} style={styles.image} />
              <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
          scrollEnabled={false} 
          columnWrapperStyle={styles.grid}
        />
      )}

      {images.length < 3 && (
        <TouchableOpacity style={styles.uploadButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color={PURPLE} />
          <Text style={styles.uploadText}>Add Photos</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.countText}>
        {images.length} of 3 images selected
      </Text>

      {/* Image source modal */}
      <Modal visible={modalVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select source</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalOption} onPress={() => pickImage(true)}>
              <Ionicons name="camera-outline" size={24} color={PURPLE} />
              <Text style={styles.modalOptionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => pickImage(false)}>
              <Ionicons name="images-outline" size={24} color={PURPLE} />
              <Text style={styles.modalOptionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  subtitle: { color: 'gray', fontSize: 16, marginBottom: 24 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { color: PURPLE, marginLeft: 8, fontSize: 13, flex: 1 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { color: 'gray', marginTop: 8 },
  grid: {  gap: 4 },
  imageContainer: {
    width: '32%',
    aspectRatio: 1,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: 12,
  },
  uploadText: { color: PURPLE, fontWeight: '600', marginLeft: 8 },
  countText: { color: 'gray', fontSize: 14, marginTop: 8, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalOptionText: { fontSize: 16, marginLeft: 12, color: '#333' },
});