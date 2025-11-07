// src/lib/profiles.ts
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = {
    id: string;
    handle: string | null;
    created_at: string;
};

// Get current user's profile (may be null the first time)
export async function getMyProfile(session: Session): Promise<Profile | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

    if (error) throw error;
    return (data as Profile) ?? null;
}

// Upsert (create/update) current user's profile handle
export async function upsertMyHandle(session: Session, handle: string) {
    const { data, error } = await supabase
        .from("profiles")
        .upsert({ id: session.user.id, handle }, { onConflict: "id" })
        .select()
        .single();

    if (error) throw error;
    return data as Profile;
}
