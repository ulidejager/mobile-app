import * as Crypto from 'expo-crypto';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

interface LoginScreenProps {
  onLogin: (userId: number, userName: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const hashPassword = async (pw: string) => {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pw);
  };

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const passwordHash = await hashPassword(password);

    try {
      // Replace this URL with your real API endpoint later
      const endpoint = isRegister ? '/api/register' : '/api/login';

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, passwordHash }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isRegister) {
          Alert.alert('Success', 'Account created! Please log in.');
          setIsRegister(false);
          setPassword('');
        } else {
          // data should contain userId and userName
          onLogin(Number(data.userId), String(data.userName));
        }
      } else {
        Alert.alert('Error', data.message || 'Something went wrong');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? 'Register' : 'Worker Login'}</Text>

      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title={isRegister ? 'Sign Up' : 'Login'} onPress={handleSubmit} />
      <Button
        title={isRegister ? 'Back to Login' : 'Create Account'}
        onPress={() => setIsRegister(!isRegister)}
      />
    </View>
  );
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
