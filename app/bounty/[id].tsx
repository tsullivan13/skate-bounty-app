// app/bounty/[id].tsx
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
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
import { fetchSpotById, Spot } from '../../src/lib/spots';
import { useAuth } from '../../src/providers/AuthProvider';

type UUID = string;

type Bounty = {
    id: UUID;
    user_id?: UUID | null;
    trick?: string | null;
    reward?: number | null;
    reward_type?: string | null;
    created_at: string;
    spot_id?: UUID | null;
    status?: string | null;
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

const IG_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?(?:[?#].*)?$/i;
const IG_EMBED_RE = /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i;

function fmt(d?: string | null) {
    if (!d) return '';
    const t = new Date(d);
    return isNaN(t.getTime()) ? d : t.toLocaleString();
}

function extractInstagramEmbed(url?: string | null) {
    if (!url) return null;
    const match = url.match(IG_EMBED_RE);
    if (!match) return null;
    const type = match[1];
    const slug = match[2];
    if (!slug || !type) return null;
    return {
        embedUrl: `https://www.instagram.com/${type}/${slug}/embed`,
        mediaUrl: `https://www.instagram.com/${type}/${slug}/media/?size=l`,
        permalink: `https://www.instagram.com/${type}/${slug}/`,
    };
}

async function fetchInstagramTimestamp(url: string) {
    const endpoint = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw new Error(`Instagram responded with status ${response.status}`);
    }

    const data = (await response.json()) as { timestamp?: string };
    if (!data.timestamp) return null;

    const parsed = new Date(data.timestamp);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function InstagramEmbed({ url }: { url?: string | null }) {
    const data = useMemo(() => extractInstagramEmbed(url), [url]);

    if (!data) {
        return <Mono>{url ?? '—'}</Mono>;
    }

    const openInBrowser = () => WebBrowser.openBrowserAsync(data.permalink);

    if (Platform.OS === 'web') {
        return (
            <View style={{ width: '100%', maxWidth: 540, alignSelf: 'center', gap: 8 }}>
                {React.createElement('iframe', {
                    src: data.embedUrl,
                    width: '100%',
                    height: 540,
                    style: {
                        borderRadius: 12,
                        border: '1px solid #1E314A',
                        overflow: 'hidden',
                        backgroundColor: '#000',
                    },
                    allow: 'encrypted-media *; clipboard-write',
                    allowFullScreen: true,
                    loading: 'lazy',
                })}
                <Button kind="ghost" onPress={openInBrowser}>
                    Open on Instagram
                </Button>
            </View>
        );
    }

    const openEmbed = () => WebBrowser.openBrowserAsync(data.embedUrl);

    return (
        <Card style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            <Image
                source={{ uri: data.mediaUrl }}
                style={{ width: '100%', aspectRatio: 4 / 5, backgroundColor: '#000' }}
                resizeMode="cover"
            />
            <View style={{ padding: 12, gap: 8 }}>
                <Button onPress={openEmbed}>Play in app</Button>
                <Button kind="ghost" onPress={openInBrowser}>
                    Open on Instagram
                </Button>
            </View>
        </Card>
    );
}

export default function BountyDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const bountyId = useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);
    const { session } = useAuth();

    const [me, setMe] = useState<{ id: UUID } | null>(null);
    const [bounty, setBounty] = useState<Bounty | null>(null);
    const [accepted, setAccepted] = useState<boolean>(false);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionWithVotes[]>([]);
    const [votedIds, setVotedIds] = useState<Set<UUID>>(new Set());
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [spot, setSpot] = useState<Spot | null>(null);

    const [igUrl, setIgUrl] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ igUrl?: string; form?: string }>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (session) {
            setMe({ id: session.user.id as UUID });
        } else {
            setMe(null);
        }
    }, [session]);

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

            if (bnty?.spot_id) {
                try {
                    const spotData = await fetchSpotById(bnty.spot_id);
                    setSpot(spotData);
                } catch (e) {
                    console.log('load spot error', e);
                    setSpot(null);
                }
            } else {
                setSpot(null);
            }

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

    const requireAuth = useCallback(() => {
        if (!session) {
            Alert.alert('Auth required', 'Sign in to accept or submit to this bounty.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign in', onPress: () => router.push('/login') },
            ]);
            return false;
        }
        return true;
    }, [router, session]);

    const onAccept = useCallback(async () => {
        if (!requireAuth()) return;
        if (!bountyId) return;
        try {
            const { error } = await supabase.rpc('rpc_accept_bounty', { p_bounty: bountyId });
            if (error) throw error;
            setAccepted(true);
            Alert.alert('Accepted', 'You accepted this bounty.');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not accept bounty');
        }
    }, [bountyId, requireAuth]);

    const onSubmitProof = useCallback(async () => {
        if (!requireAuth()) return;
        if (!bountyId) return;
        if (!accepted) return Alert.alert('Accept first', 'Please accept this bounty before submitting proof.');

        setFormError(null);
        setFieldErrors({});
        setSubmitting(true);

        const url = igUrl.trim();

        if (!url) {
            setFieldErrors({ igUrl: 'Paste your Instagram post URL.', form: 'Paste your Instagram post URL.' });
            setFormError('Paste your Instagram post URL.');
            setSubmitting(false);
            return;
        }
        if (!IG_URL_RE.test(url)) {
            setFieldErrors({ igUrl: 'That is not a valid Instagram URL.', form: 'That is not a valid Instagram URL.' });
            setFormError('That is not a valid Instagram URL.');
            setSubmitting(false);
            return;
        }

        const embed = extractInstagramEmbed(url);
        if (!embed) {
            setFieldErrors({ igUrl: 'Unable to read that Instagram link.', form: 'Unable to read that Instagram link.' });
            setFormError('Unable to read that Instagram link.');
            setSubmitting(false);
            return;
        }

        let timestamp: string | null = null;
        try {
            timestamp = await fetchInstagramTimestamp(embed.permalink);
            if (!timestamp) {
                setFormError('Could not find a timestamp on that Instagram post. Submitting without it.');
            }
        } catch (err: any) {
            setFieldErrors((prev) => ({ ...prev, igUrl: 'Could not read Instagram metadata.' }));
            setFormError(`Could not read Instagram metadata: ${err?.message ?? err}`);
        }

        try {
            const { data, error } = await supabase.rpc('rpc_submit_proof', {
                p_bounty: bountyId,
                p_media_url: embed.permalink,
                p_external_posted_at: timestamp,
            });
            if (error) throw error;
            setMySubmission(data as Submission);
            setIgUrl('');
            setFieldErrors({});
            await loadAll();
            Alert.alert('Success', 'Submission saved.');
        } catch (err: any) {
            const message = err?.message ?? 'Could not submit proof.';
            setFormError(message);
            Alert.alert('Submission failed', message);
        } finally {
            setSubmitting(false);
        }
    }, [accepted, bountyId, igUrl, loadAll, requireAuth]);

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
                        {!!bounty.reward && (
                            <Badge tone="warning">
                                Reward: {bounty.reward_type ? `${bounty.reward_type} · ` : ''}${bounty.reward}
                            </Badge>
                        )}
                    </Row>

                    <Row>
                        <Pill>Starts {fmt(bounty.created_at)}</Pill>
                        {!!bounty.expires_at && <Pill>Ends {fmt(bounty.expires_at)}</Pill>}
                        {!!bounty.status && <Badge tone="accent">{bounty.status}</Badge>}
                    </Row>

                    <Muted>Posted by {displayName(bounty.user_id)}</Muted>

                    {!accepted ? (
                        <Button onPress={onAccept} kind={session ? 'solid' : 'ghost'}>
                            {session ? 'Accept Bounty' : 'Sign in to accept'}
                        </Button>
                    ) : (
                        <Badge tone="accent">Accepted</Badge>
                    )}

                    {spot ? (
                        <Card elevated>
                            <H2>Spot</H2>
                            <Muted>{spot.title}</Muted>
                            {spot.image_url ? <Mono>{spot.image_url}</Mono> : null}
                            {(spot.lat ?? null) !== null && (spot.lng ?? null) !== null ? (
                                <Mono>
                                    Coordinates: {spot.lat?.toFixed(4)}, {spot.lng?.toFixed(4)}
                                </Mono>
                            ) : null}
                        </Card>
                    ) : null}

                    <Card elevated>
                        <H2>Submit Instagram proof</H2>

                        {mySubmission ? (
                            <>
                                <Muted>You already submitted for this bounty.</Muted>
                                <Card>
                                    <InstagramEmbed url={mySubmission.media_url} />
                                    <Mono>Posted: {fmt(mySubmission.external_posted_at)}</Mono>
                                    <Mono>Submitted: {fmt(mySubmission.created_at)}</Mono>
                                </Card>
                                <Muted>One submission per bounty per user is enforced by the server.</Muted>
                            </>
                        ) : (
                            <>
                                <Muted>Paste the Instagram post URL. We’ll fetch the timestamp for you.</Muted>
                                <Input
                                    value={igUrl}
                                    onChangeText={setIgUrl}
                                    placeholder="https://instagram.com/p/abc123"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    inputMode="url"
                                    editable={!!session}
                                />
                                {fieldErrors.igUrl ? <Badge tone="warning">{fieldErrors.igUrl}</Badge> : null}
                                {formError ? <Badge tone="warning">{formError}</Badge> : null}
                                <Button onPress={onSubmitProof} kind={session ? 'solid' : 'ghost'} disabled={submitting}>
                                    {session ? (submitting ? 'Submitting…' : 'Submit') : 'Sign in to submit'}
                                </Button>
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
                                        <InstagramEmbed url={s.media_url} />
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
