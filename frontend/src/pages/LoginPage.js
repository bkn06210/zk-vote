import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser, setAdmin } from '../store/authSlice';
import apiClient from '../api/axios';

function LoginPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
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
            dispatch(setAdmin(role === 'ROLE_ADMIN'));
            navigate(role === 'ROLE_ADMIN' ? '/admin' : '/');
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
        <div style={styles.bg}>
            <div style={styles.card}>
                <div style={styles.logo}>
                    <span style={styles.logoIcon}>🗳️</span>
                    <h1 style={styles.logoText}>ZK-VOTE</h1>
                    <p style={styles.logoSub}>영지식 증명 기반 전자투표</p>
                </div>

                <div style={styles.tabs}>
                    <button
                        style={mode === 'login' ? styles.tabActive : styles.tab}
                        onClick={() => { setMode('login'); setError(''); }}
                    >
                        로그인
                    </button>
                    <button
                        style={mode === 'signup' ? styles.tabActive : styles.tab}
                        onClick={() => { setMode('signup'); setError(''); }}
                    >
                        회원가입
                    </button>
                </div>

                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>이메일</label>
                        <input
                            style={styles.input}
                            type="email"
                            placeholder="email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>비밀번호</label>
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="비밀번호 입력"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button
                        type="submit"
                        style={loading ? styles.btnDisabled : styles.btn}
                        disabled={loading}
                    >
                        {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    bg: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', sans-serif",
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    logo: {
        textAlign: 'center',
        marginBottom: '28px',
    },
    logoIcon: {
        fontSize: '2.5rem',
    },
    logoText: {
        margin: '8px 0 4px',
        fontSize: '1.8rem',
        fontWeight: '700',
        color: '#1a1a2e',
        letterSpacing: '2px',
    },
    logoSub: {
        margin: 0,
        color: '#888',
        fontSize: '0.85rem',
    },
    tabs: {
        display: 'flex',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
        marginBottom: '24px',
    },
    tab: {
        flex: 1,
        padding: '10px',
        border: 'none',
        background: 'white',
        color: '#888',
        cursor: 'pointer',
        fontSize: '0.95rem',
        transition: 'all 0.2s',
    },
    tabActive: {
        flex: 1,
        padding: '10px',
        border: 'none',
        background: '#764ba2',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#444',
    },
    input: {
        padding: '12px 14px',
        border: '1.5px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    btn: {
        marginTop: '8px',
        padding: '13px',
        background: '#764ba2',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    btnDisabled: {
        marginTop: '8px',
        padding: '13px',
        background: '#aaa',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'not-allowed',
    },
    error: {
        color: '#e53e3e',
        fontSize: '0.85rem',
        margin: 0,
        padding: '10px 12px',
        background: '#fff5f5',
        borderRadius: '6px',
        border: '1px solid #fed7d7',
    },
};

export default LoginPage;
