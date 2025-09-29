import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUser } from '../../app/contexts/UserContext';
import BACKEND_URL from '../../config/backend';

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { setUser } = useUser();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userExists, setUserExists] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  // Check if user exists and has a photo
  const checkUser = async () => {
    if (!email || !password) {
      setUserExists(false);
      setHasPhoto(false);
      return;
    }
    try {
      const response = await axios.post(`${BACKEND_URL}/api/check-user`, { email, passwordHash: password });
      setUserExists(response.data.exists);
      // Do NOT set hasPhoto here
      if (response.data.photo) setPhoto(response.data.photo);
    } catch (err) {
      setUserExists(false);
      setHasPhoto(false);
    }
  };

  React.useEffect(() => {
    checkUser();
  }, [email, password]);

  const handleAddPhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      base64: true,
      quality: 0.5, // Compress image to 50% quality
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    setPhoto(result.assets[0].base64 || null);

    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password first.');
      return;
    }
    try {
      const check = await axios.post(`${BACKEND_URL}/api/check-user`, { email, passwordHash: password });
      if (!check.data.exists) {
        Alert.alert('Error', 'User does not exist. Please register or check your credentials.');
        return;
      }
      if (!result.assets[0].base64) {
        Alert.alert('Error', 'Photo could not be processed. Try again.');
        return;
      }
      await axios.post(`${BACKEND_URL}/api/add-photo`, {
        email,
        photo: result.assets[0].base64,
      });
      Alert.alert('Success', 'Photo uploaded!');
      setHasPhoto(true);
      checkUser();
    } catch (err) {
      Alert.alert('Error', 'Could not upload photo.');
    }
  };

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
        checkUser(); // <-- Add this line
      } else {
        setUser({ userId: response.data.userId, userName: response.data.userName });
        checkUser(); // <-- Add this line
        router.replace('/ClockScreen');
      }
    } catch (err: any) {
      if (err.response) {
        Alert.alert('Error', err.response.data.message || 'Server error');
      } else if (err.request) {
        Alert.alert('Error', 'No response from server. Check your network.');
      } else {
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

      {/* Always show Add Photo button */}
      {!isRegister && (
        <Button title="Add Photo" onPress={handleAddPhoto} />
      )}

      {photo && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${photo}` }}
          style={{ width: 100, height: 100, marginVertical: 10, borderRadius: 8 }}
        />
      )}

      <Button
        title={isRegister ? 'Sign Up' : 'Login'}
        onPress={handleSubmit}
        disabled={
          isRegister
            ? !email || !password || !name
            : !email || !password || !userExists || !hasPhoto
        }
      />
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