import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { checkIsAdmin } from '../utils/adminAuth';
import '../css/AdminDashboard.css';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth();

    const handleClaimEvent = async (uid: string) => {
        const claimId = location.state?.claimEventId;
        if (claimId) {
            try {
                await updateDoc(doc(db, 'submissions', claimId), {
                    hostId: uid
                });
            } catch (e) {
                console.error("Failed to claim event:", e);
            }
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            await handleClaimEvent(userCredential.user.uid);

            if (checkIsAdmin(userCredential.user)) {
                navigate('/admin/dashboard');
            } else {
                navigate('/moje-akce');
            }
        } catch (err: any) {
            setError('Chyba přihlášení: ' + (err.message || 'Zkontrolujte údaje'));
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            await handleClaimEvent(result.user.uid);

            if (checkIsAdmin(result.user)) {
                navigate('/admin/dashboard');
            } else {
                navigate('/moje-akce');
            }
        } catch (err: any) {
            console.error(err);
            setError('Chyba Google přihlášení: ' + err.message);
        }
    };

    return (
        <div className="admin-page" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px' }}>
                <h2 className="admin-title" style={{ marginBottom: '24px' }}>Přihlášení</h2>

                {location.state?.claimEventId && (
                    <div style={{ background: 'rgba(32, 201, 151, 0.1)', color: '#20c997', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
                        ℹ️ Přihlaste se, abychom mohli událost přiřadit k vašemu účtu.
                    </div>
                )}

                {error && <div className="validation-error" style={{ marginBottom: '16px' }}>{error}</div>}

                {/* --- 1. GOOGLE BUTTON (Nahoře) --- */}
                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    style={{
                        width: '100%',
                        backgroundColor: '#ffffff',
                        color: '#3c4043',
                        border: '1px solid #dadce0',
                        borderRadius: '4px',
                        padding: '10px 12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Roboto, arial, sans-serif',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '20px',
                        transition: 'background-color 0.2s, box-shadow 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f7f8f8';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                    }}
                >
                    <GoogleIcon />
                    <span>Přihlásit se přes Google</span>
                </button>

                {/* --- 2. ODDĚLOVAČ --- */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 20px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--line)' }}></div>
                    <span style={{ padding: '0 10px', color: 'var(--muted)', fontSize: '0.85rem' }}>nebo</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--line)' }}></div>
                </div>

                {/* --- 3. FORMULÁŘ (Dole) --- */}
                <form onSubmit={handleLogin}>
                    <div className="field">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="vas@email.cz"
                        />
                    </div>

                    <div className="field">
                        <label>Heslo</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="******"
                        />
                    </div>

                    <button type="submit" className="btn approve" style={{ width: '100%', marginTop: '12px' }}>
                        Přihlásit se
                    </button>
                </form>

                <div style={{
                    marginTop: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem' // Menší písmo pro oba odkazy
                }}>
                    {/* Odkaz na registraci (VLEVO) */}
                    <div>
                        <span style={{ color: 'var(--muted)' }}>Nemáte účet? </span>
                        <Link
                            to="/registrace"
                            state={{ claimEventId: location.state?.claimEventId }}
                            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                        >
                            Zaregistrovat se
                        </Link>
                    </div>

                    {/* Odkaz na reset hesla (VPRAVO) */}
                    <Link
                        to="/reset-hesla"
                        style={{ color: 'var(--muted)', textDecoration: 'none' }}
                        onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                        Zapomněli jste heslo?
                    </Link>
                </div>
            </div>
        </div>
    );
}