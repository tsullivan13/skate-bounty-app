// app/(tabs)/spots.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { palette } from "../../constants/theme";
import { createSpot, fetchSpots, Spot } from "../../src/lib/spots";
import { uploadBountyImage } from "../../src/lib/upload";
import { useAuth } from "../../src/providers/AuthProvider";

export default function SpotsTab() {
    const { session } = useAuth();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [locationHint, setLocationHint] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imagePayload, setImagePayload] = useState<{
        file?: File | Blob;
        base64?: string;
        contentType?: string;
    } | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const list = await fetchSpots();
                setSpots(list);
            } catch (e) {
                console.log("fetch spots error", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Permission required", "We need access to your photos.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 0.8,
            base64: Platform.OS !== "web",
        });

        if (result.canceled) return;

        const asset = result.assets[0];
        setImagePreview(asset.uri);

        if (Platform.OS === "web") {
            const file = (asset as any).file as File | undefined;
            if (!file) return;
            setImagePayload({ file, contentType: file.type });
        } else {
            setImagePayload({
                base64: asset.base64 ?? undefined,
                contentType: "image/jpeg",
            });
        }
    };

    const handleCreateSpot = async () => {
        if (!session) {
            Alert.alert("Auth required", "You must be signed in to create spots.");
            return;
        }
        if (!title.trim()) {
            Alert.alert("Missing title", "Please enter a title for the spot.");
            return;
        }

        setCreating(true);
        try {
            let image_url: string | null = null;
            if (imagePayload) {
                image_url = await uploadBountyImage({
                    ...imagePayload,
                    userId: session.user.id,
                });
            }

            // createSpot expects multiple params (see TS error: 4–5 args)
            const spot = await createSpot(
                title.trim(),
                locationHint.trim() || null,
                image_url,
                session.user.id
            );

            setSpots((prev) => [spot, ...prev]);
            setTitle("");
            setLocationHint("");
            setImagePreview(null);
            setImagePayload(null);
        } catch (e: any) {
            console.log("create spot error", e);
            Alert.alert("Error", e?.message ?? "Failed to create spot");
        } finally {
            setCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Spots</Text>

            <View style={{ gap: 8 }}>
                <TextInput
                    style={styles.input}
                    placeholder="Spot title"
                    placeholderTextColor={palette.textMuted}
                    value={title}
                    onChangeText={setTitle}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Location hint"
                    placeholderTextColor={palette.textMuted}
                    value={locationHint}
                    onChangeText={setLocationHint}
                />
                {imagePreview ? (
                    <Image
                        source={{ uri: imagePreview }}
                        style={{ width: "100%", height: 180, borderRadius: 12 }}
                    />
                ) : null}
                <Button title="Pick Image" onPress={pickImage} />
                <Button
                    title={creating ? "Creating…" : "Create Spot"}
                    disabled={creating}
                    onPress={handleCreateSpot}
                />
            </View>

            <View style={{ height: 24 }} />

            {loading ? (
                <Text style={{ color: palette.textMuted }}>Loading spots…</Text>
            ) : (
                <FlatList
                    data={spots}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item }) => {
                        const locHint = (item as any).location_hint as string | undefined;
                        return (
                            <View style={styles.card}>
                                <View style={{ flexDirection: "row", gap: 12 }}>
                                    {item.image_url ? (
                                        <Image
                                            source={{ uri: item.image_url }}
                                            style={{ width: 72, height: 72, borderRadius: 8 }}
                                        />
                                    ) : null}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.spotTitle}>{item.title}</Text>
                                        <Text style={styles.meta}>
                                            {locHint ? locHint + " • " : ""}
                                            {new Date(item.created_at).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12, flex: 1, backgroundColor: palette.bg },
    title: { fontSize: 24, fontWeight: "700", color: palette.text },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        borderColor: palette.outline,
        backgroundColor: palette.subtle,
        color: palette.text,
    },
    card: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
        backgroundColor: palette.card,
        borderColor: palette.outline,
    },
    spotTitle: { fontSize: 18, fontWeight: "700", color: palette.text },
    meta: { fontSize: 12, marginTop: 6, color: palette.textMuted },
});
