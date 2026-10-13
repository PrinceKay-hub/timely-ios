import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useTheme } from '@/providers/ThemeProvider';
import { getAddressFromCoordinates } from '@/services/locationService';
import { Country, CountryCode, CountryPicker } from 'react-native-country-picker-modal';
import { parsePhoneNumberFromString } from "libphonenumber-js";


const flagEmoji = (cca2: string) =>
  String.fromCodePoint(
    ...[...cca2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );



export const LocationStep = () => {
  const [countryCode, setCountryCode] = useState<CountryCode>("GH");
  const [callingCode, setCallingCode] = useState("233");
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pickerOpen, setPickerOpen] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);



  const hasCoordinates =
    currentService?.latitude != null &&
    currentService?.longitude != null &&
    (currentService.latitude !== 0 || currentService.longitude !== 0);


  // ── Show confirmation dialog before getting location ──
  const showCautionDialog = () => {
    Alert.alert(
      'Confirm Location',
      'Are you at the precise location of your business? Setting an accurate location helps customers find you easily. You can adjust it later.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
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
      await getAddressFromCoordinates(loc.coords.latitude, loc.coords.longitude).then((address) => {
        if (address) {
          const parts = address.split(',').map(part => part.trim());
          updateServiceField('location', address);
          if (parts.length === 2) {
            updateServiceField('region', parts[1]);
            updateServiceField('district', parts[0]);
          }
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setIsLocating(false);
    }
  };



  useEffect(() => {
    const saved = currentService?.number;
    if (!saved || number) return;
    const parsed = parsePhoneNumberFromString(saved);
    if (parsed) {
      setCountryCode((parsed.country ?? 'GH') as CountryCode);
      setCallingCode(parsed.countryCallingCode);
      setNumber(parsed.nationalNumber);
    }
  }, [currentService?.number]);

  // Store the E.164 number if valid, otherwise clear it
  const syncToStore = (digits: string, code: string) => {
    const parsed = parsePhoneNumberFromString(`+${code}${digits}`);
    const valid = !!parsed?.isValid();
    updateServiceField('number', valid ? parsed!.number : '');
    return valid;
  };

  const onSelectCountry = (country: Country) => {
    const code = country.callingCode[0];
    setCountryCode(country.cca2);
    setCallingCode(code);
    setError(null);
    if (number) syncToStore(number, code);
  };

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').replace(/^0+/, ''); // no leading 0
    setNumber(digits);
    setError(null);
    syncToStore(digits, callingCode);
  };

  const handlePhoneBlur = () => {
    if (number && !syncToStore(number, callingCode)) {
      setError('Enter a valid phone number');
    }
  };

  // Determine button label
  const getButtonLabel = () => {
    if (hasCoordinates) return 'Location set - Tap to update';
    return "Set Precise Shop Location (GPS)";
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
        {hasCoordinates && (
          <Text style={[styles.coordinatesText, { color: colors.textSecondary }]}>
            Location: {currentService?.location}
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
            returnKeyType="done"
          />
        </View>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Help customers find you when GPS isn't precise enough.
        </Text>

      </View>
      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>

        <Text style={[styles.label, { color: colors.text, }]}>
          Business Number
        </Text>
        <View style={[styles.inputRow, error ? styles.rowError : null, {
          borderColor: colors.border || '#ddd',
          backgroundColor: colors.surface,

        }]}>
          <Pressable
            style={styles.countryButton}
            onPress={() => setPickerOpen(true)}
            disabled={saving}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.flag}>{flagEmoji(countryCode)}</Text>
              <Text style={styles.callingCode}>+{callingCode}</Text>
            </View>
          </Pressable>
          <CountryPicker
            visible={pickerOpen}
            onClose={() => setPickerOpen(false)}
            countryCode={countryCode}
            withFilter
            withFlag
            withCallingCode
            withEmoji
            onSelect={(c) => {
              onSelectCountry(c);
              setPickerOpen(false);
            }}
            renderFlagButton={() => <View />}
          />
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border || '#ddd',
                color: colors.text,
                backgroundColor: colors.surface,
              }
            ]}
            placeholder="Phone number"
            placeholderTextColor={colors.textSecondary || '#999'}
            keyboardType="phone-pad"
            value={number}                    // local state, not the store
            onChangeText={handlePhoneChange}
            onBlur={handlePhoneBlur}
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="done"
          />
        </View>
        {error && <Text style={{ color: '#d32f2f', fontSize: 12, marginLeft: 4 }}>{error}</Text>}
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
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
    },
    helperText: {
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    rowError: { borderColor: "#d32f2f" },
    countryButton: { marginLeft: 4, },
    flag: { fontSize: 20 },
    callingCode: { fontSize: 16, color: colors.text, marginLeft: 4 },
  });