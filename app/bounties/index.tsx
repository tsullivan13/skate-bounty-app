// app/bounties/index.tsx
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, TouchableOpacity, View } from 'react-native';
import {
    Badge,
    Button,
    Card,
    H2,
    Muted,
    Pill,
    Row,
    Screen,
    Title,
} from '../../src/ui/primitives';
import { supabase } from '../../src/lib/supabase'; // adjust if your client path differs

type UUID = string;

type Bounty = {
    id: UUID;
    trick?: string | null;
    reward?: string | null;
    created_at: string;
    expires_at?: string | null;
};

function fmtDate(d?: string | null) {
    if (!d) return '';
    const t = new Date(d);
    return isNaN(t.getTime()) ? d : t.toLocaleDateString();
}

export default function BountyListScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
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
            Alert.alert('Error', err?.message ?? 'Failed to load bounties');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Screen>
            <Row>
                <Title>Skate Bounties</Title>
                {!loading && <Badge tone="accent">{bounties.length} total</Badge>}
            </Row>

            {loading ? (
                <Card elevated>
                    <Muted>Loading bounties…</Muted>
                </Card>
            ) : bounties.length === 0 ? (
                <Card elevated>
                    <H2>No bounties yet</H2>
                    <Muted>Check back soon or create one if you&apos;re an admin.</Muted>
                </Card>
            ) : (
                <FlatList
                    data={bounties}
                    keyExtractor={(item) => item.id}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => router.push(`/bounty/${item.id}`)}>
                            <Card elevated>
                                <Row>
                                    <H2>{item.trick ?? 'Bounty'}</H2>
                                    {!!item.reward && <Badge tone="warning">Reward: {item.reward}</Badge>}
                                </Row>
                                <Row>
                                    <Pill>Starts {fmtDate(item.created_at)}</Pill>
                                    {!!item.expires_at && <Pill>Ends {fmtDate(item.expires_at)}</Pill>}
                                </Row>
                                <Row>
                                    <Button kind="ghost">View details</Button>
                                </Row>
                            </Card>
                        </TouchableOpacity>
                    )}
                />
            )}
        </Screen>
    );
}
