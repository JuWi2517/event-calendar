import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicPage from './pages/PublicPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { auth } from './firebase';
import './css/App.css';

function PrivateRoute({ children }: { children: JSX.Element }) {
    return auth.currentUser ? children : <Navigate to="/admin/login" />;
}

export default function App() {
    return (
        <>



            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<PublicPage />} />
                    <Route path="/admin/login" element={<LoginPage />} />
                    <Route
                        path="/admin/*"
                        element={<PrivateRoute><AdminPage /></PrivateRoute>}
                    />
                </Routes>
            </BrowserRouter>
        </>
    );
}
