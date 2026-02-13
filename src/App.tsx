import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { checkIsAdmin } from './utils/adminAuth';
import ResetPassword from "./components/ResetPassword.tsx";
import "css/Global.css"


const Navbar = React.lazy(() => import("./components/Navbar"));
const Footer = React.lazy(() => import("./components/Footer"));
const UserLogin = React.lazy(() => import("./components/Login"));
const UserRegister = React.lazy(() => import("./components/Register"));
const HostDashboard = React.lazy(() => import("./components/HostDashboard"));
const AdminPage = React.lazy(() => import("./pages/AdminPage"));
const PublicPage = React.lazy(() => import("./pages/PublicPage"));
const PrivacyPolicy = React.lazy(() =>import("./components/PrivacyPolicy.tsx"));

// 1. GENERIC PRIVATE ROUTE (For Hosts)
function PrivateRoute({ children }: { children: React.ReactElement }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <div className="admin-page">Načítám...</div>;
    return user ? children : <Navigate to="/prihlaseni" replace />;
}

// 2. SPECIFIC ADMIN ROUTE (For Admins only)
function AdminRoute({ children }: { children: React.ReactElement }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setIsAdmin(checkIsAdmin(u)); // Check if email matches
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <div className="admin-page">Ověřování práv...</div>;

    if (user && isAdmin) return children;
    if (user && !isAdmin) return <Navigate to="/moje-akce" replace />;
    return <Navigate to="/prihlaseni" replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<div>Načítám...</div>}>
                <Navbar />
                <Routes>
                    <Route path="/" element={<PublicPage />} />

                    <Route path="/prihlaseni" element={<UserLogin />} />
                    <Route path="/registrace" element={<UserRegister />} />

                    {/* Host Route */}
                    <Route
                        path="/moje-akce"
                        element={
                            <PrivateRoute>
                                <HostDashboard />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/admin/dashboard"
                        element={
                            <AdminRoute>
                                <AdminPage />
                            </AdminRoute>
                        }
                    />

                    <Route path="reset-hesla" element={<ResetPassword />} />

                    <Route path="gdpr" element={<PrivacyPolicy/>}/>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Footer/>
            </Suspense>
        </BrowserRouter>
    );
}