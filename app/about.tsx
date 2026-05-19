// app/about.tsx
import React from 'react';
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

const PURPLE = '#8B5CF6';
const GRAY_100 = '#f5f5f5';
const GRAY_300 = '#e0e0e0';

export default function AboutScreen() {
  const router = useRouter();

  const handleBack = () => router.back();

  // Open privacy policy or terms (replace with actual URLs)
  const openPrivacyPolicy = () => {
    Linking.openURL('https://yourapp.com/privacy');
  };
  const openTerms = () => {
    Linking.openURL('https://yourapp.com/terms');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Timely</Text>
        </View>

        {/* Hero */}
        <Text style={styles.heroTitle}>Timely</Text>
        <Text style={styles.heroDescription}>
          Timely makes booking appointments effortless – whether you're looking for a haircut,
          spa treatment, or professional service, Timely connects you with trusted providers
          in your area.
        </Text>

        {/* For Customers */}
        <Text style={styles.sectionTitle}>For Customers</Text>
        <Text style={styles.sectionText}>
          Finding and booking services has never been easier. Browse providers, check real‑time
          availability, and secure your appointment in seconds – anytime, anywhere.
        </Text>

        {/* For Service Providers */}
        <Text style={styles.sectionTitle}>For Service Providers</Text>
        <Text style={styles.sectionText}>
          Take control of your business with powerful tools designed to help you grow. Manage your
          calendar, track appointments, and build lasting relationships with your clients.
        </Text>

        {/* Why You'll Love Timely */}
        <Text style={styles.sectionTitle}>✨ Why You'll Love Timely</Text>
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
        <Text style={styles.sectionTitle}>👥 For Service Providers</Text>
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
        <Text style={styles.sectionTitle}>⭐ Trusted by Users</Text>
        <Quote
          text="Timely has completely transformed how I run my business. Clients can book at any time, whether it's in the middle of the night or during my busiest workday. It's so much more than a booking system – it's become an essential part of my business."
          attribution="– Selina, Beauty Specialist"
        />
        <Quote
          text="I love being able to make appointments on the go, anytime, anywhere. The automated messages hugely reduce our no‑shows."
          attribution="– Tracy Antwi, Salon Owner"
        />

        {/* Privacy Matters */}
        <Text style={styles.sectionTitle}>🔒 Your Privacy Matters</Text>
        <Text style={[styles.sectionText, { marginBottom: 8 }]}>
          We take your data seriously:
        </Text>
        <BulletList items={[
          'Location data is only used to help you find and navigate to services',
          'All data is encrypted in transit',
          'You can request deletion of your data anytime',
          'No data shared with third parties without your consent',
        ]} />
        <TouchableOpacity onPress={openPrivacyPolicy}>
          <Text style={styles.linkText}>View our Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.linkSeparator}> | </Text>
        <TouchableOpacity onPress={openTerms}>
          <Text style={styles.linkText}>Terms of Service</Text>
        </TouchableOpacity>

        {/* Download / CTA */}
        <Text style={styles.sectionTitle}>📲 Download Timely Today</Text>
        <Text style={styles.sectionText}>
          Join thousands of users who've simplified their booking experience. Whether you're booking
          a service or running a business, Timely helps you stay organized and stress‑free.
        </Text>
        <View style={styles.ctaBox}>
          <Text style={styles.ctaText}>
            Get started with a 30‑day free trial for providers
          </Text>
        </View>

        {/* App Info */}
        <Text style={styles.sectionTitle}>App Info</Text>
        <InfoRow label="Updated:" value="February 26, 2026" />
        <InfoRow label="Version:" value="1.0.0" />
        <InfoRow label="Requires:" value="iOS 15.0 / Android 8.0 or higher" />
        <InfoRow label="Price:" value="Free (in‑app purchases available)" />
        <InfoRow label="Developer:" value="Enorince Technologies Ltd." />
      </ScrollView>
    </View>
  );
}

// ---- Subcomponents ----
const FeatureItem = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={28} color={PURPLE} style={styles.featureIcon} />
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

// ---- Styles ----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: PURPLE,
    marginTop: 20,
    marginHorizontal: 20,
  },
  heroDescription: {
    fontSize: 16,
    color: '#333',
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
    color: '#333',
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
  featureTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  featureDescription: { fontSize: 14, color: '#555', lineHeight: 20 },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  bulletList: { marginHorizontal: 20, marginBottom: 8 },
  bulletItem: { flexDirection: 'row', marginVertical: 2 },
  bullet: { fontSize: 16, color: '#333' },
  bulletText: { fontSize: 14, color: '#555', flex: 1 },
  quoteBox: {
    backgroundColor: GRAY_100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GRAY_300,
    marginHorizontal: 20,
    marginVertical: 6,
  },
  quoteText: { fontSize: 14, fontStyle: 'italic', color: '#333' },
  quoteAttribution: { fontSize: 12, fontWeight: 'bold', marginTop: 6 },
  linkText: { color: PURPLE, textDecorationLine: 'underline', marginHorizontal: 20, marginVertical: 4 },
  linkSeparator: { color: '#999', marginHorizontal: 4 },
  ctaBox: {
    backgroundColor: `${PURPLE}1A`,
    borderWidth: 1,
    borderColor: `${PURPLE}4D`,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  ctaText: { color: PURPLE, fontWeight: '600', textAlign: 'center' },
  infoRow: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 2 },
  infoLabel: { width: 100, fontWeight: '600', fontSize: 14, color: '#555' },
  infoValue: { flex: 1, fontSize: 14, color: '#333' },
});