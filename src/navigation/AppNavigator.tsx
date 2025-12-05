import React from 'react';
import {TouchableOpacity, Text, StyleSheet, Alert} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {CommonActions} from '@react-navigation/native';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import LoggedInScreen from '../screens/LoggedInScreen';
import ChatScreen from '../screens/ChatScreen';
import {clearPatientAuth} from '../features/auth';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Logout Button Component for header
const LogoutButton = ({navigation}: {navigation: any}) => {
  const handleLogout = () => {
    Alert.alert(
      'End Consultation',
      'Are you sure you want to end this consultation and logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearPatientAuth();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{name: 'Login'}],
              }),
            );
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={styles.logoutButton}
      onPress={handleLogout}
      activeOpacity={0.7}>
      <Text style={styles.logoutIcon}>⏻</Text>
    </TouchableOpacity>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: {backgroundColor: '#0D1B2A'},
        }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="LoggedIn" component={LoggedInScreen} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({navigation}) => ({
            headerShown: true,
            headerTitle: '❤️ HridAI Consultation',
            headerStyle: {
              backgroundColor: '#0D1B2A',
            },
            headerTintColor: '#DC3545',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
            },
            headerBackTitle: 'Back',
            headerShadowVisible: false,
            headerRight: () => <LogoutButton navigation={navigation} />,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 53, 69, 0.3)',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 4,
  },
  logoutIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AppNavigator;
