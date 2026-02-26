import React, {useEffect, useState} from 'react';
import {
    getAuth,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from "firebase/auth";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { checkIsAdmin } from '../utils/adminAuth';
import '../css/Auth.css';

const isInAppBrowser = (): boolean => {
    const ua = navigator.userAgent || navigator.vendor || '';
    return /FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger|Snapchat|TikTok/i.test(ua);
};

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
    const [showInAppModal, setShowInAppModal] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth();

    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = "robots";
        meta.content = "noindex, nofollow";

        document.head.appendChild(meta);

        return () => {
            document.head.removeChild(meta);
        };
    }, []);

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
            setError('Chyba přihlášení: zkontrolujte email a heslo.');
        }
    };

    const handleGoogleLogin = async () => {
        if (isInAppBrowser()) {
            setShowInAppModal(true);
            return;
        }

        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await signInWithPopup(auth, provider);

            await handleClaimEvent(result.user.uid);

            if (checkIsAdmin(result.user)) {
                navigate('/admin/dashboard');
            } else {
                navigate('/moje-akce');
            }
        } catch (err: any) {
            console.error(err);
            setError('Chyba Google přihlášení.');
        }
    };

    const handleOpenInBrowser = () => {
        const url = window.location.href;

        if (/android/i.test(navigator.userAgent)) {
            window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`;
        } else {
            navigator.clipboard?.writeText(url);
            alert('Odkaz byl zkopírován. Otevřete ho v Safari nebo Chrome.');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-title">Přihlášení</h2>

                {location.state?.claimEventId && (
                    <div className="auth-info">
                        ℹ️ Přihlaste se, aby bylo možné událost přiřadit k vašemu účtu.
                    </div>
                )}

                {error && <div className="validation-error">{error}</div>}

                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="google-auth-btn"
                >
                    <GoogleIcon />
                    <span>Přihlásit se přes Google</span>
                </button>

                <div className="auth-divider">
                    <span>nebo</span>
                </div>

                <form onSubmit={handleLogin}>
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

                    <button type="submit" className="auth-submit">
                        Přihlásit se
                    </button>
                </form>

                <div className="auth-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span>Nemáte účet? </span>
                        <Link
                            to="/registrace"
                            state={{ claimEventId: location.state?.claimEventId }}
                        >
                            Zaregistrovat se
                        </Link>
                    </div>

                    <Link to="/reset-hesla" style={{ fontWeight: 400 }}>
                        Zapomněli jste heslo?
                    </Link>
                </div>
            </div>

            {showInAppModal && (
                <div
                    className="inapp-modal-overlay"
                    onClick={() => setShowInAppModal(false)}
                >
                    <div
                        className="auth-card inapp-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="auth-title">Google přihlášení</h2>

                        <p className="inapp-modal-text">
                            Prohlížeč v této aplikaci nepodporuje přihlášení přes Google.
                            Otevřete stránku v běžném prohlížeči, nebo se přihlaste emailem a heslem.
                        </p>

                        <button
                            type="button"
                            className="auth-submit inapp-modal-primary"
                            onClick={handleOpenInBrowser}
                        >
                            Otevřít v prohlížeči
                        </button>

                        <button
                            type="button"
                            className="inapp-modal-secondary"
                            onClick={() => setShowInAppModal(false)}
                        >
                            Přihlásit se jinak
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}