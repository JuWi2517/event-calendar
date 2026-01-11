import React, { useState } from 'react';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from "firebase/auth";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { checkIsAdmin } from '../utils/adminAuth';
import '../css/Auth.css';

// --- Google Icon Component ---
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPass) {
            setError('Hesla se neshodují.');
            return;
        }

        if (password.length < 6) {
            setError('Heslo musí mít alespoň 6 znaků.');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await handleClaimEvent(userCredential.user.uid);
            navigate('/moje-akce');
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Tento email je již registrován.');
            } else {
                setError('Chyba registrace: ' + err.message);
            }
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            provider.setCustomParameters({
                prompt: 'select_account'
            });

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
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-title">Registrace</h2>

                {error && <div className="validation-error">{error}</div>}

                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="google-auth-btn"
                >
                    <GoogleIcon />
                    <span>Registrovat se přes Google</span>
                </button>

                <div className="auth-divider">
                    <span>nebo</span>
                </div>

                <form onSubmit={handleRegister}>
                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Heslo</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Potvrzení hesla</label>
                        <input
                            type="password"
                            value={confirmPass}
                            onChange={e => setConfirmPass(e.target.value)}
                            required
                        />
                    </div>

                    <p className="auth-info">
                        Registrací berete na vědomí{" "}
                        <Link to="/gdpr" target="_blank">
                            zásady ochrany osobních údajů
                        </Link>.
                    </p>

                    <button type="submit" className="auth-submit">
                        Vytvořit účet
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Již máte účet? </span>
                    <Link to="/prihlaseni">Přihlásit se</Link>
                </div>
            </div>
        </div>
    );
}
