import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import AdminDashboard from '../components/AdminDashboard';

export default function AdminPage() {
    return (
        <div style={{ padding: '1rem' }}>
            <button onClick={() => signOut(auth)}>Odhlásit</button>
            <AdminDashboard />
        </div>
    );
}