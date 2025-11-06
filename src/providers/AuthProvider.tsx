// src/providers/AuthProvider.tsx
import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { deleteItem, saveItem } from '../lib/storage';
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

    /**
     * On mount → get existing session
     */
    useEffect(() => {
        const init = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session ?? null);
            setLoading(false);
        };
        init();

        /**
         * Subscribe to session changes
         */
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession ?? null);

            if (newSession) {
                saveItem('sb-session', JSON.stringify(newSession));
            } else {
                deleteItem('sb-session');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    /**
     * Sign Out
     */
    const signOut = async () => {
        await supabase.auth.signOut();
        deleteItem('sb-session');
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
