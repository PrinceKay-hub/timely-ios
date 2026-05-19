
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast } from 'react-native-toast-message';

export const toastConfig = {
  notification: ({ text1, text2 }: any) => (
    <View style={styles.container}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.body}>{text2}</Text> : null}
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    color: '#1c1c1e',
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    color: '#38383999',
    fontSize: 13,
    marginTop: 3,
  },
});