// app/(tabs)/spots.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { Alert, Button, FlatList, Image, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { createSpot, fetchSpots, Spot } from "../../src/lib/spots";
import { uploadBountyImage } from "../../src/lib/upload";
import { useAuth } from "../../src/providers/AuthProvider";

export default function SpotsTab() {
    const { session } = useAuth();
    const [title, setTitle] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imagePayload, setImagePayload] = useState<{ file?: File | Blob; base64?: string; contentType?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loadingList, setLoadingList] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const s = await fetchSpots();
                setSpots(s);
            } catch (e) {
                console.log("load spots error:", e);
            } finally {
                setLoadingList(false);
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
            if (!session) {
                Alert.alert("Not signed in", "Please sign in and try again.");
                return;
            }
            const t = title.trim();
            const latNum = Number(lat);
            const lngNum = Number(lng);
            if (!t) return Alert.alert("Missing", "Enter a spot title.");
            if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return Alert.alert("Invalid", "Enter numeric lat/lng.");

            setLoading(true);

            let imageUrl: string | undefined;
            if (imagePayload) {
                imageUrl = await uploadBountyImage({ ...imagePayload, userId: session.user.id });
            }

            const newSpot = await createSpot(session, t, latNum, lngNum, imageUrl ?? null);
            setSpots((prev) => [newSpot, ...prev]);

            setTitle(""); setLat(""); setLng("");
            setImagePreview(null); setImagePayload(null);
            Alert.alert("Success", "Spot created!");
        } catch (e: any) {
            console.log("create spot error:", e);
            Alert.alert("Error", e?.message ?? "Failed to create spot.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create a Spot</Text>

            <TextInput
                placeholder="Spot title (e.g., Library 5-stair)"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
            />
            <TextInput
                placeholder="Latitude (e.g., 44.0582)"
                value={lat}
                onChangeText={setLat}
                keyboardType="numeric"
                style={styles.input}
            />
            <TextInput
                placeholder="Longitude (e.g., -121.3153)"
                value={lng}
                onChangeText={setLng}
                keyboardType="numeric"
                style={styles.input}
            />

            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Button title="Pick photo" onPress={pickImage} />
                {imagePreview ? <Image source={{ uri: imagePreview }} style={{ width: 60, height: 60, borderRadius: 8 }} /> : null}
            </View>

            <Button title={loading ? "Saving..." : "Save Spot"} onPress={submit} disabled={loading} />

            <View style={{ height: 24 }} />
            <Text style={styles.title}>Recent Spots</Text>

            {loadingList ? (
                <Text>Loading…</Text>
            ) : (
                <FlatList
                    data={spots}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={{ flexDirection: "row", gap: 12 }}>
                                {item.image_url ? (
                                    <Image source={{ uri: item.image_url }} style={{ width: 72, height: 72, borderRadius: 8 }} />
                                ) : null}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.spotTitle}>{item.title}</Text>
                                    <Text style={styles.meta}>
                                        {item.lat.toFixed(5)}, {item.lng.toFixed(5)} • {new Date(item.created_at).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12, flex: 1 },
    title: { fontSize: 24, fontWeight: "700" },
    input: { borderWidth: 1, borderRadius: 8, padding: 12 },
    card: { padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 12 },
    spotTitle: { fontSize: 18, fontWeight: "700" },
    meta: { fontSize: 12, opacity: 0.6, marginTop: 6 },
});
