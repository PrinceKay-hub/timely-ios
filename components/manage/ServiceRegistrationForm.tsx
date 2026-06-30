import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { CategoryStep } from './steps/CategoryStep';
import { DescriptionStep } from './steps/DescriptionStep';
import { LocationStep } from './steps/LocationStep';
import { WorkingHoursStep } from './steps/WorkingHoursStep';
import { ServicesStep } from './steps/ServicesStep';
import { PhotosStep } from './steps/PhotosStep';

const PURPLE = '#8B5CF6';

interface Props {
  userId: string;
}

export const ServiceRegistrationForm: React.FC<Props> = ({ userId }) => {
  const { step, currentService } = useServiceRegistrationStore();

  // Guard at the top: no step component below should ever need to
  // worry about currentService being null. This is the one place
  // that decides whether it's safe to render a step.
  if (!currentService) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1: return <BasicInfoStep />;
      case 2: return <CategoryStep />;
      case 3: return <DescriptionStep />;
      case 4: return <LocationStep />;
      case 5: return <WorkingHoursStep />;
      case 6: return <ServicesStep />;
      case 7: return <PhotosStep userId={userId} />;
      default: return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderStep()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
});