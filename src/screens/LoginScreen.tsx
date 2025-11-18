// src/screens/LoginScreen.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radius, space } from "../../constants/theme";
import { supabase } from "../lib/supabase";
import { Button, Card, H2, Input, Muted, Screen, Title } from "../ui/primitives";

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
        <Screen>
            <Card elevated style={styles.card}>
                <Title>{isSignup ? "Create account" : "Welcome back"}</Title>
                <Muted>{isSignup ? "Sign up with email and password." : "Sign in to continue."}</Muted>

                <View style={{ gap: space.sm }}>
                    <View style={{ gap: space.xs }}>
                        <H2>Email</H2>
                        <Input
                            placeholder="email@example.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={{ gap: space.xs }}>
                        <H2>Password</H2>
                        <Input
                            placeholder="••••••••"
                            value={pw}
                            onChangeText={setPw}
                            secureTextEntry
                        />
                    </View>
                </View>

                {formError ? <Text style={styles.error}>{formError}</Text> : null}

                <View style={{ gap: space.sm }}>
                    <Button onPress={auth} loading={loading}>
                        {isSignup ? "Create account" : "Sign in"}
                    </Button>

                    <Button kind="ghost" onPress={() => setIsSignup(!isSignup)}>
                        {isSignup ? "Have an account? Sign in" : "New here? Create account"}
                    </Button>
                </View>
            </Card>

            <Card>
                <H2>Tips</H2>
                <Muted>
                    Ensure Supabase email auth is enabled and confirmations are handled if required. Password
                    must meet your Supabase policy.
                </Muted>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: space.md,
    },
    error: {
        color: palette.danger,
        backgroundColor: palette.subtle,
        borderRadius: radius.md,
        padding: space.sm,
    },
});
