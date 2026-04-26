import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearUser } from '../../store/authSlice';
import axios from '../../api/axios';
import Modal from '../../components/Modal';

function AdminMainPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [registrationVotes, setRegistrationVotes] = useState([]);
    const [votingVotes, setVotingVotes] = useState([]);
    const [completedVotes, setCompletedVotes] = useState([]);

    const [actionLoading, setActionLoading] = useState({
        isRegistering: false,
        isStartingVoting: null,
        isCompleting: null,
    });

    const [isVoterModalOpen, setIsVoterModalOpen] = useState(false);
    const [isStartVotingModalOpen, setIsStartVotingModalOpen] = useState(false);
    const [selectedVote, setSelectedVote] = useState(null);
    const [voters, setVoters] = useState('');
    const [contractAddress, setContractAddress] = useState('');
    const [votingEndTime, setVotingEndTime] = useState('');

    const fetchAllVotes = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/elections');
            const all = Array.isArray(res.data) ? res.data : [];
            setRegistrationVotes(all.filter(v => v.status === 'REGISTRATION'));
            setVotingVotes(all.filter(v => v.status === 'VOTING'));
            setCompletedVotes(all.filter(v => v.status === 'COMPLETED'));
        } catch (err) {
            console.error('투표 목록 조회 실패:', err);
            alert('투표 목록을 불러오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchAllVotes(); }, [fetchAllVotes]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('role');
        dispatch(clearUser());
        navigate('/login');
    };

    const handleRegisterVoters = async () => {
        if (!selectedVote) return;
        const voterList = voters.split(/[\n, ]+/).filter(v => v.trim() !== '');
        if (voterList.length === 0) {
            alert('이메일을 입력해주세요.');
            return;
        }
        setActionLoading(prev => ({ ...prev, isRegistering: true }));
        try {
            await axios.post(`/api/elections/${selectedVote.id}/voters`, { emails: voterList });
            alert(`${voterList.length}명이 등록되었습니다.`);
            setIsVoterModalOpen(false);
            setVoters('');
        } catch (err) {
            alert(`유권자 등록 실패: ${err.response?.data?.message || err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, isRegistering: false }));
        }
    };

    const handleStartVoting = async () => {
        if (!selectedVote) return;
        if (!contractAddress || !votingEndTime) {
            alert('모든 항목을 입력해주세요.');
            return;
        }
        setActionLoading(prev => ({ ...prev, isStartingVoting: selectedVote.id }));
        try {
            await axios.post(`/api/elections/${selectedVote.id}/start-voting`, {
                contractAddress,
                votingEndTime,
            });
            alert('투표가 시작되었습니다.');
            setIsStartVotingModalOpen(false);
            setContractAddress('');
            setVotingEndTime('');
            fetchAllVotes();
        } catch (err) {
            alert(`투표 시작 실패: ${err.response?.data?.message || err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, isStartingVoting: null }));
        }
    };

    const handleComplete = async (voteId, voteName) => {
        if (!window.confirm(`'${voteName}' 투표를 종료하시겠습니까?`)) return;
        setActionLoading(prev => ({ ...prev, isCompleting: voteId }));
        try {
            await axios.post(`/api/elections/${voteId}/complete`);
            alert('투표가 종료되었습니다.');
            fetchAllVotes();
        } catch (err) {
            alert(`투표 종료 실패: ${err.response?.data?.message || err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, isCompleting: null }));
        }
    };

    if (isLoading) {
        return <div style={styles.center}>데이터를 불러오는 중...</div>;
    }

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1 style={styles.title}>관리자 대시보드</h1>
                <div style={styles.headerActions}>
                    <button style={styles.btnPrimary} onClick={() => navigate('/admin/create')}>
                        + 투표 생성
                    </button>
                    <button style={styles.btnOutline} onClick={handleLogout}>로그아웃</button>
                </div>
            </header>

            <AdminSection title="유권자 등록 중" icon="📋" votes={registrationVotes}
                renderActions={(vote) => (
                    <>
                        <button style={styles.btnInfo} onClick={() => { setSelectedVote(vote); setVoters(''); setIsVoterModalOpen(true); }}>
                            유권자 등록
                        </button>
                        <button style={styles.btnSuccess} onClick={() => { setSelectedVote(vote); setContractAddress(''); setVotingEndTime(''); setIsStartVotingModalOpen(true); }}>
                            투표 시작
                        </button>
                    </>
                )}
                renderDetails={(vote) => (
                    <span>등록 마감: {vote.registrationEndTime ? new Date(vote.registrationEndTime).toLocaleString() : '-'}</span>
                )}
            />

            <AdminSection title="투표 진행 중" icon="🗳️" votes={votingVotes}
                renderActions={(vote) => (
                    <button
                        style={actionLoading.isCompleting === vote.id ? styles.btnDisabled : styles.btnDanger}
                        onClick={() => handleComplete(vote.id, vote.name)}
                        disabled={actionLoading.isCompleting === vote.id}
                    >
                        {actionLoading.isCompleting === vote.id ? '종료 중...' : '투표 종료'}
                    </button>
                )}
                renderDetails={(vote) => (
                    <>
                        <span>마감: {vote.votingEndTime ? new Date(vote.votingEndTime).toLocaleString() : '-'}</span>
                        {vote.contractAddress && (
                            <span style={{ marginLeft: '12px' }}>
                                컨트랙트: <code style={styles.code}>{vote.contractAddress}</code>
                            </span>
                        )}
                    </>
                )}
            />

            <AdminSection title="종료된 투표" icon="✅" votes={completedVotes}
                renderActions={(vote) => (
                    vote.contractAddress ? (
                        <a href={`https://sepolia.etherscan.io/address/${vote.contractAddress}`} target="_blank" rel="noopener noreferrer">
                            <button style={styles.btnSecondary}>컨트랙트 보기</button>
                        </a>
                    ) : <span style={styles.badgeGray}>종료됨</span>
                )}
            />

            <Modal isOpen={isVoterModalOpen} onClose={() => setIsVoterModalOpen(false)}>
                {selectedVote && (
                    <div>
                        <h3 style={styles.modalTitle}>'{selectedVote.name}' 유권자 등록</h3>
                        <p style={styles.modalDesc}>등록할 이메일을 쉼표, 공백, 또는 줄바꿈으로 구분하여 입력하세요.</p>
                        <textarea
                            style={styles.textarea}
                            value={voters}
                            onChange={(e) => setVoters(e.target.value)}
                            placeholder="test1@example.com, test2@example.com"
                        />
                        <div style={styles.modalActions}>
                            <button style={styles.btnSecondary} onClick={() => setIsVoterModalOpen(false)} disabled={actionLoading.isRegistering}>취소</button>
                            <button style={actionLoading.isRegistering ? styles.btnDisabled : styles.btnPrimary} onClick={handleRegisterVoters} disabled={actionLoading.isRegistering}>
                                {actionLoading.isRegistering ? '등록 중...' : '등록 실행'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isStartVotingModalOpen} onClose={() => setIsStartVotingModalOpen(false)}>
                {selectedVote && (
                    <div>
                        <h3 style={styles.modalTitle}>'{selectedVote.name}' 투표 시작</h3>
                        <p style={styles.modalDesc}>Merkle root는 서버가 자동으로 계산합니다. 컨트랙트 주소와 종료 시간만 입력하세요.</p>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>컨트랙트 주소</label>
                            <input style={styles.input} value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder="0x..." />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>투표 종료 시간</label>
                            <input style={styles.input} type="datetime-local" value={votingEndTime} onChange={(e) => setVotingEndTime(e.target.value)} />
                        </div>
                        <div style={styles.modalActions}>
                            <button style={styles.btnSecondary} onClick={() => setIsStartVotingModalOpen(false)}>취소</button>
                            <button style={styles.btnSuccess} onClick={handleStartVoting}>투표 시작</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function AdminSection({ title, icon, votes, renderActions, renderDetails }) {
    return (
        <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{icon} {title} <span style={styles.badge}>{votes.length}</span></h2>
            {votes.length === 0 ? (
                <p style={styles.empty}>해당하는 투표가 없습니다.</p>
            ) : votes.map(vote => (
                <div key={vote.id} style={styles.card}>
                    <div style={styles.cardRow}>
                        <div>
                            <span style={styles.voteName}>{vote.name}</span>
                            <span style={styles.voteId}> · ID: {vote.id}</span>
                        </div>
                        <div style={styles.actions}>{renderActions(vote)}</div>
                    </div>
                    <div style={styles.details}>
                        <span>후보: {vote.candidates?.join(', ') || '-'}</span>
                        {renderDetails && <span style={{ marginLeft: '16px' }}>{renderDetails(vote)}</span>}
                    </div>
                </div>
            ))}
        </section>
    );
}

const styles = {
    page: { fontFamily: "'Segoe UI', sans-serif", padding: '24px', maxWidth: '1000px', margin: 'auto', color: '#1a1a2e' },
    center: { textAlign: 'center', padding: '80px', color: '#888', fontFamily: "'Segoe UI', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingBottom: '16px', borderBottom: '2px solid #e0e0e0' },
    title: { fontSize: '1.8rem', fontWeight: '800', color: '#0f3460', margin: 0 },
    headerActions: { display: 'flex', gap: '10px' },
    section: { marginBottom: '32px' },
    sectionTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
    badge: { background: '#e8eaf6', color: '#3f51b5', borderRadius: '12px', padding: '2px 10px', fontSize: '0.85rem', fontWeight: '600' },
    card: { background: 'white', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '16px 20px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
    cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    voteName: { fontWeight: '700', fontSize: '1rem' },
    voteId: { color: '#888', fontSize: '0.85rem' },
    actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    details: { color: '#666', fontSize: '0.85rem' },
    empty: { color: '#aaa', fontStyle: 'italic' },
    code: { background: '#f4f4f4', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' },
    badgeGray: { padding: '5px 12px', background: '#f5f5f5', color: '#666', borderRadius: '20px', fontSize: '0.85rem' },
    modalTitle: { marginTop: 0, color: '#1a1a2e' },
    modalDesc: { color: '#666', fontSize: '0.9rem', marginBottom: '16px' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' },
    textarea: { width: '96%', height: '120px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', resize: 'vertical', fontSize: '0.9rem' },
    inputGroup: { marginBottom: '12px' },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#444', marginBottom: '4px' },
    input: { width: '96%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' },
    btnPrimary: { padding: '9px 18px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' },
    btnInfo: { padding: '7px 14px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
    btnSuccess: { padding: '7px 14px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
    btnDanger: { padding: '7px 14px', background: '#f44336', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
    btnSecondary: { padding: '7px 14px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
    btnOutline: { padding: '9px 18px', background: 'white', color: '#0f3460', border: '1.5px solid #0f3460', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' },
    btnDisabled: { padding: '7px 14px', background: '#ccc', color: 'white', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontSize: '0.85rem' },
};

export default AdminMainPage;
