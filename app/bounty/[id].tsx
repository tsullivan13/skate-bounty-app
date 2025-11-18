// app/bounty/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
    Badge,
    Button,
    Card,
    H2,
    Input,
    Mono,
    Muted,
    Pill,
    Row,
    Screen,
    Title,
} from '../../src/ui/primitives';
import { fetchProfilesByIds, Profile } from '../../src/lib/profiles';
import { supabase } from '../../src/lib/supabase';

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

const IG_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/i;

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
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});

    const [igUrl, setIgUrl] = useState('');
    const [postedAt, setPostedAt] = useState('');

    const loadMe = useCallback(async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            setMe(null);
            return null;
        }
        const user = data?.user ?? null;
        const id = user ? (user.id as UUID) : null;
        setMe(id ? { id } : null);
        return id ? { id } : null;
    }, []);

    const loadAll = useCallback(async () => {
        if (!bountyId) return;
        setLoading(true);
        try {
            const currentUser = me ?? (await loadMe());

            const { data: bnty, error: bErr } = await supabase
                .from('bounties')
                .select('*')
                .eq('id', bountyId)
                .single<Bounty>();
            if (bErr) throw bErr;
            setBounty(bnty);

            if (currentUser) {
                const { data: acc, error: aErr } = await supabase
                    .from('bounty_acceptances')
                    .select('id')
                    .eq('bounty_id', bountyId)
                    .eq('user_id', currentUser.id)
                    .limit(1);
                if (aErr) throw aErr;
                setAccepted((acc?.length ?? 0) > 0);

                const { data: mine, error: mErr } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('bounty_id', bountyId)
                    .eq('user_id', currentUser.id)
                    .limit(1);
                if (mErr) throw mErr;
                setMySubmission(mine?.[0] ?? null);
            } else {
                setAccepted(false);
                setMySubmission(null);
            }

            // prefer view with counts
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
                    const { data: sData, error: sErr } = await supabase
                        .from('submissions')
                        .select('*')
                        .eq('bounty_id', bountyId)
                        .order('created_at', { ascending: true });
                    if (sErr) throw sErr;
                    subs = (sData as Submission[]).map((s) => ({ ...s, vote_count: 0 }));
                    const { data: votesAll, error: vErr } = await supabase
                        .from('submission_votes')
                        .select('submission_id');
                    if (vErr) throw vErr;
                    const counts = new Map<string, number>();
                    for (const row of votesAll ?? []) {
                        const sid = row.submission_id as string;
                        counts.set(sid, (counts.get(sid) ?? 0) + 1);
                    }
                    subs = subs.map((s) => ({ ...s, vote_count: counts.get(s.id) ?? 0 }));
                }
            }
            setSubmissions(subs);

            const profileIds: UUID[] = [];
            if (bnty?.user_id) profileIds.push(bnty.user_id as UUID);
            subs.forEach((s) => profileIds.push(s.user_id));
            try {
                const fetched = await fetchProfilesByIds(profileIds);
                if (fetched.length) {
                    setProfiles((prev) => {
                        const next = { ...prev };
                        fetched.forEach((p) => {
                            next[p.id] = p;
                        });
                        return next;
                    });
                }
            } catch (e) {
                console.log('load profiles error', e);
            }

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
            Alert.alert('Error', err?.message ?? 'Failed to load bounty');
        } finally {
            setLoading(false);
        }
    }, [bountyId, me, loadMe]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const onAccept = useCallback(async () => {
        if (!bountyId) return;
        try {
            const { error } = await supabase.rpc('rpc_accept_bounty', { p_bounty: bountyId });
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
        if (!IG_URL_RE.test(url)) return Alert.alert('Validation', 'That is not a valid Instagram URL.');

        if (!iso) return Alert.alert('Validation', 'Enter the post ISO timestamp.');
        const dt = new Date(iso);
        if (isNaN(dt.getTime())) return Alert.alert('Validation', 'Invalid ISO timestamp.');

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
            await loadAll();
            Alert.alert('Success', 'Submission saved.');
        } catch (err: any) {
            Alert.alert('Submission failed', err?.message ?? 'Could not submit proof.');
        }
    }, [bountyId, igUrl, postedAt, loadAll]);

    const onVote = useCallback(async (submissionId: UUID) => {
        try {
            const { error } = await supabase.rpc('rpc_vote_submission', { p_submission: submissionId });
            if (error) throw error;
            setVotedIds((prev) => new Set(prev).add(submissionId));
            setSubmissions((prev) =>
                prev.map((s) => (s.id === submissionId ? { ...s, vote_count: (s.vote_count ?? 0) + 1 } : s)),
            );
        } catch (err: any) {
            Alert.alert('Vote failed', err?.message ?? 'Could not vote.');
        }
    }, []);

    const onUnvote = useCallback(
        async (submissionId: UUID) => {
            try {
                const { error } = await supabase.rpc('rpc_unvote_submission', { p_submission: submissionId });
                if (error) throw error;
                const next = new Set(votedIds);
                next.delete(submissionId);
                setVotedIds(next);
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId ? { ...s, vote_count: Math.max(0, (s.vote_count ?? 0) - 1) } : s,
                    ),
                );
            } catch (err: any) {
                Alert.alert('Unvote failed', err?.message ?? 'Could not remove vote.');
            }
        },
        [votedIds],
    );

    const displayName = useCallback(
        (userId?: UUID | null) => {
            if (!userId) return 'Unknown user';
            const handle = profiles[userId]?.handle;
            return handle ? `@${handle}` : `${userId.slice(0, 6)}…`;
        },
        [profiles],
    );

    if (!bountyId) {
        return (
            <Screen>
                <Title>No bounty id provided</Title>
                <Button kind="ghost" onPress={() => router.back()}>
                    Go Back
                </Button>
            </Screen>
        );
    }

    if (loading) {
        return (
            <Screen>
                <Card elevated>
                    <Muted>Loading bounty…</Muted>
                </Card>
            </Screen>
        );
    }

    if (!bounty) {
        return (
            <Screen>
                <Card elevated>
                    <H2>Bounty not found</H2>
                    <Button kind="ghost" onPress={() => router.back()}>
                        Go Back
                    </Button>
                </Card>
            </Screen>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
                <Screen>
                    <Row>
                        <Title>{bounty.trick ?? 'Bounty'}</Title>
                        {!!bounty.reward && <Badge tone="warning">Reward: {bounty.reward}</Badge>}
                    </Row>

                    <Row>
                        <Pill>Starts {fmt(bounty.created_at)}</Pill>
                        {!!bounty.expires_at && <Pill>Ends {fmt(bounty.expires_at)}</Pill>}
                    </Row>

                    <Muted>Posted by {displayName(bounty.user_id)}</Muted>

                    {!accepted ? <Button onPress={onAccept}>Accept Bounty</Button> : <Badge tone="accent">Accepted</Badge>}

                    <Card elevated>
                        <H2>Submit Instagram proof</H2>

                        {mySubmission ? (
                            <>
                                <Muted>You already submitted for this bounty.</Muted>
                                <Card>
                                    <Mono>URL: {mySubmission.media_url ?? '—'}</Mono>
                                    <Mono>Posted: {fmt(mySubmission.external_posted_at)}</Mono>
                                    <Mono>Submitted: {fmt(mySubmission.created_at)}</Mono>
                                </Card>
                                <Muted>One submission per bounty per user is enforced by the server.</Muted>
                            </>
                        ) : (
                            <>
                                <Muted>Paste the post URL and the ISO timestamp of when it was posted.</Muted>
                                <Input
                                    value={igUrl}
                                    onChangeText={setIgUrl}
                                    placeholder="https://instagram.com/p/abc123"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    inputMode="url"
                                />
                                <Input
                                    value={postedAt}
                                    onChangeText={setPostedAt}
                                    placeholder="2025-11-01T20:45:00Z"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Button onPress={onSubmitProof}>Submit</Button>
                            </>
                        )}
                    </Card>

                    <Card elevated>
                        <H2>Submissions</H2>
                        {submissions.length === 0 ? (
                            <Muted>No submissions yet.</Muted>
                        ) : (
                            submissions.map((s) => {
                                const voted = votedIds.has(s.id);
                                return (
                                    <Card key={s.id} style={{ marginBottom: 12 }}>
                                        <Mono>{s.media_url}</Mono>
                                        <Muted>
                                            By {displayName(s.user_id)} • Posted {fmt(s.external_posted_at)} • Submitted
                                            {" "}
                                            {fmt(s.created_at)}
                                        </Muted>
                                        <Row style={{ justifyContent: 'space-between' }}>
                                            <Badge tone="accent">{(s.vote_count ?? 0) + ' votes'}</Badge>
                                            {voted ? (
                                                <Button kind="ghost" onPress={() => onUnvote(s.id)}>
                                                    Unvote
                                                </Button>
                                            ) : (
                                                <Button onPress={() => onVote(s.id)}>Vote</Button>
                                            )}
                                        </Row>
                                    </Card>
                                );
                            })
                        )}
                    </Card>
                </Screen>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
