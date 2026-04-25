import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { clearUser } from '../../store/authSlice';
import axios from '../../api/axios';

function VoterMainPage() {
    const auth = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [registerableVotes, setRegisterableVotes] = useState([]);
    const [votableVotes, setVotableVotes] = useState([]);
    const [completedVotes, setCompletedVotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registeringId, setRegisteringId] = useState(null);

    const fetchAllVotes = useCallback(async () => {
        if (!auth.isLoggedIn) return;
        setLoading(true);
        try {
            const [regRes, votingRes, completedRes] = await Promise.all([
                axios.get('/api/elections/registerable'),
                axios.get('/api/elections/voting'),
                axios.get('/api/elections/completed'),
            ]);
            setRegisterableVotes(Array.isArray(regRes.data) ? regRes.data : []);
            setVotableVotes(Array.isArray(votingRes.data) ? votingRes.data : []);
            setCompletedVotes(Array.isArray(completedRes.data) ? completedRes.data : []);
        } catch (err) {
            console.error('투표 목록 조회 실패:', err);
        } finally {
            setLoading(false);
        }
    }, [auth.isLoggedIn]);

    useEffect(() => { fetchAllVotes(); }, [fetchAllVotes]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('role');
        dispatch(clearUser());
        navigate('/login');
    };

    const handleRegister = async (electionId, electionName) => {
        if (!window.confirm(`'${electionName}' 투표에 유권자로 등록하시겠습니까?`)) return;
        setRegisteringId(electionId);
        try {
            await axios.post(`/api/elections/${electionId}/voters/register`);
            alert(`'${electionName}' 투표에 성공적으로 등록되었습니다.`);
            fetchAllVotes();
        } catch (err) {
            alert(`등록 실패: ${err.response?.data?.message || '오류가 발생했습니다.'}`);
        } finally {
            setRegisteringId(null);
        }
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1 style={styles.title}>ZK-VOTE</h1>
                {auth.isLoggedIn && (
                    <div style={styles.headerRight}>
                        <span style={styles.email}>{auth.user?.email}</span>
                        {auth.isAdmin && (
                            <Link to="/admin">
                                <button style={styles.btnSecondary}>관리자 페이지</button>
                            </Link>
                        )}
                        <button onClick={handleLogout} style={styles.btnOutline}>로그아웃</button>
                    </div>
                )}
            </header>

            {loading ? (
                <div style={styles.center}>투표 목록을 불러오는 중...</div>
            ) : (
                <>
                    <Section title="투표 진행 중" icon="🗳️">
                        {votableVotes.length === 0 ? (
                            <Empty>현재 진행 중인 투표가 없습니다.</Empty>
                        ) : votableVotes.map((vote) => {
                            const hasVoted = localStorage.getItem(`voted_${vote.id}`) === 'true';
                            return (
                                <VoteCard key={vote.id}>
                                    <div style={styles.cardRow}>
                                        <span style={styles.voteName}>{vote.name}</span>
                                        {hasVoted ? (
                                            <span style={styles.badgeGreen}>투표 완료</span>
                                        ) : (
                                            <button
                                                style={styles.btnPrimary}
                                                onClick={() => navigate(`/vote/${vote.id}`, { state: { vote } })}
                                            >
                                                투표하기
                                            </button>
                                        )}
                                    </div>
                                    <p style={styles.meta}>마감: {new Date(vote.votingEndTime).toLocaleString()}</p>
                                </VoteCard>
                            );
                        })}
                    </Section>

                    <Section title="유권자 등록 가능" icon="📋">
                        {registerableVotes.length === 0 ? (
                            <Empty>등록 가능한 투표가 없습니다.</Empty>
                        ) : registerableVotes.map((vote) => (
                            <VoteCard key={vote.id}>
                                <div style={styles.cardRow}>
                                    <span style={styles.voteName}>{vote.name}</span>
                                    <button
                                        style={registeringId === vote.id ? styles.btnDisabled : styles.btnInfo}
                                        onClick={() => handleRegister(vote.id, vote.name)}
                                        disabled={registeringId === vote.id}
                                    >
                                        {registeringId === vote.id ? '등록 중...' : '등록하기'}
                                    </button>
                                </div>
                                <p style={styles.meta}>등록 마감: {new Date(vote.registrationEndTime).toLocaleString()}</p>
                            </VoteCard>
                        ))}
                    </Section>

                    <Section title="참여했던 투표" icon="✅">
                        {completedVotes.length === 0 ? (
                            <Empty>참여했던 투표가 없습니다.</Empty>
                        ) : completedVotes.map((vote) => (
                            <VoteCard key={vote.id}>
                                <div style={styles.cardRow}>
                                    <span style={styles.voteName}>{vote.name}</span>
                                    <div style={styles.row}>
                                        {vote.contractAddress && (
                                            <a
                                                href={`https://sepolia.etherscan.io/address/${vote.contractAddress}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <button style={styles.btnSecondary}>컨트랙트 보기</button>
                                            </a>
                                        )}
                                        <span style={styles.badgeGray}>종료됨</span>
                                    </div>
                                </div>
                            </VoteCard>
                        ))}
                    </Section>
                </>
            )}
        </div>
    );
}

function Section({ title, icon, children }) {
    return (
        <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{icon} {title}</h2>
            {children}
        </section>
    );
}

function VoteCard({ children }) {
    return <div style={styles.card}>{children}</div>;
}

function Empty({ children }) {
    return <p style={styles.empty}>{children}</p>;
}

const styles = {
    page: { fontFamily: "'Segoe UI', sans-serif", padding: '24px', maxWidth: '800px', margin: 'auto', color: '#1a1a2e' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingBottom: '16px', borderBottom: '2px solid #e0e0e0' },
    title: { fontSize: '1.8rem', fontWeight: '800', color: '#0f3460', letterSpacing: '2px', margin: 0 },
    headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    email: { fontSize: '0.9rem', color: '#666' },
    section: { marginBottom: '32px' },
    sectionTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
    card: { background: 'white', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '16px 20px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
    cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    row: { display: 'flex', gap: '8px', alignItems: 'center' },
    voteName: { fontWeight: '600', fontSize: '1rem' },
    meta: { margin: '8px 0 0', color: '#888', fontSize: '0.85rem' },
    empty: { color: '#aaa', fontStyle: 'italic', padding: '8px 0' },
    center: { textAlign: 'center', padding: '60px', color: '#888' },
    btnPrimary: { padding: '8px 18px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' },
    btnInfo: { padding: '8px 18px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' },
    btnSecondary: { padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
    btnOutline: { padding: '8px 16px', background: 'white', color: '#0f3460', border: '1.5px solid #0f3460', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' },
    btnDisabled: { padding: '8px 18px', background: '#ccc', color: 'white', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontSize: '0.9rem' },
    badgeGreen: { padding: '5px 12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' },
    badgeGray: { padding: '5px 12px', background: '#f5f5f5', color: '#666', borderRadius: '20px', fontSize: '0.85rem' },
};

export default VoterMainPage;
