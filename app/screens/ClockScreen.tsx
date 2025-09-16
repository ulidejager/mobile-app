import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Alert, Button, Dimensions, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

interface ClockScreenProps {
  userId: number;
  userName: string;
}

export default function ClockScreen({ userId, userName }: ClockScreenProps) {
  const [log, setLog] = useState<string>('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [timestamp, setTimestamp] = useState<string>('');

  const BACKEND_URL = 'http://192.168.0.185:8081'; // <-- replace with your computer's LAN IP

  const handleClockIn = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required.');
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const currentTime = new Date().toISOString();

    setLocation(currentLocation);
    setTimestamp(currentTime);
    setLog('Clock-in recorded');

    // Send to backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          timestamp: currentTime,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Alert.alert('Success', 'Clock-in recorded!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {userName}</Text>
      <Button title="Clock In" onPress={handleClockIn} />

      {log && location && (
        <>
          <View style={styles.logBox}>
            <Text style={styles.logText}>📍 {log}</Text>
            <Text style={styles.logText}>🕒 Time: {timestamp}</Text>
            <Text style={styles.logText}>🌐 Latitude: {location.coords.latitude}</Text>
            <Text style={styles.logText}>🌐 Longitude: {location.coords.longitude}</Text>
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="You are here"
            />
          </MapView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, marginBottom: 20 },
  logBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    width: '100%',
  },
  logText: {
    fontSize: 16,
    marginBottom: 6,
  },
  map: {
    marginTop: 20,
    width: width - 40,
    height: height / 3,
    borderRadius: 10,
  },
});
