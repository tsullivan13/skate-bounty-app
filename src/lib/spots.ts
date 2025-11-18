// src/lib/spots.ts
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Spot = {
    id: string;
    user_id: string;
    title: string;
    image_url: string | null;
    lat: number | null;
    lng: number | null;
    created_at: string;
};

export type CreateSpotInput = {
    title: string;
    image_url?: string | null;
    lat?: number | null;
    lng?: number | null;
};

export async function createSpot(session: Session, input: CreateSpotInput): Promise<Spot> {
    const { data, error } = await supabase
        .from("spots")
        .insert([
            {
                user_id: session.user.id,
                title: input.title,
                image_url: input.image_url ?? null,
                lat: input.lat ?? null,
                lng: input.lng ?? null,
            },
        ])
        .select()
        .single();

    if (error) throw error;
    return data as Spot;
}

export async function fetchSpots(): Promise<Spot[]> {
    const { data, error } = await supabase
        .from("spots")
        .select("id,user_id,title,image_url,lat,lng,created_at")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Spot[];
}
