import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser, setAdmin } from '../store/authSlice';
import apiClient from '../api/axios';

function LoginPage() {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await apiClient.post('/api/auth/login', { email, password });
            const { token, email: userEmail, role } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('email', userEmail);
            localStorage.setItem('role', role);
            dispatch(setUser({ email: userEmail, role }));
            dispatch(setAdmin(role === 'ADMIN'));
            navigate(role === 'ADMIN' ? '/admin' : '/');
        } catch (err) {
            setError(err.response?.data?.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await apiClient.post('/api/auth/signup', { email, password });
            setMode('login');
            setError('');
            alert('회원가입이 완료되었습니다. 로그인해주세요.');
        } catch (err) {
            setError(err.response?.data?.message || '회원가입에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 to-purple-800 px-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-violet-600 to-purple-800 px-8 py-10 text-center">
                    <div className="text-5xl mb-3">🗳️</div>
                    <h1 className="text-3xl font-bold text-white tracking-widest">ZK-VOTE</h1>
                    <p className="text-violet-200 text-sm mt-1">영지식 증명 기반 전자투표</p>
                </div>

                <div className="px-8 py-8">
                    {/* Tabs */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
                        <button
                            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-purple-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            onClick={() => { setMode('login'); setError(''); }}
                        >
                            로그인
                        </button>
                        <button
                            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-purple-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            onClick={() => { setMode('signup'); setError(''); }}
                        >
                            회원가입
                        </button>
                    </div>

                    <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">이메일</label>
                            <input
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                type="email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">비밀번호</label>
                            <input
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                type="password"
                                placeholder="비밀번호 입력"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                                <span className="text-red-500 text-base">⚠</span>
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-1 py-3 rounded-lg text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
