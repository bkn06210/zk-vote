import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser, setAdmin, clearUser } from './store/authSlice';

import LoginPage from './pages/LoginPage';
import VoterMainPage from './pages/Voter/VoterMainPage';
import VotePage from './pages/Voter/VotePage';
import AdminMainPage from './pages/Admin/AdminMainPage';
import CreateVotePage from './pages/Admin/CreateVotePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function AuthInitializer({ children }) {
    const dispatch = useDispatch();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const email = localStorage.getItem('email');
        const role = localStorage.getItem('role');
        if (token && email && role) {
            dispatch(setUser({ email, role }));
            dispatch(setAdmin(role === 'ADMIN'));
        } else {
            dispatch(clearUser());
        }
    }, [dispatch]);

    return children;
}

function App() {
    return (
        <BrowserRouter>
            <AuthInitializer>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<ProtectedRoute><VoterMainPage /></ProtectedRoute>} />
                    <Route path="/vote/:id" element={<ProtectedRoute><VotePage /></ProtectedRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminMainPage /></AdminRoute>} />
                    <Route path="/admin/create" element={<AdminRoute><CreateVotePage /></AdminRoute>} />
                    <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
                </Routes>
            </AuthInitializer>
        </BrowserRouter>
    );
}

export default App;
