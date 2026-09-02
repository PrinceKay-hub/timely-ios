import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImagePicked: (uri: string) => void;
  primaryColor: string;
}

export function AttachSheet({ visible, onClose, onImagePicked, primaryColor }: Props) {
  const pick = async (source: 'camera' | 'library') => {
    onClose();
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets?.[0]) return;
    onImagePicked(result.assets[0].uri);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.row} onPress={() => pick('camera')}>
            <Ionicons name="camera" size={22} color={primaryColor} />
            <Text style={styles.label}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => pick('library')}>
            <Ionicons name="images" size={22} color={primaryColor} />
            <Text style={styles.label}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', margin: 12, borderRadius: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
  label: { fontSize: 16 },
});