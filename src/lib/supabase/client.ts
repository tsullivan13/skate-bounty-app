// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// You can feed these via app.json -> expo.extra or with .env + babel plugin.
// For now we read from process.env which Expo supports when configured.
// Ensure you have SUPABASE_URL and SUPABASE_ANON_KEY set (see .env.example).
const SUPABASE_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
const SUPABASE_ANON_KEY =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        '[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set them in .env or app.json (expo.extra).'
    );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});

// Minimal row types to keep this file standalone.
// If you already have generated types, swap these with your Database types.
export type Bounty = {
    id: string;
    title?: string | null;
    rules?: string | null;
    reward?: string | null;
    spot_id?: string | null;
    created_at: string;
    starts_at?: string | null;
    ends_at?: string | null;
};

export type Submission = {
    id: string;
    bounty_id: string;
    user_id: string;
    external_url: string | null;
    external_posted_at: string | null;
    created_at: string;
};
