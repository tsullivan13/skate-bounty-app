// src/lib/submissions.ts
import { supabase } from "./supabase";

export type Submission = {
    id: string;
    bounty_id: string;
    user_id: string;
    media_url: string | null;
    caption?: string | null;
    status?: string | null;
    created_at: string;
    external_posted_at?: string | null;
};

export type SubmissionWithVotes = Submission & { vote_count?: number | null };

export async function fetchSubmissionsByUser(userId: string): Promise<SubmissionWithVotes[]> {
    const { data, error } = await supabase
        .from("v_submissions_with_votes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) return data as SubmissionWithVotes[];

    const { data: fallback, error: fallbackErr } = await supabase
        .from("submissions")
        .select("id,bounty_id,user_id,media_url,caption,status,created_at,external_posted_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (fallbackErr) throw fallbackErr;
    if (!fallback?.length) return [];

    const { data: votes, error: votesErr } = await supabase
        .from("submission_votes")
        .select("submission_id");
    if (votesErr) throw votesErr;

    const counts = new Map<string, number>();
    (votes ?? []).forEach((row) => {
        const key = row.submission_id as string;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return fallback.map((s) => ({ ...s, vote_count: counts.get(s.id) ?? 0 }));
}
