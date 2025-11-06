// /src/providers/AuthProvider.tsx
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthCtx = {
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
    session: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session ?? null);
            setLoading(false);

            const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
                setSession(s ?? null);
                if (s) SecureStore.setItemAsync('sb-session', JSON.stringify(s));
                else SecureStore.deleteItemAsync('sb-session');
            });

            return () => sub.subscription.unsubscribe();
        })();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
