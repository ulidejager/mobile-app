import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useUser } from '../../app/contexts/UserContext';
import BACKEND_URL from '../../config/backend';

const mockStock = [
  { id: '1', name: 'Parts A', partNumber: 'WA-1001', quantity: 12 },
  { id: '2', name: 'Parts B', partNumber: 'GB-2002', quantity: 7 },
  { id: '3', name: 'Component C', partNumber: 'CC-3003', quantity: 25 },
  { id: '4', name: 'Module D', partNumber: 'MD-4004', quantity: 3 },
];

export default function ClockScreen() {
  const { user, setUser } = useUser();
  const [clockedIn, setClockedIn] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showPortal, setShowPortal] = useState(true);
  const router = useRouter();

  // Reset session state when user changes (login/logout)
  useEffect(() => {
    setShowPortal(true);
    setClockedIn(false);
    setLocation(null);
  }, [user]);

  const handleClockIn = async () => {
    if (!user) return;

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required to clock in.');
      return;
    }

    let loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    setLocation({ latitude, longitude });

    // Prompt for photo
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      base64: true,
    });

    if (result.canceled) {
      Alert.alert('Photo required', 'You must take a photo to clock in.');
      return;
    }

    const photo = result.assets?.[0]?.base64;

    try {
      await axios.post(`${BACKEND_URL}/api/clock-in`, {
        userId: user.userId,
        clockedInTime: new Date().toISOString(),
        latitude,
        longitude,
        photo: photo || null,
      }, { timeout: 5000 });

      setClockedIn(true);
      Alert.alert('Success', 'Clock-in recorded!');
    } catch (err: any) {
      Alert.alert('Error', 'Could not clock in.');
      console.error(err);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;

    try {
      await axios.post(`${BACKEND_URL}/api/clock-out`, {
        userId: user.userId,
        clockedOutTime: new Date().toISOString(),
      }, { timeout: 5000 });

      setClockedIn(false);
      Alert.alert('Success', 'Clock-out recorded!');
    } catch (err: any) {
      Alert.alert('Error', 'Could not clock out.');
      console.error(err);
    }
  };

  const handleLogout = () => {
    if (clockedIn) {
      Alert.alert(
        'Still Clocked In',
        'Please clock out before logging out.',
        [{ text: 'OK' }]
      );
      return;
    }
    setUser(null);
    router.replace('/');
  };

  // Show stock portal first
  if (showPortal) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Stock Portal</Text>
        <FlatList
          data={mockStock}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <View style={styles.stockCard}>
              <Text style={styles.stockName}>{item.name}</Text>
              <Text style={styles.stockInfo}>Part #: {item.partNumber}</Text>
              <Text style={styles.stockInfo}>Qty: {item.quantity}</Text>
            </View>
          )}
        />
        <TouchableOpacity style={styles.portalButton} onPress={() => setShowPortal(false)}>
          <Text style={styles.portalButtonText}>Continue to Clock In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show clock-in UI after portal
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.userName}</Text>
      <Button
        title={clockedIn ? 'Clocked In' : 'Clock In'}
        onPress={handleClockIn}
        disabled={clockedIn}
      />
      {clockedIn && location && (
        <>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker coordinate={location} title="You are here" />
            </MapView>
          </View>
          <TouchableOpacity style={styles.clockOutButton} onPress={handleClockOut}>
            <Text style={styles.clockOutButtonText}>Clock Out</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 24, marginBottom: 20, color: '#000' },
  mapContainer: {
    marginTop: 30,
    width: Dimensions.get('window').width - 40,
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#0077b6',
  },
  map: {
    flex: 1,
  },
  portalButton: {
    marginTop: 24,
    backgroundColor: '#0077b6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  portalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stockCard: {
    backgroundColor: '#E6F4FE',
    borderRadius: 10,
    padding: 16,
    margin: 8,
    width: (Dimensions.get('window').width - 80) / 2,
    alignItems: 'center',
    elevation: 2,
  },
  stockName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#0077b6',
  },
  stockInfo: {
    color: '#333',
    fontSize: 14,
    marginBottom: 2,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: '#e63946',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clockOutButton: {
    marginTop: 24,
    backgroundColor: '#2a9d8f',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  clockOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
