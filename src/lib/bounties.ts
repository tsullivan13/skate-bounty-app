// src/lib/bounties.ts
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Bounty = {
    id: string;
    user_id: string;
    trick: string;
    reward: number;
    created_at: string;
};

export async function createBounty(
    session: Session,
    trick: string,
    reward: number
) {
    const { data, error } = await supabase
        .from("bounties")
        .insert([
            {
                user_id: session.user.id,
                trick,
                reward: Number(reward),
            },
        ])
        .select()
        .single();

    if (error) throw error;
    return data as Bounty;
}

export async function fetchBounties(): Promise<Bounty[]> {
    const { data, error } = await supabase
        .from("bounties")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Bounty[];
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
