// app/(tabs)/profile.tsx
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/providers/AuthProvider";

export default function ProfileTab() {
    const { session, signOut } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Profile</Text>
            <Text>Email: {session?.user?.email}</Text>
            <Text>User ID: {session?.user?.id}</Text>

            <View style={{ marginTop: 20 }}>
                <Button title="Sign Out" onPress={signOut} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12 },
    title: { fontSize: 24, fontWeight: "700" },
});
