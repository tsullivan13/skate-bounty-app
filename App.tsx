// /App.tsx
import React from 'react';
import { AuthProvider } from './src/providers/AuthProvider';
import RootNav from './src/routes/RootNav';

export default function App() {
    return (
        <AuthProvider>
            <RootNav />
        </AuthProvider>
    );
}
