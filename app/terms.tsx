// app/terms.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

export default function TermsAndConditionsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme.dark;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleBack = () => router.back();

  // Helper components using the dynamic styles
  const SectionTitle = ({ title }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const SubSectionTitle = ({ title }) => (
    <Text style={styles.subSectionTitle}>{title}</Text>
  );

  const Paragraph = ({ text, monospace = false }) => (
    <Text style={[styles.paragraph, monospace && styles.monospace]}>
      {text}
    </Text>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: '#fff' }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.mainTitle, { color: colors.primary }]}>Terms and Conditions for Timely Booking App</Text>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last updated: February 26, 2026</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* 1. Introduction */}
        <SectionTitle title="1. Introduction" />
        <Paragraph text="Welcome to Timely! These Terms and Conditions ('Terms', 'Agreement') govern your use of the Timely mobile application (the 'App') and the services provided through the App. The App is operated by [Your Company Name] ('we', 'us', or 'our')." />
        <Paragraph text="By accessing or using the App, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the App." />
        <Paragraph text="The App connects users ('Customers') with service providers ('Providers') for booking various services. Both Customers and Providers are users of the App and must agree to these Terms." />

        {/* 2. Definitions */}
        <SectionTitle title="2. Definitions" />
        <BulletList items={[
          '"Customer" – an individual using the App to book services from Providers.',
          '"Provider" – a business or individual offering services through the App.',
          '"Service" – any service listed by a Provider and booked by a Customer via the App.',
          '"Booking" – a confirmed appointment for a Service between a Customer and a Provider.',
        ]} />

        {/* 3. Account Registration */}
        <SectionTitle title="3. Account Registration" />
        <SubSectionTitle title="3.1 Eligibility" />
        <Paragraph text="You must be at least 18 years old to use the App. By creating an account, you represent that you are at least 18 years of age." />
        <SubSectionTitle title="3.2 Account Responsibilities" />
        <Paragraph text="You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account." />
        <SubSectionTitle title="3.3 Accuracy of Information" />
        <Paragraph text="You agree to provide accurate, current, and complete information during registration and keep it updated. Providers, in particular, must ensure their business details, location, working hours, and service listings are correct." />

        {/* 4. Services and Bookings */}
        <SectionTitle title="4. Services and Bookings" />
        <SubSectionTitle title="4.1 Provider Listings" />
        <Paragraph text="Providers may list their services, including descriptions, prices, duration, availability, and location. Providers are solely responsible for the accuracy and legality of their listings." />
        <SubSectionTitle title="4.2 Booking Process" />
        <Paragraph text="Customers can browse Providers, select a service, choose an available date and time, and confirm a booking. A booking is confirmed when the Customer receives a confirmation notification through the App." />
        <SubSectionTitle title="4.3 Modifications and Cancellations by Customer" />
        <Paragraph text="Customers may modify or cancel a booking through the App subject to the Provider's cancellation policy (see Section 6)." />
        <SubSectionTitle title="4.4 Modifications by Provider" />
        <Paragraph text="Providers may need to reschedule or cancel a booking due to unforeseen circumstances. In such cases, Providers must notify the Customer immediately through the App, and the Customer will be entitled to a full refund or the option to rebook." />

        {/* 5. Payments */}
        <SectionTitle title="5. Payments" />
        <SubSectionTitle title="5.1 Pricing" />
        <Paragraph text="All prices are displayed in the local currency and include applicable taxes unless stated otherwise. Providers set their own prices." />
        <SubSectionTitle title="5.2 Payment Processing" />
        <Paragraph text="Payments for bookings are processed through third-party payment processors integrated into the App. By making a payment, you agree to the terms of those processors. We do not store your payment details on our servers." />
        <SubSectionTitle title="5.3 Payment Authorization" />
        <Paragraph text="When you confirm a booking, you authorize us to charge your selected payment method for the total amount of the booking." />
        <SubSectionTitle title="5.4 Payouts to Providers" />
        <Paragraph text="Providers will receive payments for completed bookings, minus any applicable service fees, according to the payout schedule specified in their provider agreement. Payouts are processed through the same third-party payment processors." />

        {/* 6. Cancellations and Refunds */}
        <SectionTitle title="6. Cancellations and Refunds" />
        <SubSectionTitle title="6.1 Customer Cancellations" />
        <Paragraph text="Each Provider may set their own cancellation policy (e.g., full refund if canceled 24 hours in advance, no refund for last-minute cancellations). The applicable policy will be displayed at the time of booking. If no policy is specified, the following default applies:" />
        <BulletList items={[
          'Cancellation more than 24 hours before the appointment: full refund.',
          'Cancellation within 24 hours: 50% refund.',
          'No-show: no refund.',
        ]} />
        <SubSectionTitle title="6.2 Provider Cancellations" />
        <Paragraph text="If a Provider cancels a booking, the Customer will receive a full refund. We may also offer the Customer a credit or discount for future bookings." />
        <SubSectionTitle title="6.3 Disputes" />
        <Paragraph text="If a Customer believes a refund is warranted due to poor service, they must contact us within 7 days after the appointment. We will mediate and may issue a partial or full refund at our discretion." />

        {/* 7. Provider Obligations */}
        <SectionTitle title="7. Provider Obligations" />
        <SubSectionTitle title="7.1 Quality of Service" />
        <Paragraph text="Providers agree to deliver services with reasonable skill and care, in accordance with their listings and any industry standards." />
        <SubSectionTitle title="7.2 Compliance with Laws" />
        <Paragraph text="Providers must comply with all applicable laws, regulations, and licensing requirements related to their services." />
        <SubSectionTitle title="7.3 Location Accuracy" />
        <Paragraph text="Providers are responsible for ensuring their shop location (latitude/longitude) is accurate in the App to enable Customers to get correct directions." />
        <SubSectionTitle title="7.4 Professional Conduct" />
        <Paragraph text="Providers must treat Customers with respect and maintain a safe environment. Harassment, discrimination, or any inappropriate behavior is strictly prohibited and will result in immediate termination of the Provider's account." />

        {/* 8. User Conduct */}
        <SectionTitle title="8. User Conduct" />
        <Paragraph text="All users agree not to:" />
        <BulletList items={[
          'Use the App for any illegal purpose.',
          'Harass, abuse, or harm another user.',
          'Impersonate any person or entity.',
          'Post false, misleading, or defamatory content.',
          'Attempt to gain unauthorized access to the App\'s systems.',
          'Use any automated means (bots, scrapers) to access the App.',
        ]} />
        <Paragraph text="Violation of these rules may result in suspension or termination of your account." />

        {/* 9. Intellectual Property */}
        <SectionTitle title="9. Intellectual Property" />
        <Paragraph text="The App and its original content, features, and functionality are owned by [Your Company Name] and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the App without our prior written consent." />

        {/* 10. Third-Party Links and Services */}
        <SectionTitle title="10. Third-Party Links and Services" />
        <Paragraph text="The App may contain links to third-party websites or services (e.g., Google Maps, payment processors). We are not responsible for the content or practices of these third parties. Your use of such services is at your own risk and subject to their terms." />

        {/* 11. Limitation of Liability */}
        <SectionTitle title="11. Limitation of Liability" />
        <Paragraph text="To the maximum extent permitted by law, in no event shall [Your Company Name] be liable for any indirect, punitive, incidental, special, consequential damages, or loss of data, profits, or business opportunity arising out of or in connection with your use of the App or services booked through the App." />
        <Paragraph text="We are a platform connecting Customers and Providers. We are not responsible for the quality, safety, or legality of services provided by Providers. Any dispute between a Customer and a Provider is solely between those parties." />
        <Paragraph text="Our total liability to you for any claim arising from these Terms or your use of the App shall not exceed the amount you paid to us (if any) during the twelve months preceding the event giving rise to the liability." />

        {/* 12. Indemnification */}
        <SectionTitle title="12. Indemnification" />
        <Paragraph text="You agree to indemnify and hold harmless [Your Company Name] and its officers, directors, employees, and agents from any claims, damages, liabilities, costs, or expenses (including legal fees) arising from your violation of these Terms, your misuse of the App, or your dispute with another user." />

        {/* 13. Termination */}
        <SectionTitle title="13. Termination" />
        <Paragraph text="We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the App will cease. You may delete your account at any time through the App settings." />

        {/* 14. Governing Law */}
        <SectionTitle title="14. Governing Law" />
        <Paragraph text="These Terms shall be governed and construed in accordance with the laws of [Your Country/State], without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts located in [Your City/Region]." />

        {/* 15. Dispute Resolution */}
        <SectionTitle title="15. Dispute Resolution" />
        <SubSectionTitle title="15.1 Informal Resolution" />
        <Paragraph text="Before filing a claim, you agree to attempt to resolve any dispute informally by contacting us at disputes@timelyapp.com. We will attempt to resolve the dispute internally." />
        <SubSectionTitle title="15.2 Arbitration" />
        <Paragraph text="If the dispute cannot be resolved informally, you agree that any dispute arising out of or relating to these Terms shall be finally settled by binding arbitration administered by [Arbitration Institution] in accordance with its rules. The arbitration shall take place in [Your City], and judgment on the award may be entered in any court having jurisdiction." />
        <SubSectionTitle title="15.3 Class Action Waiver" />
        <Paragraph text="You agree to resolve disputes with us on an individual basis, and not as a plaintiff or class member in any purported class or representative proceeding." />

        {/* 16. Changes to Terms */}
        <SectionTitle title="16. Changes to Terms" />
        <Paragraph text="We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use the App after those revisions become effective, you agree to be bound by the revised Terms." />

        {/* 17. Contact Us */}
        <SectionTitle title="17. Contact Us" />
        <Paragraph text="If you have any questions about these Terms, please contact us:" />
        <Paragraph text="By email: support@timelyapp.com\nBy phone: +233244038837\nBy mail: Airport Roundabout, Kumasi" monospace />

        {/* 18. Miscellaneous */}
        <SectionTitle title="18. Miscellaneous" />
        <SubSectionTitle title="18.1 Entire Agreement" />
        <Paragraph text="These Terms constitute the entire agreement between you and us regarding the use of the App." />
        <SubSectionTitle title="18.2 Severability" />
        <Paragraph text="If any provision of these Terms is held to be unenforceable or invalid, that provision will be enforced to the maximum extent possible, and the remaining provisions will remain in full force and effect." />
        <SubSectionTitle title="18.3 Waiver" />
        <Paragraph text="Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights." />

        {/* Footer */}
        <View style={[
          styles.footerBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }
        ]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            These Terms and Conditions were last updated on February 26, 2026.
          </Text>
        </View>
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
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
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
    mainTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 20,
      marginHorizontal: 20,
    },
    lastUpdated: {
      fontSize: 14,
      fontStyle: 'italic',
      marginTop: 8,
      marginHorizontal: 20,
      marginBottom: 16,
    },
    divider: {
      height: 1,
      marginVertical: 16,
      marginHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 24,
      marginBottom: 8,
      marginHorizontal: 20,
      color: colors.text,
    },
    subSectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 4,
      marginHorizontal: 20,
      color: colors.text,
    },
    paragraph: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginVertical: 4,
      marginHorizontal: 20,
    },
    monospace: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      backgroundColor: colors.surface,
      padding: 8,
      borderRadius: 4,
    },
    bulletList: {
      marginHorizontal: 20,
      marginVertical: 4,
    },
    bulletItem: {
      flexDirection: 'row',
      marginVertical: 2,
    },
    bullet: {
      fontSize: 14,
      color: colors.text,
      width: 14,
    },
    bulletText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
      lineHeight: 20,
    },
    footerBox: {
      padding: 16,
      marginHorizontal: 20,
      marginTop: 24,
      borderRadius: 8,
      borderWidth: 1,
    },
    footerText: {
      fontSize: 12,
      fontStyle: 'italic',
      textAlign: 'center',
    },
  });