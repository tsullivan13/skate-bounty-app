// src/lib/bountyDetail.ts
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Submission = {
    id: string;
    bounty_id: string;
    user_id: string;
    caption: string | null;
    status: string; // pending|verified|rejected
    created_at: string;

    // URL-based submission
    external_url: string | null;
    external_posted_at: string | null;

    votes?: number;
};

export async function getBounty(id: string) {
    const { data, error } = await supabase
        .from("bounties")
        .select("*")
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}

export async function getSpot(id: string) {
    if (!id) return null;
    const { data, error } = await supabase
        .from("spots")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function acceptBounty(session: Session, bounty_id: string) {
    const { data, error } = await supabase
        .from("bounty_acceptances")
        .insert([{ bounty_id, user_id: session.user.id }])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function listSubmissions(bounty_id: string): Promise<Submission[]> {
    const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("bounty_id", bounty_id)
        .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as Submission[];
    const ids = rows.map((s) => s.id);
    if (!ids.length) return rows;

    const { data: votes, error: vErr } = await supabase
        .from("submission_votes")
        .select("submission_id, count: submission_id")
        .in("submission_id", ids);
    if (vErr) throw vErr;

    const counts = new Map<string, number>();
    (votes ?? []).forEach((v: any) => counts.set(v.submission_id, Number(v.count)));

    return rows.map((s) => ({ ...s, votes: counts.get(s.id) ?? 0 }));
}

/**
 * Submit URL-only proof for a bounty.
 *
 * The DB trigger ensures external_posted_at >= bounty.created_at.
 */
export async function submitProofUrl(
    session: Session,
    bounty_id: string,
    externalUrl: string,
    postedAtISO: string | null,
    caption: string
) {
    const insert = {
        bounty_id,
        user_id: session.user.id,
        caption,
        external_url: externalUrl,
        external_posted_at: postedAtISO,
    };

    const { data, error } = await supabase
        .from("submissions")
        .insert([insert])
        .select()
        .single();

    if (error) throw error;
    return data as Submission;
}

export async function voteSubmission(session: Session, submission_id: string) {
    const { data, error } = await supabase
        .from("submission_votes")
        .insert([{ submission_id, user_id: session.user.id }])
        .select()
        .single();
    if (error) throw error;
    return data;
}
