import React from 'react';
import { StyleSheet } from 'react-native';
import LoginScreen from '../screens/LoginScreen';

interface LoginScreenProps {
  onLogin: (userId: number, userName: string) => void;
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
});

export default function TabIndex() {
  return <LoginScreen />;
}
