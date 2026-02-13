import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { checkIsAdmin } from '../utils/adminAuth';
import '../css/Navbar.css';

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
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
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/">🗓️ Kalendář</Link>
            </div>

            <div className="navbar-actions">
                {user ? (
                    <>
                        {isAdmin ? (
                            <Link to="/admin/dashboard">
                                <button className="btn btn-admin">
                                    Admin Panel
                                </button>
                            </Link>
                        ) : (
                            <Link to="/moje-akce">
                                <button className="btn btn-moje-akce">
                                    Moje Akce
                                </button>
                            </Link>
                        )}
                        <button onClick={handleSignOut} className="btn neutral">
                            Odhlásit
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/prihlaseni">
                            <button className="btn ghost">Přihlásit</button>
                        </Link>
                        <Link to="/registrace">
                            <button className="btn approve">Registrace</button>
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}