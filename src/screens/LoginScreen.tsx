// /src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);

    const auth = async () => {
        try {
            setLoading(true);
            if (isSignup) {
                const { error } = await supabase.auth.signUp({ email, password: pw });
                if (error) throw error;
                Alert.alert('Check your email', 'Confirm your account then sign in.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
                if (error) throw error;
            }
        } catch (e: any) {
            Alert.alert('Auth error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '700' }}>{isSignup ? 'Create account' : 'Sign in'}</Text>
            <TextInput
                placeholder="email@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
            />
            <TextInput
                placeholder="password"
                value={pw}
                onChangeText={setPw}
                secureTextEntry
                style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
            />
            <Button title={loading ? 'Please wait...' : (isSignup ? 'Sign up' : 'Sign in')} onPress={auth} disabled={loading} />
            <Text style={{ textAlign: 'center', marginTop: 8 }} onPress={() => setIsSignup(!isSignup)}>
                {isSignup ? 'Have an account? Sign in' : "New here? Create account"}
            </Text>
        </View>
    );
}
