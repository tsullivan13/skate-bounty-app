// app/(tabs)/create.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { Alert, Button, FlatList, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchSpots, Spot } from "../../src/lib/spots";
import { uploadBountyImage } from "../../src/lib/upload";
import { useAuth } from "../../src/providers/AuthProvider";

export default function CreateBounty() {
    const { session } = useAuth();
    const [trick, setTrick] = useState("");
    const [reward, setReward] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imagePayload, setImagePayload] = useState<{ file?: File | Blob; base64?: string; contentType?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const [spots, setSpots] = useState<Spot[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
    const [loadingSpots, setLoadingSpots] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const all = await fetchSpots();
                setSpots(all);
                if (all.length) setSelectedSpotId(all[0].id);
            } catch (e) {
                console.log("load spots for picker error:", e);
            } finally {
                setLoadingSpots(false);
            }
        })();
    }, []);

    const pickImage = async () => {
        try {
            if (Platform.OS === "web") {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (file) {
                        setImagePayload({ file });
                        const reader = new FileReader();
                        reader.onload = () => setImagePreview(reader.result as string);
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== "granted") {
                    Alert.alert("Permission required", "We need access to your photos.");
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                    quality: 0.8,
                    base64: true,
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                });
                if (!result.canceled && result.assets?.length) {
                    const asset = result.assets[0];
                    setImagePreview(asset.uri ?? null);
                    if (asset.base64) {
                        const ct = asset.uri?.endsWith(".png") ? "image/png" : "image/jpeg";
                        setImagePayload({ base64: asset.base64, contentType: ct });
                    }
                }
            }
        } catch (e: any) {
            console.log("Image pick error:", e);
            Alert.alert("Error", e?.message ?? "Could not select image.");
        }
    };

    const submit = async () => {
        try {
            setLoading(true);

            const t = trick.trim();
            const rewardNum = Number(reward);

            if (!t) return Alert.alert("Missing info", "Please enter a trick name.");
            if (!reward || Number.isNaN(rewardNum) || rewardNum <= 0) {
                return Alert.alert("Invalid reward", "Enter a positive number.");
            }
            if (!session) return Alert.alert("Not signed in", "Please sign in and try again.");
            if (!selectedSpotId) return Alert.alert("Pick a spot", "Select a spot to attach this bounty.");

            let imageUrl: string | undefined;
            if (imagePayload) {
                imageUrl = await uploadBountyImage({ ...imagePayload, userId: session.user.id });
            }

            const { data, error } = await (await import("../../src/lib/supabase")).supabase
                .from("bounties")
                .insert([{ user_id: session.user.id, trick: t, reward: rewardNum, image_url: imageUrl ?? null, spot_id: selectedSpotId }])
                .select()
                .single();

            if (error) throw error;

            Alert.alert("Success", "Bounty created!");
            setTrick(""); setReward("");
            setImagePreview(null); setImagePayload(null);
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

            {/* Spot Picker */}
            <Text style={{ fontWeight: "700", marginTop: 8 }}>Spot</Text>
            {loadingSpots ? (
                <Text>Loading spots…</Text>
            ) : spots.length === 0 ? (
                <Text>No spots yet. Create one in the Spots tab.</Text>
            ) : (
                <FlatList
                    data={spots}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item }) => {
                        const selected = item.id === selectedSpotId;
                        return (
                            <Pressable
                                onPress={() => setSelectedSpotId(item.id)}
                                style={[styles.spotRow, selected && styles.spotRowSelected]}
                            >
                                {item.image_url ? (
                                    <Image source={{ uri: item.image_url }} style={{ width: 44, height: 44, borderRadius: 6, marginRight: 10 }} />
                                ) : <View style={{ width: 44, height: 44, borderRadius: 6, marginRight: 10, backgroundColor: "#eee" }} />}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: "700" }}>{item.title}</Text>
                                    <Text style={{ opacity: 0.6, fontSize: 12 }}>
                                        {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                                    </Text>
                                </View>
                                <Text>{selected ? "●" : "○"}</Text>
                            </Pressable>
                        );
                    }}
                />
            )}

            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Button title="Pick photo" onPress={pickImage} />
                {imagePreview ? <Image source={{ uri: imagePreview }} style={{ width: 60, height: 60, borderRadius: 8 }} /> : null}
            </View>

            <Button title={loading ? "Saving..." : "Submit"} onPress={submit} disabled={loading} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12 },
    title: { fontSize: 24, fontWeight: "700" },
    input: { borderWidth: 1, borderRadius: 8, padding: 12 },
    spotRow: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 10,
        marginVertical: 6,
        flexDirection: "row",
        alignItems: "center",
    },
    spotRowSelected: {
        backgroundColor: "#f4f4f4",
    },
});
