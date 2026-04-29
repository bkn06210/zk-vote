import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../api/axios';

function ChangePasswordPage() {
    const navigate = useNavigate();
    const isAdmin = useSelector((state) => state.auth.isAdmin);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) { setError('새 비밀번호가 일치하지 않습니다.'); return; }
        if (newPassword.length < 8) { setError('새 비밀번호는 8자 이상이어야 합니다.'); return; }
        setLoading(true);
        try {
            await axios.post('/api/auth/change-password', { currentPassword, newPassword });
            alert('비밀번호가 변경되었습니다.');
            navigate(isAdmin ? '/admin' : '/');
        } catch (err) {
            setError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-violet-600 to-purple-800 px-8 py-8 text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <h1 className="text-xl font-bold text-white">비밀번호 변경</h1>
                </div>

                <div className="px-8 py-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">현재 비밀번호</label>
                            <input
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">새 비밀번호</label>
                            <input
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                type="password"
                                placeholder="8자 이상"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">새 비밀번호 확인</label>
                            <input
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                                <span className="text-red-500">⚠</span>
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 mt-1">
                            <button
                                type="button"
                                className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                onClick={() => navigate(isAdmin ? '/admin' : '/')}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 text-white text-sm font-semibold rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed bg-purple-700 hover:bg-purple-800"
                            >
                                {loading ? '변경 중...' : '변경하기'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ChangePasswordPage;
