// /src/routes/RootNav.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useAuth } from '../providers/AuthProvider';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export default function RootNav() {
    const { session, loading } = useAuth();
    if (loading) return null;

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {session ? (
                    <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Skate Bounty' }} />
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
