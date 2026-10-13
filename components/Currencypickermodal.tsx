import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/providers/ThemeProvider";

export type Currency = {
  code: string; // ISO 4217, e.g. "GHS"  <- store this
  symbol: string; // display only, e.g. "GH₵"
  name: string;
  flag: string; // ISO 3166 country code used for the flag emoji
};

// Extend freely. Keep `code` valid ISO 4217.
export const CURRENCIES: Currency[] = [
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", flag: "GH" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "US" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", flag: "NG" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "EU" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "GB" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc", flag: "SN" },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA Franc", flag: "CM" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", flag: "KE" },
  { code: "ZAR", symbol: "R", name: "South African Rand", flag: "ZA" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound", flag: "EG" },
  { code: "MAD", symbol: "DH", name: "Moroccan Dirham", flag: "MA" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", flag: "TZ" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling", flag: "UG" },
  { code: "RWF", symbol: "FRw", name: "Rwandan Franc", flag: "RW" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr", flag: "ET" },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha", flag: "ZM" },
  { code: "BWP", symbol: "P", name: "Botswana Pula", flag: "BW" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", flag: "CA" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "AU" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", flag: "NZ" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "JP" },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan", flag: "CN" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "IN" },
  { code: "AED", symbol: "AED", name: "UAE Dirham", flag: "AE" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal", flag: "SA" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", flag: "TR" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "BR" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", flag: "MX" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", flag: "CH" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", flag: "SE" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", flag: "NO" },
  { code: "DKK", symbol: "kr", name: "Danish Krone", flag: "DK" },
  { code: "PLN", symbol: "zł", name: "Polish Złoty", flag: "PL" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble", flag: "RU" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", flag: "KR" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "SG" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", flag: "MY" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", flag: "PH" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", flag: "PK" },
];

export const findCurrency = (code?: string | null): Currency =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

const flagEmoji = (cc: string) =>
  String.fromCodePoint(
    ...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedCode?: string;
  onSelect: (currency: Currency) => void;
};

export function CurrencyPickerModal({
  visible,
  onClose,
  selectedCode,
  onSelect,
}: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Select currency
          </Text>
          <Pressable onPress={close} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <TextInput
          style={[
            styles.search,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border || "#ddd",
            },
          ]}
          placeholder="Search currency"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        <FlatList
          data={data}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.code === selectedCode;
            return (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onSelect(item);
                  close();
                }}
              >
                <Text style={styles.flag}>{flagEmoji(item.flag)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.code, { color: colors.text }]}>
                    {item.code} · {item.symbol}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {item.name}
                  </Text>
                </View>
                {selected && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, padding: 16 }}>
              No currency found.
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700" },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  flag: { fontSize: 24 },
  code: { fontSize: 15, fontWeight: "600" },
});