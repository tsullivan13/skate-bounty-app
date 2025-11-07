// app/(tabs)/create.tsx
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function CreateBounty() {
    const [trick, setTrick] = useState("");
    const [reward, setReward] = useState("");

    const handleSubmit = () => {
        // tomorrow: save to Supabase
        alert(`Pretending to submit:\nTrick: ${trick}\nReward: $${reward}`);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create a Bounty</Text>

            <TextInput
                placeholder="Trick name"
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

            <Button title="Submit" onPress={handleSubmit} />
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

