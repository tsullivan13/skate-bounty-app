// src/lib/profiles.ts
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = {
    id: string;
    handle: string | null;
    created_at: string;
};

export async function getMyProfile(session: Session): Promise<Profile | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

    if (error) throw error;
    return (data as Profile) ?? null;
}

export async function upsertMyHandle(session: Session, handle: string) {
    const { data, error } = await supabase
        .from("profiles")
        .upsert({ id: session.user.id, handle }, { onConflict: "id" })
        .select()
        .single();

    if (error) throw error;
    return data as Profile;
}

export async function fetchProfilesByIds(ids: string[]): Promise<Profile[]> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return [];

    const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, created_at")
        .in("id", uniqueIds);

    if (error) throw error;
    return (data ?? []) as Profile[];
}
