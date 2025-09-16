import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClockScreen from './app/screens/ClockScreen';
import LoginScreen from './app/screens/LoginScreen';

export default function App() {
  // Holds the currently logged-in user
  const [user, setUser] = useState<{ userId: number; userName: string } | null>(null);

  // Callback passed to LoginScreen
  const handleLogin = (userId: number, userName: string) => {
    setUser({ userId, userName });
  };

  return (
<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
  {user ? (
    <ClockScreen userId={user.userId} userName={user.userName} />
  ) : (
    <LoginScreen onLogin={handleLogin} />
  )}
</SafeAreaView>

  );
}
