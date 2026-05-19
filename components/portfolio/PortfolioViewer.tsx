import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { PortfolioImage } from '@/types/portfolio'; 

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  images: PortfolioImage[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (image: PortfolioImage) => void;
}

const PortfolioViewer: React.FC<Props> = ({
  visible,
  images,
  initialIndex,
  onClose,
  onDelete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const index = Math.floor(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const currentImage = images[currentIndex];

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.imageUrl }} style={styles.fullImage} resizeMode="contain" />
            </View>
          )}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(currentImage)}
              style={styles.deleteButtonFull}
            >
              <Text style={styles.deleteTextFull}>🗑</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>

        {currentImage?.caption ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>{currentImage.caption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
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
    padding: 16,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
  },
  deleteButtonFull: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTextFull: {
    color: '#fff',
    fontSize: 20,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  captionText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default PortfolioViewer;