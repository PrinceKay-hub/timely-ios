import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { CategoryStep } from './steps/CategoryStep';
import { DescriptionStep } from './steps/DescriptionStep';
import { LocationStep } from './steps/LocationStep';
import { WorkingHoursStep } from './steps/WorkingHoursStep';
import { ServicesStep } from './steps/ServicesStep';
import { PhotosStep } from './steps/PhotosStep';

interface Props {
  userId: string;
}

export const ServiceRegistrationForm: React.FC<Props> = ({  userId }) => {
  const { step } = useServiceRegistrationStore();;

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
});