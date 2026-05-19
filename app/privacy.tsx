// app/privacy.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PURPLE = '#8B5CF6';
const GRAY_100 = '#f5f5f5';
const GRAY_300 = '#e0e0e0';
const GRAY_600 = '#666';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const handleBack = () => router.back();

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={PURPLE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.mainTitle}>Privacy Policy for Timely Booking App</Text>
        <Text style={styles.lastUpdated}>Last updated: February 26, 2026</Text>
        <View style={styles.divider} />

        {/* Introduction */}
        <SectionTitle title="Introduction" />
        <Paragraph text="Welcome to Timely! This privacy policy describes how Timely ('we', 'us', or 'our') collects, uses, and discloses your personal information when you use our mobile booking application (the 'App') and the services provided through the App." />
        <Paragraph text="We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you use our App and tell you about your privacy rights and how the law protects you." />

        {/* 1. Important Information and Who We Are */}
        <SectionTitle title="1. Important Information and Who We Are" />
        <SubSectionTitle title="1.1 Purpose of This Privacy Policy" />
        <Paragraph text="This privacy policy aims to give you information on how Timely collects and processes your personal data through your use of this App, including any data you may provide when you book services, register as a service provider, or contact us." />
        <SubSectionTitle title="1.2 Data Controller" />
        <Paragraph text="Timely is the data controller and responsible for your personal data. If you have any questions about this privacy policy, please contact us at:" />
        <Paragraph text="Email: privacy@timelyapp.com\nAddress: Airport Roundabout, Kumasi - Ash." />
        <SubSectionTitle title="1.3 Key Definitions" />
        <BulletList items={[
          'User: Any individual using the Timely app to book services',
          'Service Provider: Businesses or individuals offering services through the Timely platform',
          'Personal Data: Any information relating to an identified or identifiable natural person',
        ]} />

        {/* 2. The Data We Collect About You */}
        <SectionTitle title="2. The Data We Collect About You" />
        <Paragraph text="We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:" />
        <SubSectionTitle title="2.1 Information Collected From All Users" />
        <BulletList items={[
          'Identity Data: Includes first name, last name, username or similar identifier.',
          'Contact Data: Includes email address, telephone numbers, and billing addresses.',
          'Technical Data: Includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, operating system and platform, and other technology on the devices you use to access this App.',
          'Profile Data: Includes your username and password, bookings made by you, preferences, feedback, and survey responses.',
          'Usage Data: Includes information about how you use our App, products and services.',
          'Marketing and Communications Data: Includes your preferences in receiving marketing from us and our third parties and your communication preferences.',
        ]} />
        <SubSectionTitle title="2.2 Location Data (Service Providers)" />
        <Paragraph text="When you use the location features in our App as a service provider, we collect precise geolocation data (latitude and longitude coordinates) to:" />
        <BulletList items={[
          'Set and save your shop location in our Firestore database',
          'Enable users to get directions to your location',
          'Provide location-based services',
        ]} />
        <Paragraph text="We collect this information only when you grant us permission to access your device's location. You can withdraw this permission at any time through your device settings." />
        <SubSectionTitle title="2.3 Information Collected From Service Providers" />
        <Paragraph text="If you register as a service provider, we collect additional information including:" />
        <BulletList items={[
          'Business name and address',
          'Working days and hours',
          'Service offerings and pricing',
          'Business images/photos',
          'Bank account or payment details (processed through third-party payment processors)',
        ]} />
        <SubSectionTitle title="2.4 Information Collected From Users (Customers)" />
        <Paragraph text="When you book services through our App, we collect:" />
        <BulletList items={[
          'Your name and contact information',
          'Booking dates and times',
          'Service preferences',
          'Payment information (processed securely through third-party payment processors)',
        ]} />
        <SubSectionTitle title="2.5 Information Collected Automatically" />
        <Paragraph text="We automatically collect certain technical data when you visit our App, including:" />
        <BulletList items={[
          'Device information (hardware model, operating system version)',
          'Unique device identifiers',
          'Mobile network information',
          'App usage statistics',
          'IP address',
        ]} />
        <SubSectionTitle title="2.6 Third-Party Data Collection" />
        <Paragraph text="We use third-party services that may collect information about you:" />
        <BulletList items={[
          'Google Maps API: For location services and directions',
          'Firebase/Firestore: For data storage and authentication',
          'Analytics services: To understand how users interact with our App',
        ]} />

        {/* 3. How We Collect Your Personal Data */}
        <SectionTitle title="3. How We Collect Your Personal Data" />
        <SubSectionTitle title="3.1 Direct Interactions" />
        <Paragraph text="You may give us your Identity, Contact, and Profile Data by filling in forms or by corresponding with us by phone, email, or otherwise. This includes personal data you provide when you:" />
        <BulletList items={[
          'Create an account',
          'Book a service',
          'Register as a service provider',
          'Set your shop location',
          'Request marketing to be sent to you',
          'Give us feedback',
        ]} />
        <SubSectionTitle title="3.2 Automated Technologies or Interactions" />
        <Paragraph text="As you interact with our App, we automatically collect Technical Data about your equipment, browsing actions and patterns. We collect this personal data by using cookies and other similar technologies" />
        <SubSectionTitle title="3.3 Third Parties or Publicly Available Sources" />
        <Paragraph text="We may receive personal data about you from various third parties including:" />
        <BulletList items={[
          'Technical Data from analytics providers',
          'Identity and Contact Data from social media platforms when you choose to connect your account',
        ]} />

        {/* 4. How We Use Your Personal Data */}
        <SectionTitle title="4. How We Use Your Personal Data" />
        <SubSectionTitle title="4.1 For All Users" />
        <BulletList items={[
          'To register you as a new user',
          'To manage our relationship with you',
          'To enable you to use our booking services',
          'To administer and protect our business and this App',
          'To deliver relevant App content and measure effectiveness',
          'To use data analytics to improve our App, products, services, and user experience',
        ]} />

        {/* 5. Cookies and Tracking Technologies */}
        <SectionTitle title="5. Cookies and Tracking Technologies" />
        <Paragraph text="Our App uses cookies and similar tracking technologies to track activity on our App and hold certain information. Cookies are files with small amount of data which may include an anonymous unique identifier." />

        {/* 6. How We Share Your Personal Data */}
        <SectionTitle title="6. How We Share Your Personal Data" />
        <SubSectionTitle title="6.1 Service Providers" />
        <Paragraph text="We engage third-party service providers to facilitate our App, provide services on our behalf, or assist us in analyzing how our App is used. These third parties include:" />
        <BulletList items={[
          'Cloud service providers (Firebase/Google Cloud Platform) to store your data',
          'Analytics providers to help us improve our App',
          'Map service providers (Google Maps) to provide location and direction services',
        ]} />
        <SubSectionTitle title="6.2 Between Users and Service Providers" />
        <Paragraph text="When you make a booking through our App, we share relevant booking information (name, contact details, booking time) with the service provider to facilitate the appointment." />
        <SubSectionTitle title="6.3 Legal Requirements" />
        <Paragraph text="We may disclose your personal data if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency)." />
        <SubSectionTitle title="6.4 With Your Consent" />
        <Paragraph text="We may disclose your personal information for any other purpose with your explicit consent." />

        {/* 7. International Data Transfers */}
        <SectionTitle title="7. International Data Transfers" />
        <Paragraph text="Your information, including personal data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction." />
        <Paragraph text="If you are located outside Ghana and choose to provide information to us, please note that we transfer the data to Ghana and process it there." />
        <Paragraph text="Your consent to this privacy policy followed by your submission of such information represents your agreement to that transfer." />

        {/* 8. Data Security */}
        <SectionTitle title="8. Data Security" />
        <Paragraph text="We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. These measures include:" />
        <BulletList items={[
          'Encryption of data in transit and at rest',
          'Regular security assessments',
          'Access controls and authentication procedures',
          'Secure data storage through Firebase/Firestore',
        ]} />
        <Paragraph text="We follow industry-standard practices to protect your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security." />

        {/* 9. Data Retention */}
        <SectionTitle title="9. Data Retention" />
        <Paragraph text="We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements." />
        <SubSectionTitle title="9.1 Retention Periods" />
        <BulletList items={[
          'Account information: Retained for as long as you have an active account with us',
          'Booking records: Retained for 5 years to maintain booking history and for legal purposes',
          'Secure data storage through Firebase/Firestore',
        ]} />

        {/* 10. Your Legal Rights */}
        <SectionTitle title="10. Your Legal Rights" />
        <SubSectionTitle title="10.1 Right to Access" />
        <Paragraph text="You have the right to request access to your personal data (commonly known as a 'data subject access request'). This enables you to receive a copy of the personal data we hold about you and to check that we are lawfully processing it." />
        <SubSectionTitle title="10.2 Right to Correction" />
        <Paragraph text="You have the right to request correction of the personal data that we hold about you. This enables you to have any incomplete or inaccurate data we hold about you corrected." />
        <SubSectionTitle title="10.3 Right to Erasure (Right to be Forgotten)" />
        <Paragraph text="You have the right to request erasure of your personal data where there is no good reason for us continuing to process it. This includes the right to ask us to delete or remove your personal data where you have exercised your right to object to processing." />
        <SubSectionTitle title="10.4 Right to Restrict Processing" />
        <Paragraph text="You have the right to request restriction of processing of your personal data in certain circumstances." />
        <SubSectionTitle title="10.5 Right to Data Portability" />
        <Paragraph text="You have the right to request that we transfer your personal data to you or to a third party in a structured, commonly used, machine-readable format." />
        <SubSectionTitle title="10.6 Right to Object" />
        <Paragraph text="You have the right to object to processing of your personal data where we are relying on a legitimate interest and there is something about your particular situation which makes you want to object to processing on this ground." />
        <SubSectionTitle title="10.7 Right to Withdraw Consent" />
        <Paragraph text="You have the right to withdraw your consent at any time where we are relying on consent to process your personal data. This includes withdrawing consent for location data collection." />
        <SubSectionTitle title="10.8 Account Deletion" />
        <Paragraph text="You have the right to request deletion of your account at any time. You can do this by:" />
        <BulletList items={[
          'Accessing your account settings within the App',
          'Contacting us directly at privacy@timelyapp.com',
        ]} />
        <Paragraph text="Upon account deletion, we will delete or anonymize your personal data, unless we need to retain certain information for legitimate business purposes or legal obligations." />

        {/* 11. Children's Privacy */}
        <SectionTitle title="11. Children's Privacy" />
        <Paragraph text="Our App is not intended for children under the age of 13 (or 16 in certain jurisdictions). We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us. If we become aware that we have collected personal data from a child without verification of parental consent, we take steps to remove that information from our servers." />

        {/* 12. Third-Party Links and Services */}
        <SectionTitle title="12. Third-Party Links and Services" />
        <Paragraph text="Our App may contain links to other websites or services that are not operated by us. This privacy policy does not cover how those third parties process your information. We strongly advise you to review the privacy policy of every site or service you visit." />
        <Paragraph text="We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services." />

        {/* 13. Changes to This Privacy Policy */}
        <SectionTitle title="13. Changes to This Privacy Policy" />
        <Paragraph text="We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the 'Last updated' date at the top of this privacy policy." />
        <Paragraph text="We will let you know via email and/or a prominent notice on our App prior to the change becoming effective. You are advised to review this privacy policy periodically for any changes. Changes to this privacy policy are effective when they are posted on this page." />

        {/* 14. Your California Privacy Rights */}
        <SectionTitle title="14. Your California Privacy Rights (For California Residents)" />
        <Paragraph text="If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA):" />
        <BulletList items={[
          'Right to know what personal information we collect, use, disclose, and sell',
          'Right to request deletion of your personal information',
          'Right to opt-out of the sale or sharing of your personal information',
          'Right to correct inaccurate personal information',
          'Right to limit use and disclosure of sensitive personal information',
          'Right to non-discrimination for exercising your CCPA rights',
        ]} />
        <Paragraph text="We do not sell your personal information. To exercise your California privacy rights, please contact us using the information provided below." />

        {/* 15. Your GDPR Rights */}
        <SectionTitle title="15. Your GDPR Rights (For European Economic Area Residents)" />
        <Paragraph text="If you are located in the European Economic Area (EEA), you have additional rights under the General Data Protection Regulation (GDPR):" />
        <BulletList items={[
          'The right to lodge a complaint with a supervisory authority',
          'The right to be informed about any automated decision-making and profiling',
          'Additional information about international data transfers and safeguards',
        ]} />
        <Paragraph text="We process your data based on the legal bases outlined in Section 4.4 of this policy." />

        {/* 16. Specific App Permissions */}
        <SectionTitle title="16. Specific App Permissions" />
        <SubSectionTitle title="16.1 Location Permission" />
        <Paragraph text="Our App requests access to your device's location:" />
        <BulletList items={[
          'For service providers: To capture and save your shop location coordinates in Firestore',
          'For users: To provide accurate directions to service provider locations via Google Maps',
        ]} />
        <Paragraph text="We only access your location when you grant permission and for the specific purposes described. You can revoke this permission at any time through your device settings." />
        <SubSectionTitle title="16.2 Camera Permission" />
        <Paragraph text="We may request camera access to allow you to:" />
        <BulletList items={[
          'Upload profile photos',
          'Capture images of services or locations',
        ]} />
        <SubSectionTitle title="16.3 Storage Permission" />
        <Paragraph text="We may request storage access to:" />
        <BulletList items={[
          'Save and upload images',
          'Cache app data for improved performance',
        ]} />

        {/* 17. Contact Us */}
        <SectionTitle title="17. Contact Us" />
        <Paragraph text="If you have any questions about this privacy policy or our data practices, please contact us:" />
        <BulletList items={[
          'By email: privacy@timelyapp.com',
          'By phone: +233244032237',
        ]} />

        {/* 18. Complaints */}
        <SectionTitle title="18. Complaints" />
        <Paragraph text="You have the right to make a complaint at any time to your local data protection authority. We would, however, appreciate the chance to deal with your concerns before you approach them, so please contact us in the first instance." />

        {/* Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerText}>
            This privacy policy was last updated on February 26, 2026.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
  header: {
    backgroundColor: PURPLE,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PURPLE,
    marginTop: 20,
    marginHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 14,
    fontStyle: 'italic',
    color: GRAY_600,
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: GRAY_300,
    marginVertical: 16,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 20,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginVertical: 4,
    marginHorizontal: 20,
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    backgroundColor: GRAY_100,
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
    color: '#333',
    width: 14,
  },
  bulletText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  footerBox: {
    backgroundColor: GRAY_100,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GRAY_300,
  },
  footerText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: GRAY_600,
    textAlign: 'center',
  },
});