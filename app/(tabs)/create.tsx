// app/(tabs)/create.tsx
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { createBounty } from "../../src/lib/bounties";
import { useAuth } from "../../src/providers/AuthProvider";

export default function CreateBounty() {
    const { session } = useAuth();
    const [trick, setTrick] = useState("");
    const [reward, setReward] = useState(""); // text input state
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        try {
            setLoading(true);

            const t = trick.trim();
            const rewardNum = Number(reward); // convert to number

            if (!t) {
                Alert.alert("Missing info", "Please enter a trick name.");
                return;
            }
            if (!reward || Number.isNaN(rewardNum) || rewardNum <= 0) {
                Alert.alert("Invalid reward", "Enter a positive number (e.g., 25 or 25.50).");
                return;
            }
            if (!session) {
                Alert.alert("Not signed in", "Please sign in and try again.");
                return;
            }

            await createBounty(session, t, rewardNum);

            Alert.alert("Success", "Bounty created!");
            setTrick("");
            setReward("");
        } catch (e: any) {
            console.log("Create error:", e);
            Alert.alert("Error", e?.message ?? "Failed to create bounty.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create a Bounty</Text>

            <TextInput
                placeholder="Trick name (e.g., Kickflip 5-stair)"
                value={trick}
                onChangeText={setTrick}
                style={styles.input}
            />

            <TextInput
                placeholder="Reward amount (USD)"
                value={reward}
                onChangeText={setReward}
                keyboardType="numeric"
                style={styles.input}
            />

            <Button
                title={loading ? "Saving..." : "Submit"}
                onPress={submit}
                disabled={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12 },
    title: { fontSize: 24, fontWeight: "700" },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
    },
});
