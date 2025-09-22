import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUser } from '../../app/contexts/UserContext';
import BACKEND_URL from '../../config/backend'; // <- path outside app/

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { setUser } = useUser();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const endpoint = isRegister ? '/api/register' : '/api/login';
      const payload = isRegister
        ? { name, email, passwordHash: password }
        : { email, passwordHash: password };

      const response = await axios.post(`${BACKEND_URL}${endpoint}`, payload, {
        timeout: 5000,
      });

      if (isRegister) {
        Alert.alert('Success', 'Account created! Please log in.');
        setIsRegister(false);
        setPassword('');
      } else {
        setUser({ userId: response.data.userId, userName: response.data.userName });
        router.replace('/ClockScreen'); // <-- Expo Router navigation
      }
    } catch (err: any) {
      if (err.response) {
        // Backend returned a response
        Alert.alert('Error', err.response.data.message || 'Server error');
      } else if (err.request) {
        // Request was made but no response
        Alert.alert('Error', 'No response from server. Check your network.');
      } else {
        // Something else
        Alert.alert('Error', err.message);
      }
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? 'Register' : 'Login'}</Text>

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
        keyboardType="email-address"
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
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center', color: '#000' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
    color: '#000',
    backgroundColor: '#fff',
  },
});