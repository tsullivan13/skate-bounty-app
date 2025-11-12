import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase'; // adjust if your client path differs

type UUID = string;

type Bounty = {
    id: UUID;
    trick?: string | null;
    reward?: string | null;
    created_at: string;
    expires_at?: string | null;
};

function fmt(d?: string | null) {
    if (!d) return '';
    const t = new Date(d);
    return isNaN(t.getTime()) ? d : t.toLocaleDateString();
}

export default function BountyListScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [bounties, setBounties] = useState<Bounty[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bounties')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setBounties((data ?? []) as Bounty[]);
        } catch (err: any) {
            console.error('[bounties load]', err);
            Alert.alert('Error', err?.message ?? 'Failed to load bounties');
        } finally {
            setLoading(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.muted}>Loading bounties…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={bounties}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={styles.muted}>No bounties yet.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push(`/bounty/${item.id}`)}
                    >
                        <Text style={styles.title}>{item.trick ?? 'Bounty'}</Text>
                        <View style={styles.row}>
                            <View style={styles.pill}>
                                <Text style={styles.pillText}>Starts: {fmt(item.created_at)}</Text>
                            </View>
                            {!!item.expires_at && (
                                <View style={styles.pill}>
                                    <Text style={styles.pillText}>Ends: {fmt(item.expires_at)}</Text>
                                </View>
                            )}
                            {!!item.reward && (
                                <View style={styles.pill}>
                                    <Text style={styles.pillText}>Reward: {item.reward}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    list: { padding: 16, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        gap: 8,
    },
    title: { fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { backgroundColor: '#1111110D', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
    pillText: { fontSize: 12, fontWeight: '600' },
    muted: { color: '#666' },
});
