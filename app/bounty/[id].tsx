import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase'; // <-- adjust path if needed

// ---- Minimal runtime types (kept local to avoid touching other files) ----
type UUID = string;

type Bounty = {
    id: UUID;
    user_id?: UUID | null;
    trick?: string | null;
    reward?: string | null;
    created_at: string;
    spot_id?: UUID | null;
    expires_at?: string | null;
};

type Submission = {
    id: UUID;
    bounty_id: UUID;
    user_id: UUID;
    media_url: string | null;
    caption?: string | null;
    status?: string | null;
    created_at: string;
    external_posted_at?: string | null;
};

type SubmissionWithVotes = Submission & { vote_count?: number | null };

type Acceptance = {
    id: UUID;
    bounty_id: UUID;
    user_id: UUID;
    created_at: string;
};

// Instagram URL pattern (same as DB check for good UX errors)
const IG_URL_RE =
    /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/i;

function fmt(d?: string | null) {
    if (!d) return '';
    const t = new Date(d);
    return isNaN(t.getTime()) ? d : t.toLocaleString();
}

export default function BountyDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const bountyId = useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);

    const [me, setMe] = useState<{ id: UUID } | null>(null);
    const [bounty, setBounty] = useState<Bounty | null>(null);
    const [accepted, setAccepted] = useState<boolean>(false);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionWithVotes[]>([]);
    const [votedIds, setVotedIds] = useState<Set<UUID>>(new Set());
    const [loading, setLoading] = useState(true);

    // form state
    const [igUrl, setIgUrl] = useState('');
    const [postedAt, setPostedAt] = useState(''); // ISO date string: 2025-11-01T20:45:00Z

    // ------------------ Load current user ------------------
    const loadMe = useCallback(async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.warn('[auth.getUser] error', error);
            setMe(null);
            return null;
        }
        const user = data?.user ?? null;
        setMe(user ? { id: user.id as UUID } : null);
        return user ? { id: user.id as UUID } : null;
    }, []);

    // ------------------ Load bounty + related ------------------
    const loadAll = useCallback(async () => {
        if (!bountyId) return;
        setLoading(true);

        try {
            const currentUser = me ?? (await loadMe());

            // 1) Bounty
            const { data: bnty, error: bErr } = await supabase
                .from('bounties')
                .select('*')
                .eq('id', bountyId)
                .single<Bounty>();

            if (bErr) throw bErr;
            setBounty(bnty);

            // 2) Have I accepted?
            if (currentUser) {
                const { data: acc, error: aErr } = await supabase
                    .from('bounty_acceptances')
                    .select('id')
                    .eq('bounty_id', bountyId)
                    .eq('user_id', currentUser.id)
                    .limit(1);

                if (aErr) throw aErr;
                setAccepted((acc?.length ?? 0) > 0);
            } else {
                setAccepted(false);
            }

            // 3) My submission (one per user per bounty)
            if (currentUser) {
                const { data: mine, error: mErr } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('bounty_id', bountyId)
                    .eq('user_id', currentUser.id)
                    .limit(1);

                if (mErr) throw mErr;
                setMySubmission(mine?.[0] ?? null);
            } else {
                setMySubmission(null);
            }

            // 4) All submissions for this bounty w/ vote counts
            // Prefer the view v_submissions_with_votes if present. If not, we’ll fallback to raw table + local count.
            let subs: SubmissionWithVotes[] = [];
            {
                const { data, error } = await supabase
                    .from('v_submissions_with_votes')
                    .select('*')
                    .eq('bounty_id', bountyId)
                    .order('vote_count', { ascending: false })
                    .order('created_at', { ascending: true });

                if (!error && Array.isArray(data)) {
                    subs = data as SubmissionWithVotes[];
                } else {
                    // fallback to submissions then compute counts
                    const { data: sData, error: sErr } = await supabase
                        .from('submissions')
                        .select('*')
                        .eq('bounty_id', bountyId)
                        .order('created_at', { ascending: true });
                    if (sErr) throw sErr;
                    subs = (sData as Submission[]).map((s) => ({ ...s, vote_count: 0 }));
                    // pull counts
                    const ids = subs.map((s) => s.id);
                    if (ids.length) {
                        const { data: votesAll, error: vErr } = await supabase
                            .from('submission_votes')
                            .select('submission_id');
                        if (vErr) throw vErr;
                        const counts = new Map<UUID, number>();
                        for (const row of votesAll ?? []) {
                            const sid = row.submission_id as UUID;
                            counts.set(sid, (counts.get(sid) ?? 0) + 1);
                        }
                        subs = subs.map((s) => ({
                            ...s,
                            vote_count: counts.get(s.id) ?? 0,
                        }));
                    }
                }
            }
            setSubmissions(subs);

            // 5) Which submissions did I vote for?
            if (currentUser && subs.length) {
                const ids = subs.map((s) => s.id);
                const { data: myVotes, error: mvErr } = await supabase
                    .from('submission_votes')
                    .select('submission_id')
                    .in('submission_id', ids)
                    .eq('user_id', currentUser.id);

                if (mvErr) throw mvErr;
                setVotedIds(new Set((myVotes ?? []).map((r) => r.submission_id as UUID)));
            } else {
                setVotedIds(new Set());
            }
        } catch (err: any) {
            console.error('[loadAll]', err);
            Alert.alert('Error', err?.message ?? 'Failed to load bounty');
        } finally {
            setLoading(false);
        }
    }, [bountyId, me, loadMe]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // ------------------ Mutations ------------------
    const onAccept = useCallback(async () => {
        if (!bountyId) return;
        try {
            const { error } = await supabase.rpc('rpc_accept_bounty', {
                p_bounty: bountyId,
            });
            if (error) throw error;
            setAccepted(true);
            Alert.alert('Accepted', 'You accepted this bounty.');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not accept bounty');
        }
    }, [bountyId]);

    const onSubmitProof = useCallback(async () => {
        if (!bountyId) return;
        const url = igUrl.trim();
        const iso = postedAt.trim();

        if (!url) return Alert.alert('Validation', 'Paste your Instagram post URL.');
        if (!IG_URL_RE.test(url))
            return Alert.alert('Validation', 'That does not look like a valid Instagram post/reel/tv URL.');

        if (!iso) {
            return Alert.alert(
                'Validation',
                'Enter the post date/time in ISO format, e.g. 2025-11-01T20:45:00Z'
            );
        }
        const dt = new Date(iso);
        if (isNaN(dt.getTime())) {
            return Alert.alert('Validation', 'Posted date is not a valid ISO timestamp.');
        }

        try {
            const { data, error } = await supabase.rpc('rpc_submit_proof', {
                p_bounty: bountyId,
                p_media_url: url,
                p_external_posted_at: iso,
            });
            if (error) throw error;
            setMySubmission(data as Submission);
            setIgUrl('');
            setPostedAt('');
            Alert.alert('Success', 'Submission saved.');
            // refresh list
            await loadAll();
        } catch (err: any) {
            Alert.alert('Submission failed', err?.message ?? 'Could not submit proof.');
        }
    }, [bountyId, igUrl, postedAt, loadAll]);

    const onVote = useCallback(
        async (submissionId: UUID) => {
            try {
                const { error } = await supabase.rpc('rpc_vote_submission', {
                    p_submission: submissionId,
                });
                if (error) throw error;
                // update UI quickly
                setVotedIds((prev) => new Set(prev).add(submissionId));
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId
                            ? { ...s, vote_count: (s.vote_count ?? 0) + 1 }
                            : s
                    )
                );
            } catch (err: any) {
                Alert.alert('Vote failed', err?.message ?? 'Could not vote.');
            }
        },
        []
    );

    const onUnvote = useCallback(
        async (submissionId: UUID) => {
            try {
                const { error } = await supabase.rpc('rpc_unvote_submission', {
                    p_submission: submissionId,
                });
                if (error) throw error;
                const next = new Set(votedIds);
                next.delete(submissionId);
                setVotedIds(next);
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId
                            ? { ...s, vote_count: Math.max(0, (s.vote_count ?? 0) - 1) }
                            : s
                    )
                );
            } catch (err: any) {
                Alert.alert('Unvote failed', err?.message ?? 'Could not remove vote.');
            }
        },
        [votedIds]
    );

    // ------------------ Render ------------------
    if (!bountyId) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>No bounty id provided</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
                    <Text style={styles.btnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.muted}>Loading bounty…</Text>
            </View>
        );
    }

    if (!bounty) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>Bounty not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
                    <Text style={styles.btnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>{bounty.trick ?? 'Bounty'}</Text>

                <View style={styles.row}>
                    <View style={styles.pill}>
                        <Text style={styles.pillText}>Starts: {fmt(bounty.created_at)}</Text>
                    </View>
                    {!!bounty.expires_at && (
                        <View style={styles.pill}>
                            <Text style={styles.pillText}>Ends: {fmt(bounty.expires_at)}</Text>
                        </View>
                    )}
                    {!!bounty.reward && (
                        <View style={styles.pill}>
                            <Text style={styles.pillText}>Reward: {bounty.reward}</Text>
                        </View>
                    )}
                </View>

                {!accepted ? (
                    <TouchableOpacity onPress={onAccept} style={[styles.btn, { marginTop: 10 }]}>
                        <Text style={styles.btnText}>Accept Bounty</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.pill, { alignSelf: 'flex-start', marginTop: 10 }]}>
                        <Text style={styles.pillText}>Accepted</Text>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Submit Instagram proof</Text>
                    {mySubmission ? (
                        <>
                            <Text style={styles.body}>You already submitted for this bounty.</Text>
                            <View style={styles.submissionBox}>
                                <Text style={styles.mono}>URL: {mySubmission.media_url ?? '—'}</Text>
                                <Text style={styles.mono}>
                                    Posted: {fmt(mySubmission.external_posted_at)}
                                </Text>
                                <Text style={styles.mono}>Submitted: {fmt(mySubmission.created_at)}</Text>
                            </View>
                            <Text style={styles.muted}>
                                Server enforces one submission per user. If something is wrong, contact an admin.
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Instagram Post URL</Text>
                            <TextInput
                                value={igUrl}
                                onChangeText={setIgUrl}
                                placeholder="https://instagram.com/p/abc123"
                                autoCapitalize="none"
                                autoCorrect={false}
                                inputMode="url"
                                style={styles.input}
                            />
                            <Text style={styles.help}>
                                Must be a post/reel/tv URL. The server validates it.
                            </Text>

                            <Text style={[styles.label, { marginTop: 14 }]}>
                                Post Date/Time (ISO)
                            </Text>
                            <TextInput
                                value={postedAt}
                                onChangeText={setPostedAt}
                                placeholder="2025-11-01T20:45:00Z"
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={styles.input}
                            />
                            <Text style={styles.help}>
                                For MVP, paste the post’s timestamp. We’ll add “auto-detect” later.
                            </Text>

                            <TouchableOpacity onPress={onSubmitProof} style={[styles.btn, { marginTop: 16 }]}>
                                <Text style={styles.btnText}>Submit</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Submissions</Text>
                    {!submissions.length ? (
                        <Text style={styles.muted}>No submissions yet.</Text>
                    ) : (
                        submissions.map((s) => {
                            const voted = votedIds.has(s.id);
                            return (
                                <View key={s.id} style={styles.subItem}>
                                    <Text style={styles.body}>{s.media_url}</Text>
                                    <Text style={styles.muted}>
                                        Posted: {fmt(s.external_posted_at)} • Submitted: {fmt(s.created_at)}
                                    </Text>
                                    <View style={styles.voteRow}>
                                        <View style={styles.voteBadge}>
                                            <Text style={styles.voteText}>{s.vote_count ?? 0} votes</Text>
                                        </View>
                                        {voted ? (
                                            <TouchableOpacity
                                                onPress={() => onUnvote(s.id)}
                                                style={[styles.btn, styles.btnLight]}
                                            >
                                                <Text style={[styles.btnText, { color: '#111' }]}>Unvote</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity onPress={() => onVote(s.id)} style={styles.btn}>
                                                <Text style={styles.btnText}>Vote</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, gap: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    title: { fontSize: 24, fontWeight: '700' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { backgroundColor: '#1111110D', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
    pillText: { fontSize: 12, fontWeight: '600' },
    card: { backgroundColor: '#1111110D', padding: 12, borderRadius: 12 },
    cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    body: { fontSize: 16, lineHeight: 22 },
    label: { fontSize: 14, fontWeight: '600' },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        fontSize: 16,
    },
    help: { fontSize: 12, color: '#666', marginTop: 6 },
    btn: { backgroundColor: '#111', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
    btnLight: { backgroundColor: '#eee' },
    btnText: { color: 'white', fontSize: 16, fontWeight: '700', textAlign: 'center' },
    muted: { color: '#666' },
    submissionBox: { backgroundColor: '#1111110D', padding: 10, borderRadius: 8, marginTop: 8, gap: 6 },
    subItem: { backgroundColor: '#ffffff', borderRadius: 10, padding: 10, marginBottom: 8, gap: 6 },
    voteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    voteBadge: { backgroundColor: '#1111110D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    voteText: { fontSize: 12, fontWeight: '700' },
    mono: {
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
});
