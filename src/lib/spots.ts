// src/lib/spots.ts
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Spot = {
    id: string;
    user_id: string;
    title: string;
    image_url: string | null;
    lat: number;
    lng: number;
    created_at: string;
};

export async function createSpot(
    session: Session,
    title: string,
    lat: number,
    lng: number,
    image_url?: string | null
): Promise<Spot> {
    const { data, error } = await supabase
        .from("spots")
        .insert([{ user_id: session.user.id, title, lat, lng, image_url: image_url ?? null }])
        .select()
        .single();

    if (error) throw error;
    return data as Spot;
}

export async function fetchSpots(): Promise<Spot[]> {
    const { data, error } = await supabase
        .from("spots")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Spot[];
}
