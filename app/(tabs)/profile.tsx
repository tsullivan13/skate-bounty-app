// app/(tabs)/profile.tsx
import React, { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { getMyProfile, Profile, upsertMyHandle } from "../../src/lib/profiles";
import { useAuth } from "../../src/providers/AuthProvider";

export default function ProfileTab() {
    const { session, signOut } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [handle, setHandle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!session) return;
        (async () => {
            try {
                const p = await getMyProfile(session);
                setProfile(p);
                setHandle(p?.handle ?? "");
            } catch (e) {
                console.log("Load profile error:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [session]);

    const save = async () => {
        try {
            if (!session) return;
            const trimmed = handle.trim();
            if (!trimmed) {
                Alert.alert("Handle required", "Please enter a handle.");
                return;
            }
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
                Alert.alert("Invalid handle", "Use 3–20 letters, numbers, or underscore.");
                return;
            }
            setSaving(true);
            const p = await upsertMyHandle(session, trimmed);
            setProfile(p);
            Alert.alert("Saved", "Your handle has been updated.");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to save handle.");
            console.log("Save profile error:", e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading profile…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Profile</Text>
            <Text>Email: {session?.user?.email}</Text>
            <Text>User ID: {session?.user?.id}</Text>

            <View style={{ height: 16 }} />

            <Text style={{ fontWeight: "600" }}>Handle</Text>
            <TextInput
                placeholder="e.g., tim_skates"
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                style={styles.input}
            />

            <Button title={saving ? "Saving..." : "Save"} onPress={save} disabled={saving} />

            <View style={{ height: 24 }} />

            <Button title="Sign Out" onPress={signOut} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12, flex: 1 },
    title: { fontSize: 24, fontWeight: "700" },
    input: { borderWidth: 1, borderRadius: 8, padding: 12 },
});
