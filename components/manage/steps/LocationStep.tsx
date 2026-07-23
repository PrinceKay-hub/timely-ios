import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useSelectedLocationStore } from '@/stores/selectedLocationStore';
import { useTheme } from '@/providers/ThemeProvider';

export const LocationStep = () => {
  const router = useRouter();
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { selectedLocation } = useSelectedLocationStore();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const hasCoordinates =
    currentService?.latitude != null &&
    currentService?.longitude != null &&
    (currentService.latitude !== 0 || currentService.longitude !== 0);

  const handleSelectRegion = async () => {
    router.push('/location/regions?isService=true');
  };

  // ── Show confirmation dialog before getting location ──
  const showCautionDialog = () => {
    Alert.alert(
      'Confirm Location',
      'Are you at the precise location of your business? Setting an accurate location helps customers find you easily. You can adjust it later.',
      [
        {
          text: 'No, I will set it later',
          style: 'cancel',
        },
        {
          text: 'Yes, I am there',
          onPress: handleGetCurrentLocation,
        },
      ],
      { cancelable: true }
    );
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to get your current location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      updateServiceField('latitude', loc.coords.latitude);
      updateServiceField('longitude', loc.coords.longitude);
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setIsLocating(false);
    }
  };

  // ── Parse selectedLocation into region/district and geocode ──
  useEffect(() => {
    if (!selectedLocation || selectedLocation === 'Select Location') return;

    const parts = selectedLocation.split(' - ');
    if (parts.length === 2) {
      updateServiceField('region', parts[0]);
      updateServiceField('district', parts[1]);
    } else {
      updateServiceField('region', selectedLocation);
      updateServiceField('district', '');
    }
    updateServiceField('location', selectedLocation);

    // Only geocode if we don't have GPS coordinates
    if (hasCoordinates) return;

    const geocodeRegion = async () => {
      setIsGeocoding(true);
      try {
        const results = await Location.geocodeAsync(`${selectedLocation}, Ghana`);
        if (results.length > 0) {
          updateServiceField('latitude', results[0].latitude);
          updateServiceField('longitude', results[0].longitude);
        }
      } catch (error) {
        console.warn('Geocoding failed for', selectedLocation, error);
      } finally {
        setIsGeocoding(false);
      }
    };
    geocodeRegion();
  }, [selectedLocation]);

  const handlePhoneChange = (text: string) => {
    updateServiceField('number', text);
  };

  const handlePhoneBlur = () => {
    const currentNumber = currentService?.number || '';
    if (!currentNumber.trim()) {
      updateServiceField('number', '+233');
      return;
    }
    if (!currentNumber.startsWith('+233')) {
      const cleaned = currentNumber.replace(/[^0-9]/g, '');
      if (cleaned.length > 0) {
        updateServiceField('number', `+233${cleaned}`);
      } else {
        updateServiceField('number', '+233');
      }
    }
  };

  // Determine button label
  const getButtonLabel = () => {
    if (hasCoordinates) return 'Location set - Tap to update';
    return "I'm at the premises now";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name="location-outline" size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Business Location & Contact</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Where can customers find you?
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>
        <Text style={[styles.label, { color: colors.text }]}>Shop Location</Text>
        <TouchableOpacity
          style={[
            styles.locationPicker,
            {
              borderColor: colors.border || '#ddd',
              backgroundColor: colors.surface,
            }
          ]}
          onPress={handleSelectRegion}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.text }]}>
            {currentService?.location || 'Select location'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.currentLocButton,
              {
                borderColor: colors.primary,
                backgroundColor: colors.surface,
              }
            ]}
            onPress={showCautionDialog}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="locate-outline" size={20} color={colors.primary} />
                <Text style={[styles.currentLocText, { color: colors.primary }]}>
                  {getButtonLabel()}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {isGeocoding && <ActivityIndicator size="small" color={colors.primary} />}
          {!isGeocoding && hasCoordinates && (
            <Ionicons name="checkmark-circle" size={24} color={colors.success || 'green'} />
          )}
        </View>

        {/* ── Show coordinates if set ── */}
        {hasCoordinates && (
          <Text style={[styles.coordinatesText, { color: colors.textSecondary }]}>
            Coordinates: {currentService?.latitude?.toFixed(6)}, {currentService?.longitude?.toFixed(6)}
          </Text>
        )}

        {/* ── Orange info box (shown only when coordinates are NOT set) ── */}
        {!hasCoordinates && !isLocating && !isGeocoding && (
          <View style={[
            styles.infoBox,
            {
              backgroundColor: colors.warning || '#FF8C00',
            }
          ]}>
            <Ionicons name="information-circle-outline" size={16} color="#fff" />
            <Text style={[styles.infoBoxText, { color: '#fff' }]}>
              Tap the button above if you are at your business premises to set an exact location.
            </Text>
          </View>
        )}

        {/* ── Nearest Landmark ── */}
        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
          Nearest Landmark
        </Text>
        <View style={[
          styles.inputRow,
          {
            borderColor: colors.border || '#ddd',
            backgroundColor: colors.surface,
          }
        ]}>
          <Ionicons name="map-outline" size={20} color={colors.primary} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.inputField, { color: colors.text }]}
            value={currentService?.landmark || ''}
            onChangeText={(text) => updateServiceField('landmark', text)}
            placeholder="e.g., Adum opposite PZ"
            placeholderTextColor={colors.textSecondary || '#999'}
          />
        </View>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Helps customers find you when GPS isn't precise enough.
        </Text>

      </View>
      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>

        <Text style={[styles.label, { color: colors.text,}]}>
          Business Number (Don't start with "0")
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border || '#ddd',
              color: colors.text,
              backgroundColor: colors.surface,
            }
          ]}
          value={currentService?.number}
          onChangeText={handlePhoneChange}
          onBlur={handlePhoneBlur}
          placeholder="+233 244 123456"
          placeholderTextColor={colors.textSecondary || '#999'}
          keyboardType="phone-pad"
        />
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          e.g., 244 123456 (automatically adds +233)
        </Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          This is the number customers can use to contact you.
        </Text>
      </View>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    subtitle: { fontSize: 16, marginBottom: 24 },
    card: { borderRadius: 15, padding: 16, marginBottom: 8, borderWidth: 0.5, borderColor: '#ddd' },
    label: { fontWeight: '600', fontSize: 14, marginBottom: 8 },
    locationPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    locationText: { flex: 1, marginLeft: 8 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 12 },
    currentLocButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    currentLocText: { marginLeft: 8, fontWeight: '600' },
    coordinatesText: { fontSize: 12, marginLeft: 4, marginBottom: 8 },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 10,
      padding: 10,
      marginBottom: 16,
      gap: 6,
    },
    infoBoxText: { fontSize: 12, flex: 1, lineHeight: 16 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 4,
    },
    inputField: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 12,
      fontSize: 16,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
    },
    helperText: {
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
  });