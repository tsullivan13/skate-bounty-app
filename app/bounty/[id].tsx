import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
// adjust if your path differs
import { assertPostedAfter, normalizeInstagramUrl } from '../../src/lib/validators';

type Bounty = {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    expires_at: string | null;
    spot_id: string | null;
};

type Submission = {
    id: string;
    user_id: string;
    external_url: string | null;
    external_posted_at: string | null;
    created_at: string;
    votes: number;
    votedByMe: boolean;
};

export default function BountyDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [bounty, setBounty] = useState<Bounty | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [acceptedByMe, setAcceptedByMe] = useState(false);
    const [submittedByMe, setSubmittedByMe] = useState(false);

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [votingId, setVotingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [instaUrl, setInstaUrl] = useState('');
    const [postedAtISO, setPostedAtISO] = useState(''); // ISO 8601 like 2025-11-08T10:00:00Z or just 2025-11-08

    const [userId, setUserId] = useState<string | null>(null);

    const isOpen = useMemo(() => {
        if (!bounty?.expires_at) return true;
        return new Date(bounty.expires_at) > new Date();
    }, [bounty?.expires_at]);

    const showError = (title: string, message: string) => Alert.alert(title, message);

    const fetchUser = useCallback(async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) return showError('Auth error', error.message);
        setUserId(data.user?.id ?? null);
    }, []);

    const fetchBounty = useCallback(async (bountyId: string) => {
        // Get bounty
        const { data, error } = await supabase
            .from('bounties')
            .select(
                'id, title, description, created_at, expires_at, spot_id'
            )
            .eq('id', bountyId)
            .single();

        if (error) throw error;
        return data as Bounty;
    }, []);

    const fetchAcceptedByMe = useCallback(async (bountyId: string, uid: string | null) => {
        if (!uid) return false;
        const { data, error } = await supabase
            .from('bounty_acceptances')
            .select('id')
            .eq('bounty_id', bountyId)
            .eq('user_id', uid)
            .limit(1);
        if (error) throw error;
        return (data?.length ?? 0) > 0;
    }, []);

    const fetchSubmittedByMe = useCallback(async (bountyId: string, uid: string | null) => {
        if (!uid) return false;
        const { data, error } = await supabase
            .from('submissions')
            .select('id')
            .eq('bounty_id', bountyId)
            .eq('user_id', uid)
            .limit(1);
        if (error) throw error;
        return (data?.length ?? 0) > 0;
    }, []);

    const fetchSubmissions = useCallback(async (bountyId: string, uid: string | null) => {
        // Pull submissions and the full list of vote user_ids so we can compute votedByMe
        const { data, error } = await supabase
            .from('submissions')
            .select(`
        id, user_id, external_url, external_posted_at, created_at,
        submission_votes ( user_id )
      `)
            .eq('bounty_id', bountyId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: Submission[] = (data ?? []).map((row: any) => {
            const voters: { user_id: string }[] = row.submission_votes ?? [];
            const votes = voters.length;
            const votedByMe = !!uid && voters.some((v) => v.user_id === uid);
            return {
                id: row.id,
                user_id: row.user_id,
                external_url: row.external_url,
                external_posted_at: row.external_posted_at,
                created_at: row.created_at,
                votes,
                votedByMe,
            };
        });

        return mapped;
    }, []);

    const refresh = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            await fetchUser();
            // Give auth a tick to settle on native
            const uid = (await supabase.auth.getUser()).data.user?.id ?? null;

            const [b, a, s, list] = await Promise.all([
                fetchBounty(id),
                fetchAcceptedByMe(id, uid),
                fetchSubmittedByMe(id, uid),
                fetchSubmissions(id, uid),
            ]);

            setBounty(b);
            setAcceptedByMe(a);
            setSubmittedByMe(s);
            setSubmissions(list);
        } catch (e: any) {
            showError('Load failed', e?.message ?? 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [id, fetchBounty, fetchAcceptedByMe, fetchSubmittedByMe, fetchSubmissions, fetchUser]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const onAccept = useCallback(async () => {
        if (!id) return;
        if (!userId) {
            return showError('Sign in required', 'Please sign in to accept this bounty.');
        }
        try {
            setAccepting(true);
            const { error } = await supabase.rpc('rpc_accept_bounty', { p_bounty: id });
            if (error) throw error;
            setAcceptedByMe(true);
        } catch (e: any) {
            showError('Could not accept', e?.message ?? 'Unknown error');
        } finally {
            setAccepting(false);
        }
    }, [id, userId]);

    const onSubmitProof = useCallback(async () => {
        if (!id || !bounty) return;
        if (!userId) {
            return showError('Sign in required', 'Please sign in to submit proof.');
        }
        try {
            setSubmitting(true);
            const clean = normalizeInstagramUrl(instaUrl);
            // If user typed a date like "2025-11-08" convert to ISO midnight local
            const iso = (() => {
                if (!postedAtISO) return '';
                // If it already looks like ISO with time, keep it
                if (postedAtISO.includes('T')) return new Date(postedAtISO).toISOString();
                // Convert yyyy-mm-dd to ISO at noon UTC to avoid timezone off-by-one
                const d = new Date(`${postedAtISO}T12:00:00Z`);
                return d.toISOString();
            })();

            assertPostedAfter(bounty.created_at, iso);

            const { data, error } = await supabase.rpc('rpc_submit_proof', {
                p_bounty: bounty.id,
                p_external_url: clean,
                p_external_posted_at: iso,
            });
            if (error) throw error;

            // Clear inputs, refresh list
            setInstaUrl('');
            setPostedAtISO('');
            setSubmittedByMe(true);
            await refresh();
        } catch (e: any) {
            showError('Submit failed', e?.message ?? 'Unknown error');
        } finally {
            setSubmitting(false);
        }
    }, [bounty, id, instaUrl, postedAtISO, refresh, userId]);

    const onVote = useCallback(
        async (submissionId: string) => {
            if (!userId) return showError('Sign in required', 'Please sign in to vote.');
            try {
                setVotingId(submissionId);
                const { error } = await supabase.rpc('rpc_vote_submission', { p_submission: submissionId });
                if (error) throw error;
                // Optimistic update
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId ? { ...s, votedByMe: true, votes: s.votes + 1 } : s
                    )
                );
            } catch (e: any) {
                showError('Vote failed', e?.message ?? 'Unknown error');
            } finally {
                setVotingId(null);
            }
        },
        [userId]
    );

    const onUnvote = useCallback(
        async (submissionId: string) => {
            if (!userId) return showError('Sign in required', 'Please sign in to unvote.');
            try {
                setVotingId(submissionId);
                const { error } = await supabase.rpc('rpc_unvote_submission', { p_submission: submissionId });
                if (error) throw error;
                // Optimistic update
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId ? { ...s, votedByMe: false, votes: Math.max(0, s.votes - 1) } : s
                    )
                );
            } catch (e: any) {
                showError('Unvote failed', e?.message ?? 'Unknown error');
            } finally {
                setVotingId(null);
            }
        },
        [userId]
    );

    const Header = () => {
        if (!bounty) return null;
        return (
            <View style={{ padding: 16, gap: 10 }}>
                <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>{bounty.title}</Text>
                {bounty.description ? (
                    <Text style={{ color: '#bbb', fontSize: 15 }}>{bounty.description}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: isOpen ? '#DCFCE7' : '#FEE2E2',
                        }}
                    >
                        <Text style={{ color: isOpen ? '#166534' : '#991B1B', fontWeight: '700' }}>
                            {isOpen ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                    <Text style={{ color: '#888' }}>
                        Created {new Date(bounty.created_at).toLocaleDateString()}
                    </Text>
                </View>

                <Pressable
                    onPress={acceptedByMe ? undefined : onAccept}
                    disabled={acceptedByMe || accepting || !isOpen}
                    style={{
                        marginTop: 6,
                        backgroundColor: acceptedByMe ? '#1f2937' : '#2563eb',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        opacity: accepting || !isOpen ? 0.6 : 1,
                    }}
                >
                    <Text style={{ color: 'white', fontWeight: '700' }}>
                        {acceptedByMe ? 'Already Accepted' : 'Accept Bounty'}
                    </Text>
                </Pressable>

                {/* Submit proof */}
                <View
                    style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: '#0b0b0b',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#1f1f1f',
                        gap: 8,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Submit Instagram Proof</Text>
                    <TextInput
                        placeholder="https://www.instagram.com/reel/..."
                        placeholderTextColor="#777"
                        value={instaUrl}
                        onChangeText={setInstaUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{
                            backgroundColor: '#121212',
                            color: 'white',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#222',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    />
                    <TextInput
                        placeholder="Posted date (YYYY-MM-DD or ISO)"
                        placeholderTextColor="#777"
                        value={postedAtISO}
                        onChangeText={setPostedAtISO}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{
                            backgroundColor: '#121212',
                            color: 'white',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#222',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    />
                    <Pressable
                        onPress={onSubmitProof}
                        disabled={submitting || !isOpen || submittedByMe}
                        style={{
                            backgroundColor: submittedByMe ? '#1f2937' : '#10b981',
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            opacity: submitting || !isOpen ? 0.6 : 1,
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700' }}>
                            {submittedByMe ? 'Submission Created' : 'Submit Proof'}
                        </Text>
                    </Pressable>
                </View>

                <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', marginTop: 18 }}>
                    Submissions
                </Text>
            </View>
        );
    };

    const SubmissionRow = ({ item }: { item: Submission }) => {
        const onPressVote = () => (item.votedByMe ? onUnvote(item.id) : onVote(item.id));

        return (
            <View
                style={{
                    marginHorizontal: 16,
                    marginVertical: 6,
                    padding: 12,
                    backgroundColor: '#0b0b0b',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#1f1f1f',
                    gap: 8,
                }}
            >
                <Text style={{ color: 'white', fontWeight: '700' }}>
                    {new Date(item.created_at).toLocaleString()}
                </Text>
                {item.external_url ? (
                    <Text style={{ color: '#60a5fa' }} numberOfLines={2}>
                        {item.external_url}
                    </Text>
                ) : (
                    <Text style={{ color: '#bbb' }}>No URL</Text>
                )}
                <Text style={{ color: '#bbb' }}>
                    Posted: {item.external_posted_at ? new Date(item.external_posted_at).toLocaleString() : '—'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ color: '#bbb' }}>✅ {item.votes}</Text>
                    <View style={{ flex: 1 }} />
                    <Pressable
                        onPress={onPressVote}
                        disabled={votingId === item.id}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: item.votedByMe ? '#1f2937' : '#2563eb',
                            opacity: votingId === item.id ? 0.6 : 1,
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700' }}>
                            {item.votedByMe ? 'Unvote' : 'Verify'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    if (!id) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white' }}>Missing bounty id.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
                <Text style={{ color: '#bbb', marginTop: 8 }}>Loading…</Text>
            </View>
        );
    }

    if (!bounty) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white' }}>Bounty not found.</Text>
                <Pressable
                    onPress={() => router.back()}
                    style={{ marginTop: 12, backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}
                >
                    <Text style={{ color: 'white', fontWeight: '700' }}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: 'black' }}
            behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
            <FlatList
                data={submissions}
                keyExtractor={(s) => s.id}
                ListHeaderComponent={<Header />}
                renderItem={SubmissionRow}
                ListEmptyComponent={
                    <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>
                        No submissions yet—be the first!
                    </Text>
                }
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshing={loading}
                onRefresh={refresh}
            />
        </KeyboardAvoidingView>
    );
}
