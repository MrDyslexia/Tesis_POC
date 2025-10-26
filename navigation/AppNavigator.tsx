// navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DeviceInfo from 'react-native-device-info';

import { isWear } from '../utils/device';
import PhoneHome from '../screens/phone/HomeScreen';
import WearHome from '../screens/wear/HomeScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const model = DeviceInfo.getModel();
  const HomeComponent = isWear(model) ? WearHome : PhoneHome;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeComponent} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
