// app/(tabs)/create.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { palette } from "../../constants/theme";
import { fetchSpots, Spot } from "../../src/lib/spots";
import { uploadBountyImage } from "../../src/lib/upload";
import { useAuth } from "../../src/providers/AuthProvider";

export default function CreateBounty() {
    const { session } = useAuth();
    const [trick, setTrick] = useState("");
    const [reward, setReward] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imagePayload, setImagePayload] = useState<{
        file?: File | Blob;
        base64?: string;
        contentType?: string;
    } | null>(null);
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
                console.log("Error loading spots:", e);
            } finally {
                setLoadingSpots(false);
            }
        })();
    }, []);

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Permission required", "We need access to your photos to attach an image.");
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

    const submit = async () => {
        if (!session) {
            Alert.alert("Auth required", "You must be signed in to create bounties.");
            return;
        }

        if (!trick.trim() || !reward.trim()) {
            Alert.alert("Missing fields", "Please enter both a trick and reward.");
            return;
        }

        setLoading(true);
        try {
            let image_url: string | null = null;
            if (imagePayload) {
                image_url = await uploadBountyImage({
                    ...imagePayload,
                    userId: session.user.id,
                });
            }

            const { error } = await (await import("../../src/lib/supabase")).supabase
                .from("bounties")
                .insert([{ user_id: session.user.id, trick: t, reward: rewardNum, image_url: imageUrl ?? null, spot_id: selectedSpotId }])
                .select()
                .single();

            if (error) throw error;
            const body = {
                trick: trick.trim(),
                reward: reward.trim(),
                image_url,
                spot_id: selectedSpotId,
            };

            const res = await fetch("/api/create-bounty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Failed to create bounty");
            }

            setTrick("");
            setReward("");
            setImagePreview(null);
            setImagePayload(null);
            Alert.alert("Created", "Bounty created successfully.");
        } catch (e: any) {
            console.log("create bounty error", e);
            Alert.alert("Error", e?.message ?? "Failed to create bounty");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Bounty</Text>

            <TextInput
                style={styles.input}
                placeholder="Trick (e.g. kickflip over the rail)"
                placeholderTextColor={palette.textMuted}
                value={trick}
                onChangeText={setTrick}
            />
            <TextInput
                style={styles.input}
                placeholder="Reward (e.g. $20, pizza, etc.)"
                placeholderTextColor={palette.textMuted}
                value={reward}
                onChangeText={setReward}
                keyboardType="numeric"
            />

            <View>
                <Text style={styles.title}>Spot</Text>
                {loadingSpots ? (
                    <Text style={{ color: palette.textMuted }}>Loading spots…</Text>
                ) : (
                    <FlatList
                        data={spots}
                        keyExtractor={(s) => s.id}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => setSelectedSpotId(item.id)}
                                style={[
                                    styles.spotRow,
                                    selectedSpotId === item.id && styles.spotRowSelected,
                                ]}
                            >
                                <Text style={{ color: palette.text }}>{item.title}</Text>
                            </Pressable>
                        )}
                    />
                )}
            </View>

            <View style={{ gap: 8 }}>
                {imagePreview ? (
                    <Image
                        source={{ uri: imagePreview }}
                        style={{ width: "100%", height: 200, borderRadius: 12 }}
                    />
                ) : null}
                <Button title="Pick Image" onPress={pickImage} />
            </View>

            <Button title={loading ? "Creating…" : "Create Bounty"} onPress={submit} disabled={loading} />
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
    spotRow: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 10,
        marginVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: palette.card,
        borderColor: palette.outline,
    },
    spotRowSelected: {
        backgroundColor: palette.subtle,
    },
});
