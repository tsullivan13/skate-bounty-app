// src/lib/bounties.ts
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Bounty = {
    id: string;
    user_id: string;
    trick: string;
    reward: number | null;
    reward_type: string | null;
    status: string | null;
    spot_id?: string | null;
    expires_at?: string | null;
    created_at: string;
};

export type CreateBountyInput = {
    trick: string;
    reward?: number | null;
    reward_type?: string | null;
    status?: string | null;
    spot_id?: string | null;
    expires_at?: string | null;
};

export async function createBounty(session: Session, input: CreateBountyInput) {
    const payload = {
        user_id: session.user.id,
        trick: input.trick,
        reward: input.reward ?? null,
        reward_type: input.reward_type ?? null,
        status: input.status ?? "open",
        spot_id: input.spot_id ?? null,
        expires_at: input.expires_at ?? null,
    };

    const { data, error } = await supabase
        .from("bounties")
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data as Bounty;
}

export async function fetchBounties(): Promise<Bounty[]> {
    const { data, error } = await supabase
        .from("bounties")
        .select("id,user_id,trick,reward,reward_type,status,spot_id,expires_at,created_at")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Bounty[];
}

export async function fetchBountiesByUser(userId: string): Promise<Bounty[]> {
    const { data, error } = await supabase
        .from("bounties")
        .select("id,user_id,trick,reward,reward_type,status,spot_id,expires_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Bounty[];
}

export function subscribeBounties(
    onInsert: (row: Bounty) => void,
    onUpdate?: (row: Bounty) => void,
    onDelete?: (row: Bounty) => void
) {
    const channel = supabase
        .channel("bounties-realtime")
        .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "bounties" },
            (payload) => {
                onInsert(payload.new as Bounty);
            }
        )
        .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "bounties" },
            (payload) => {
                onUpdate?.(payload.new as Bounty);
            }
        )
        .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "bounties" },
            (payload) => {
                onDelete?.(payload.old as Bounty);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
