import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Link } from 'react-router-dom';
import '../css/AdminDashboard.css';

export default function ResetPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const auth = getAuth();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('✅ Odkaz pro obnovení hesla byl odeslán na váš email. Zkontrolujte prosím i složku Spam.');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError('Tento email není v systému registrován.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Neplatný formát emailu.');
            } else {
                setError('Chyba při odesílání: ' + err.message);
            }
        }
        setLoading(false);
    };

    return (
        <div className="admin-page" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px' }}>
                <h2 className="admin-title" style={{ marginBottom: '24px' }}>Obnovení hesla</h2>

                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
                    Zadejte emailovou adresu, kterou jste použili při registraci. Pošleme vám odkaz pro vytvoření nového hesla.
                </p>

                {message && (
                    <div style={{
                        background: 'rgba(32, 201, 151, 0.1)',
                        color: '#20c997',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '0.9rem'
                    }}>
                        {message}
                    </div>
                )}

                {error && <div className="validation-error" style={{ marginBottom: '16px' }}>{error}</div>}

                <form onSubmit={handleReset}>
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

                    <button
                        type="submit"
                        className="btn approve"
                        style={{ width: '100%', marginTop: '12px' }}
                        disabled={loading}
                    >
                        {loading ? 'Odesílám...' : 'Odeslat odkaz'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
                    <Link
                        to="/prihlaseni"
                        style={{ color: 'var(--muted)', textDecoration: 'none' }}
                    >
                        ← Zpět na přihlášení
                    </Link>
                </div>
            </div>
        </div>
    );
}