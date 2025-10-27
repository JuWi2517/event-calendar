import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import Login from '../components/Login';

export default function LoginPage() {
    const nav = useNavigate();
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(u => { if (u) nav('/admin'); });
        return unsub;
    }, [nav]);

    return <Login />;
}