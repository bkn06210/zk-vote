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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🗳️</span>
                        <h1 className="text-xl font-bold text-gray-900 tracking-widest">ZK-VOTE</h1>
                    </div>
                    {auth.isLoggedIn && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 mr-1">{auth.user?.email}</span>
                            {auth.isAdmin && (
                                <Link to="/admin">
                                    <button className="px-3 py-1.5 text-xs font-semibold text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                                        관리자 페이지
                                    </button>
                                </Link>
                            )}
                            <button
                                onClick={() => navigate('/change-password')}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                비밀번호 변경
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                로그아웃
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center py-20 text-gray-400">투표 목록을 불러오는 중...</div>
                ) : (
                    <div className="space-y-8">
                        {/* 투표 진행 중 */}
                        <Section title="투표 진행 중" icon="🗳️" count={votableVotes.length} accentColor="purple">
                            {votableVotes.length === 0 ? (
                                <Empty>현재 진행 중인 투표가 없습니다.</Empty>
                            ) : votableVotes.map((vote) => {
                                const hasVoted = localStorage.getItem(`voted_${vote.id}`) === 'true';
                                return (
                                    <div key={vote.id} className="bg-white border border-gray-200 border-l-4 border-l-purple-400 rounded-xl px-5 py-4 shadow-sm flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-900">{vote.name}</p>
                                            <p className="text-xs text-gray-400 mt-1">마감: {new Date(vote.votingEndTime).toLocaleString()}</p>
                                        </div>
                                        {hasVoted ? (
                                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">투표 완료</span>
                                        ) : (
                                            <button
                                                className="px-4 py-2 bg-purple-700 text-white text-sm font-semibold rounded-lg hover:bg-purple-800 transition-colors"
                                                onClick={() => navigate(`/vote/${vote.id}`, { state: { vote } })}
                                            >
                                                투표하기
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </Section>

                        {/* 유권자 등록 가능 */}
                        <Section title="유권자 등록 가능" icon="📋" count={registerableVotes.length} accentColor="blue">
                            {registerableVotes.length === 0 ? (
                                <Empty>등록 가능한 투표가 없습니다.</Empty>
                            ) : registerableVotes.map((vote) => (
                                <div key={vote.id} className="bg-white border border-gray-200 border-l-4 border-l-blue-400 rounded-xl px-5 py-4 shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-900">{vote.name}</p>
                                        <p className="text-xs text-gray-400 mt-1">등록 마감: {new Date(vote.registrationEndTime).toLocaleString()}</p>
                                    </div>
                                    <button
                                        className={`px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors ${registeringId === vote.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                        onClick={() => handleRegister(vote.id, vote.name)}
                                        disabled={registeringId === vote.id}
                                    >
                                        {registeringId === vote.id ? '등록 중...' : '등록하기'}
                                    </button>
                                </div>
                            ))}
                        </Section>

                        {/* 참여했던 투표 */}
                        <Section title="참여했던 투표" icon="✅" count={completedVotes.length} accentColor="gray">
                            {completedVotes.length === 0 ? (
                                <Empty>참여했던 투표가 없습니다.</Empty>
                            ) : completedVotes.map((vote) => (
                                <div key={vote.id} className="bg-white border border-gray-200 border-l-4 border-l-gray-300 rounded-xl px-5 py-4 shadow-sm flex justify-between items-center">
                                    <p className="font-bold text-gray-900">{vote.name}</p>
                                    <div className="flex items-center gap-2">
                                        {vote.contractAddress && (
                                            <a
                                                href={`https://sepolia.etherscan.io/address/${vote.contractAddress}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                                            >
                                                컨트랙트 보기
                                            </a>
                                        )}
                                        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-full">종료됨</span>
                                    </div>
                                </div>
                            ))}
                        </Section>
                    </div>
                )}
            </main>
        </div>
    );
}

function Section({ title, icon, count, accentColor, children }) {
    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-bold text-gray-700">{icon} {title}</h2>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">{count}</span>
            </div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function Empty({ children }) {
    return (
        <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
            {children}
        </div>
    );
}

export default VoterMainPage;
