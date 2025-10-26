import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'login'|'signup'>('login');
    const [error, setError] = useState<string|null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null);
        try {
            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: 300, margin: '2rem auto' }}>
            <h2>{mode === 'login' ? 'Přihlášení' : 'Registrace'}</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <label>Email:</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <label>Heslo:</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit">{mode === 'login' ? 'Přihlásit' : 'Zaregistrovat'}</button>
            <p onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ cursor: 'pointer', textAlign: 'center' }}>
            </p>
        </form>
    );
}