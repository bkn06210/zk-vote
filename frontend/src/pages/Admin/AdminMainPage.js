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
        if (voterList.length === 0) { alert('이메일을 입력해주세요.'); return; }
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
        if (!votingEndTime) { alert('투표 종료 시간을 입력해주세요.'); return; }
        setActionLoading(prev => ({ ...prev, isStartingVoting: selectedVote.id }));
        try {
            await axios.post(`/api/elections/${selectedVote.id}/start-voting`, { contractAddress, votingEndTime });
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
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-400 text-lg">데이터를 불러오는 중...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🗳️</span>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>
                            <p className="text-xs text-gray-400">ZK-VOTE Administration</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-4 py-2 bg-purple-700 text-white text-sm font-semibold rounded-lg hover:bg-purple-800 transition-colors"
                            onClick={() => navigate('/admin/create')}
                        >
                            + 투표 생성
                        </button>
                        <button
                            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            onClick={() => navigate('/change-password')}
                        >
                            비밀번호 변경
                        </button>
                        <button
                            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="등록 중" count={registrationVotes.length} color="blue" icon="📋" />
                    <StatCard label="진행 중" count={votingVotes.length} color="green" icon="🗳️" />
                    <StatCard label="종료됨" count={completedVotes.length} color="gray" icon="✅" />
                </div>

                <AdminSection
                    title="유권자 등록 중" icon="📋" votes={registrationVotes}
                    accentColor="blue"
                    renderActions={(vote) => (
                        <>
                            <button
                                className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                                onClick={() => { setSelectedVote(vote); setVoters(''); setIsVoterModalOpen(true); }}
                            >
                                유권자 등록
                            </button>
                            <button
                                className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                                onClick={() => { setSelectedVote(vote); setContractAddress(''); setVotingEndTime(''); setIsStartVotingModalOpen(true); }}
                            >
                                투표 시작
                            </button>
                        </>
                    )}
                    renderDetails={(vote) => (
                        <span>등록 마감: {vote.registrationEndTime ? new Date(vote.registrationEndTime).toLocaleString() : '-'}</span>
                    )}
                />

                <AdminSection
                    title="투표 진행 중" icon="🗳️" votes={votingVotes}
                    accentColor="green"
                    renderActions={(vote) => (
                        <button
                            className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors ${actionLoading.isCompleting === vote.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
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
                                <span className="ml-3">
                                    컨트랙트: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{vote.contractAddress.slice(0, 10)}…</code>
                                </span>
                            )}
                        </>
                    )}
                />

                <AdminSection
                    title="종료된 투표" icon="✅" votes={completedVotes}
                    accentColor="gray"
                    renderActions={(vote) => (
                        vote.contractAddress ? (
                            <a href={`https://sepolia.etherscan.io/address/${vote.contractAddress}`} target="_blank" rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors">
                                컨트랙트 보기
                            </a>
                        ) : <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-full">종료됨</span>
                    )}
                />
            </main>

            {/* Voter Modal */}
            <Modal isOpen={isVoterModalOpen} onClose={() => setIsVoterModalOpen(false)}>
                {selectedVote && (
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">유권자 등록</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            <span className="font-semibold text-purple-700">'{selectedVote.name}'</span> — 이메일을 쉼표, 공백, 줄바꿈으로 구분하여 입력하세요.
                        </p>
                        <textarea
                            className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                            value={voters}
                            onChange={(e) => setVoters(e.target.value)}
                            placeholder="test1@example.com, test2@example.com"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50" onClick={() => setIsVoterModalOpen(false)} disabled={actionLoading.isRegistering}>취소</button>
                            <button className={`px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors ${actionLoading.isRegistering ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-800'}`} onClick={handleRegisterVoters} disabled={actionLoading.isRegistering}>
                                {actionLoading.isRegistering ? '등록 중...' : '등록 실행'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Start Voting Modal */}
            <Modal isOpen={isStartVotingModalOpen} onClose={() => setIsStartVotingModalOpen(false)}>
                {selectedVote && (
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">투표 시작</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            <span className="font-semibold text-purple-700">'{selectedVote.name}'</span> — Merkle root는 서버가 자동으로 계산합니다.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                                    컨트랙트 주소 <span className="text-gray-400 font-normal normal-case">(선택)</span>
                                </label>
                                <input
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                    value={contractAddress}
                                    onChange={(e) => setContractAddress(e.target.value)}
                                    placeholder="배포된 Ethereum 컨트랙트 주소"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">투표 종료 시간</label>
                                <input
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                    type="datetime-local"
                                    value={votingEndTime}
                                    onChange={(e) => setVotingEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50" onClick={() => setIsStartVotingModalOpen(false)}>취소</button>
                            <button className="px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition-colors" onClick={handleStartVoting}>투표 시작</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function StatCard({ label, count, color, icon }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-100 text-blue-700',
        green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
        gray: 'bg-gray-50 border-gray-200 text-gray-600',
    };
    return (
        <div className={`border rounded-xl p-4 ${colors[color]}`}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-lg">{icon}</span>
            </div>
            <div className="text-3xl font-bold mt-2">{count}</div>
        </div>
    );
}

function AdminSection({ title, icon, votes, accentColor, renderActions, renderDetails }) {
    const borderColors = { blue: 'border-l-blue-400', green: 'border-l-emerald-400', gray: 'border-l-gray-300' };
    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-bold text-gray-700">{icon} {title}</h2>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">{votes.length}</span>
            </div>
            {votes.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
                    해당하는 투표가 없습니다.
                </div>
            ) : (
                <div className="space-y-3">
                    {votes.map(vote => (
                        <div key={vote.id} className={`bg-white border border-gray-200 border-l-4 ${borderColors[accentColor]} rounded-xl px-5 py-4 shadow-sm`}>
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <span className="font-bold text-gray-900">{vote.name}</span>
                                    <span className="ml-2 text-xs text-gray-400">ID: {vote.id}</span>
                                    <div className="text-xs text-gray-500 mt-1">
                                        후보: {vote.candidates?.join(', ') || '-'}
                                        {renderDetails && <span className="ml-3">{renderDetails(vote)}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">{renderActions(vote)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default AdminMainPage;
