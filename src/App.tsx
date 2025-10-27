import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicPage from "./pages/PublicPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import { auth } from "./firebase";
import "./css/App.css";

function PrivateRoute({ children }: { children: React.ReactElement }) {
    return auth.currentUser ? children : <Navigate to="/admin/login" replace />;
}
// cache bust 2
export default function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<PublicPage />} />
                <Route path="/admin/login" element={<LoginPage />} />
                <Route path="/admin/*" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
}
