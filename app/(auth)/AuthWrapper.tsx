import React, { useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignupScreen';

interface Props {
  route?: { params?: { from?: string } };
}

export default function AuthWrapper({ route }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const from = route?.params?.from;

  const toggleAuthMode = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsLogin(!isLogin);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {isLogin ? (
          <LoginScreen onToggle={toggleAuthMode} from={from} />
        ) : (
          <SignUpScreen onToggle={toggleAuthMode} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});