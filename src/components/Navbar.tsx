import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { checkIsAdmin } from '../utils/adminAuth'; // Import the helper
import '../css/AdminDashboard.css';

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false); // State for admin status
    const auth = getAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAdmin(checkIsAdmin(currentUser));
        });
        return () => unsubscribe();
    }, [auth]);

    const handleSignOut = async () => {
        await signOut(auth);
        navigate('/');
    };

    return (
        <nav style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)',backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>
                <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>🗓️ Kalendář</Link>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {user ? (
                    <>
                        {/* CONDITIONAL DASHBOARD BUTTON */}
                        {isAdmin ? (
                            <Link to="/admin/dashboard">
                                <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }}>
                                    Admin Panel
                                </button>
                            </Link>
                        ) : (
                            <Link to="/moje-akce">
                                <button className="btn" style={{ background: 'var(--accent)', color: '#000' }}>
                                    Moje Akce
                                </button>
                            </Link>
                        )}

                        <button onClick={handleSignOut} className="btn neutral">Odhlásit</button>
                    </>
                ) : (
                    <>
                        <Link to="/prihlaseni"><button className="btn ghost">Přihlásit</button></Link>
                        <Link to="/registrace"><button className="btn approve">Registrace</button></Link>
                    </>
                )}
            </div>
        </nav>
    );
}