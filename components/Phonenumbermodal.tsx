import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CountryPicker, {
  Country,
  CountryCode,
} from "react-native-country-picker-modal";
import { parsePhoneNumberFromString } from "libphonenumber-js";

type Props = {
  /** Show the modal only when the user's phone is undefined/null. */
  visible: boolean;
  /** Receives the full E.164 number, e.g. "+233241234567". */
  onSubmit: (fullNumber: string) => Promise<void>;
  defaultCountry?: CountryCode;
  defaultCallingCode?: string;
  /** If provided, a close (X) button is shown and the Android back button works. */
  onClose?: () => void;
};

// "GH" -> 🇬🇭
const flagEmoji = (cca2: string) =>
  String.fromCodePoint(
    ...[...cca2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );

export function PhoneNumberModal({
  visible,
  onSubmit,
  defaultCountry = "GH",
  defaultCallingCode = "233",
  onClose,
}: Props) {
  // Hides the modal when the user closes it, even though `visible` is still
  // true (phone is still null). It shows again when `visible` goes false → true.
  const [dismissed, setDismissed] = useState(false);

  const handleClose = () => {
    setDismissed(true);
    onClose?.();
  };

  const [countryCode, setCountryCode] = useState<CountryCode>(defaultCountry);
  const [callingCode, setCallingCode] = useState(defaultCallingCode);
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Closes the modal locally after a successful save, even if the parent's
  // user state hasn't refreshed yet.
  const [done, setDone] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset once the parent catches up (visible -> false), so the modal can
  // show again for a different user later.
  useEffect(() => {
    if (!visible) {
      setDone(false);
      setDismissed(false);
    }
  }, [visible]);

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setError(null);
  };

  const handleSave = async () => {
    const parsed = parsePhoneNumberFromString(
      `+${callingCode}${number.replace(/\D/g, "")}`
    );
    if (!parsed || !parsed.isValid()) {
      setError("Enter a valid phone number");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(parsed.number); // E.164
      setDone(true);
    } catch {
      setError("Could not save your number. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible && !done && !dismissed}
      transparent
      animationType="fade"
      // Android back button: closes only if a close handler was provided
      onRequestClose={onClose ? handleClose : () => {}}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          {onClose && (
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              disabled={saving}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#555" />
            </Pressable>
          )}
          <Text style={styles.title}>Add your phone number</Text>
          <Text style={styles.subtitle}>
            We need your number to keep your account secure and send booking
            updates.
          </Text>

          <View style={[styles.row, error ? styles.rowError : null]}>
            {/* Our own button, so we control the color */}
            <Pressable
              style={styles.countryButton}
              onPress={() => setPickerOpen(true)}
              disabled={saving}
            >
              <Text style={styles.flag}>{flagEmoji(countryCode)}</Text>
              <Text style={styles.callingCode}>+{callingCode}</Text>
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
              renderFlagButton={() => <View />} // hide the library's own button
              theme={{ onBackgroundTextColor: "#111" }}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={number}
              onChangeText={(t) => {
                setNumber(t);
                setError(null);
              }}
              editable={!saving}
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  closeButton: { position: "absolute", top: 12, right: 12, zIndex: 1 },
  title: { fontSize: 20, fontWeight: "700", paddingRight: 32 },
  subtitle: { fontSize: 14, color: "#555" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  rowError: { borderColor: "#d32f2f" },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
    marginRight: 4,
  },
  flag: { fontSize: 20 },
  callingCode: { fontSize: 16, fontWeight: "600", color: "#111" }, // change me
  input: { flex: 1, height: 48, fontSize: 16 },
  error: { color: "#d32f2f", fontSize: 13 },
  button: {
    backgroundColor: "#111",
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
