// app/about.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

export default function AboutScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleBack = () => router.back();

  const openPrivacyPolicy = () => {
    Linking.openURL('https://timelygh.com/privacy');
  };
  const openTerms = () => {
    Linking.openURL('https://timelygh.com/terms');
  };

  // ── Subcomponents (inside to access styles) ──────────────────────────────
  const FeatureItem = ({ icon, title, description }) => (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={28} color={colors.primary} style={styles.featureIcon} />
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

  const SubSection = ({ title }) => (
    <Text style={styles.subSectionTitle}>{title}</Text>
  );

  const BulletList = ({ items }) => (
    <View style={styles.bulletList}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bulletItem}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  const Quote = ({ text, attribution }) => (
    <View style={styles.quoteBox}>
      <Text style={styles.quoteText}>{text}</Text>
      <Text style={styles.quoteAttribution}>{attribution}</Text>
    </View>
  );

  const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: colors.background }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Timely</Text>
        </View>

        {/* Hero */}
        <Text style={[styles.heroTitle, { color: colors.primary }]}>Timely</Text>
        <Text style={[styles.heroDescription, { color: colors.text }]}>
          Timely makes booking appointments effortless – whether you're looking for a haircut,
          spa treatment, or professional service, Timely connects you with trusted providers
          in your area.
        </Text>

        {/* For Customers */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>For Customers</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
          Finding and booking services has never been easier. Browse providers, check real‑time
          availability, and secure your appointment in seconds – anytime, anywhere.
        </Text>

        {/* For Service Providers */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>For Service Providers</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
          Take control of your business with powerful tools designed to help you grow. Manage your
          calendar, track appointments, and build lasting relationships with your clients.
        </Text>

        {/* Why You'll Love Timely */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ Why You'll Love Timely</Text>
        <FeatureItem
          icon="search"
          title="Discover Great Providers"
          description="Browse through vetted service professionals in your area. View photos, read reviews, and compare services to find the perfect match for your needs."
        />
        <FeatureItem
          icon="calendar"
          title="Book Instantly"
          description="No phone calls, no waiting. See real‑time availability and book your appointment immediately. Reschedule or cancel with just a few taps."
        />
        <FeatureItem
          icon="map"
          title="Find Your Way"
          description="Never get lost. Get turn‑by‑turn directions to your appointment location using integrated Google Maps. Your provider's exact location is saved and ready to guide you."
        />
        <FeatureItem
          icon="notifications"
          title="Smart Reminders"
          description="Receive timely notifications about upcoming appointments so you never miss a booking. Both customers and providers stay in sync."
        />

        {/* For Service Providers – Expanded */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>👥 For Service Providers</Text>
        <SubSection title="Grow Your Business" />
        <BulletList items={[
          'Set your working hours and manage availability',
          'Accept bookings 24/7 – even while you sleep',
          'Reduce no‑shows with automated reminders',
        ]} />

        <SubSection title="Simplify Operations" />
        <BulletList items={[
          'Easy calendar management',
          'Client history and notes at your fingertips',
          'Track earnings and business performance',
        ]} />

        <SubSection title="Professional Presence" />
        <BulletList items={[
          'Create your custom service listings',
          'Upload photos of your work',
          'Build your reputation with customer reviews',
        ]} />

        {/* Trusted by Users */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>⭐ Trusted by Users</Text>
        <Quote
          text="Timely has completely transformed how I run my business. Clients can book at any time, whether it's in the middle of the night or during my busiest workday. It's so much more than a booking system – it's become an essential part of my business."
          attribution="– Selina, Beauty Specialist"
        />
        <Quote
          text="I love being able to make appointments on the go, anytime, anywhere. The automated messages hugely reduce our no‑shows."
          attribution="– Tracy Antwi, Salon Owner"
        />

        {/* Privacy Matters */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔒 Your Privacy Matters</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary, marginBottom: 8 }]}>
          We take your data seriously:
        </Text>
        <BulletList items={[
          'Location data is only used to help you find and navigate to services',
          'All data is encrypted in transit',
          'You can request deletion of your data anytime',
          'No data shared with third parties without your consent',
        ]} />
        <TouchableOpacity onPress={openPrivacyPolicy}>
          <Text style={[styles.linkText, { color: colors.primary }]}>View our Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={[styles.linkSeparator, { color: colors.textSecondary }]}> | </Text>
        <TouchableOpacity onPress={openTerms}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Terms of Service</Text>
        </TouchableOpacity>

        {/* Download / CTA */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📲 Download Timely Today</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
          Join thousands of users who've simplified their booking experience. Whether you're booking
          a service or running a business, Timely helps you stay organized and stress‑free.
        </Text>
        <View style={[
          styles.ctaBox,
          {
            backgroundColor: `${colors.primary}1A`,
            borderColor: `${colors.primary}4D`,
          }
        ]}>
          <Text style={[styles.ctaText, { color: colors.primary }]}>
            Get started with a 30‑day free trial for providers
          </Text>
        </View>

        {/* App Info */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>App Info</Text>
        <InfoRow label="Updated:" value="February 26, 2026" />
        <InfoRow label="Version:" value="1.0.0" />
        <InfoRow label="Requires:" value="iOS 15.0 / Android 8.0 or higher" />
        <InfoRow label="Price:" value="Free (in‑app purchases available)" />
        <InfoRow label="Developer:" value="Enorince Technologies Ltd." />
      </ScrollView>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: {
      paddingTop: 50,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    backButton: {
      borderRadius: 20,
      padding: 8,
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      marginTop: 20,
      marginHorizontal: 20,
    },
    heroDescription: {
      fontSize: 16,
      marginTop: 8,
      marginHorizontal: 20,
      lineHeight: 24,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 28,
      marginHorizontal: 20,
      marginBottom: 8,
    },
    sectionText: {
      fontSize: 16,
      marginHorizontal: 20,
      lineHeight: 24,
      marginBottom: 12,
    },
    featureItem: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginVertical: 8,
    },
    featureIcon: { marginRight: 12 },
    featureText: { flex: 1 },
    featureTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    subSectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 12,
      marginHorizontal: 20,
      marginBottom: 4,
    },
    bulletList: { marginHorizontal: 20, marginBottom: 8 },
    bulletItem: { flexDirection: 'row', marginVertical: 2 },
    bullet: { fontSize: 16, color: colors.text },
    bulletText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
    quoteBox: {
      backgroundColor: colors.surface || '#f5f5f5',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border || '#e0e0e0',
      marginHorizontal: 20,
      marginVertical: 6,
    },
    quoteText: { fontSize: 14, fontStyle: 'italic', color: colors.text },
    quoteAttribution: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginTop: 6 },
    linkText: { textDecorationLine: 'underline', marginHorizontal: 20, marginVertical: 4 },
    linkSeparator: { marginHorizontal: 4 },
    ctaBox: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginHorizontal: 20,
      marginVertical: 12,
    },
    ctaText: { fontWeight: '600', textAlign: 'center' },
    infoRow: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 2 },
    infoLabel: {
      width: 100,
      fontWeight: '600',
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoValue: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
  });