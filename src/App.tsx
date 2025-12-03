import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicPage from "./pages/PublicPage";
import { auth } from "./firebase";
import { onAuthStateChanged,type User } from "firebase/auth";
import "./css/App.css";

const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const AdminPage = React.lazy(() => import("./pages/AdminPage"));

function PrivateRoute({ children }: { children: React.ReactElement }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    if (loading) {
        return <div>Ověřování...</div>;
    }

    return user ? children : <Navigate to="/admin/login" replace />;
}
// cache bust 2

export default function App() {
    return (

            <BrowserRouter>
                <Suspense fallback={<div>Načítám stránku...</div>}>
                    <Routes>
                        <Route path="/" element={<PublicPage />} />
                        <Route path="/admin/login" element={<LoginPage />} />
                        <Route
                            path="/admin/*"
                            element={
                                <PrivateRoute>
                                    <AdminPage />
                                </PrivateRoute>
                            }
                        />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
    );
}