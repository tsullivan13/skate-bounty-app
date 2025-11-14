// src/screens/LoginScreen.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";

/**
 * This screen supports:
 * - Sign up (email/password)
 * - Sign in (email/password)
 * - Inline error surfacing (including 422s from Supabase)
 *
 * Notes:
 * - Make sure Supabase Auth → Email provider is enabled and "Allow new users to sign up" is ON.
 * - For quick dev, you can disable "Email confirmations". If enabled, the new user must confirm via email before sign-in.
 */
export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const normalizeError = (e: unknown) => {
        if (!e) return "Unknown error";
        if (typeof e === "string") return e;
        if (typeof e === "object" && (e as any).message) return String((e as any).message);

        try {
            return JSON.stringify(e);
        } catch {
            return "Unknown error";
        }
    };

    const auth = async () => {
        setFormError(null);
        setLoading(true);
        try {
            if (!email || !pw) {
                throw new Error("Please enter email and password.");
            }

            if (isSignup) {
                const { error } = await supabase.auth.signUp({ email, password: pw });
                if (error) throw error;
                // If email confirmations are ON, user must confirm before sign-in will succeed.
                setFormError("Account created. If confirmations are enabled, check your email to confirm.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
                if (error) throw error;
                // Success → route to tabs root
                router.replace("/");
            }
        } catch (e: any) {
            // e.message comes from Supabase; for 422s you'll typically see:
            // - "Signups not allowed" (if disabled)
            // - "User already registered"
            // - "Password should be at least X characters"
            setFormError(normalizeError(e));
            console.log("Auth error:", e); // Dev-only
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: "700" }}>
                {isSignup ? "Create account" : "Sign in"}
            </Text>

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

            <Button
                title={loading ? "Please wait..." : isSignup ? "Sign up" : "Sign in"}
                onPress={auth}
                disabled={loading}
            />

            {formError ? (
                <Text style={{ color: "#b00020", marginTop: 8 }}>{formError}</Text>
            ) : null}

            <Text
                style={{ textAlign: "center", marginTop: 8 }}
                onPress={() => setIsSignup(!isSignup)}
            >
                {isSignup ? "Have an account? Sign in" : "New here? Create account"}
            </Text>
        </View>
    );
}
