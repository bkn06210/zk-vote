import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';

function CreateVotePage() {
    const [name, setName] = useState('');
    const [circuitOptions, setCircuitOptions] = useState([]);
    const [circuitIndex, setCircuitIndex] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [regEndTime, setRegEndTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('/api/elections/circuit-options')
            .then(res => {
                setCircuitOptions(res.data);
                if (res.data.length > 0) {
                    setCircuitIndex(0);
                    setCandidates(Array(res.data[0].numCandidates).fill(''));
                }
            })
            .catch(() => alert('회로 옵션을 불러오는 데 실패했습니다.'))
            .finally(() => setOptionsLoading(false));
    }, []);

    const selectedCircuit = circuitIndex !== null ? circuitOptions[circuitIndex] : null;

    const handleCircuitChange = (index) => {
        setCircuitIndex(index);
        setCandidates(Array(circuitOptions[index].numCandidates).fill(''));
    };

    const handleCandidateChange = (index, value) => {
        const next = [...candidates];
        next[index] = value;
        setCandidates(next);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalCandidates = candidates.map(c => c.trim());
        if (finalCandidates.some(c => !c)) { alert('모든 후보자 이름을 입력해주세요.'); return; }
        setIsLoading(true);
        try {
            await axios.post('/api/elections', {
                name: name.trim(),
                merkleTreeDepth: selectedCircuit.merkleTreeDepth,
                candidates: finalCandidates,
                registrationEndTime: regEndTime,
            });
            alert('투표가 생성되었습니다.');
            navigate('/admin');
        } catch (err) {
            alert(`생성 실패: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
                    <button
                        className="text-purple-700 hover:text-purple-900 font-medium text-sm transition-colors"
                        onClick={() => navigate('/admin')}
                    >
                        ← 돌아가기
                    </button>
                    <span className="text-gray-300">|</span>
                    <h1 className="text-lg font-bold text-gray-900">새 투표 생성</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 기본 정보 */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">기본 정보</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">투표 이름</label>
                                <input
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="예: 2025년 학생회장 선거"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">유권자 등록 마감 시간</label>
                                <input
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                    type="datetime-local"
                                    value={regEndTime}
                                    onChange={e => setRegEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* ZK 회로 설정 */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">ZK 회로 설정</h2>
                        <p className="text-xs text-gray-400 mb-4">후보 수와 최대 유권자 수는 회로 컴파일 시 고정됩니다.</p>
                        {optionsLoading ? (
                            <p className="text-sm text-gray-400">불러오는 중...</p>
                        ) : circuitOptions.length === 0 ? (
                            <p className="text-sm text-red-500">컴파일된 ZK 회로가 없습니다. setUpZk.sh를 먼저 실행해주세요.</p>
                        ) : (
                            <div className="space-y-2">
                                {circuitOptions.map((opt, i) => (
                                    <label
                                        key={i}
                                        className={`flex items-center gap-3 px-4 py-3.5 border rounded-lg cursor-pointer transition-all ${circuitIndex === i
                                            ? 'border-purple-400 bg-purple-50 text-purple-800'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="circuit"
                                            className="accent-purple-600"
                                            checked={circuitIndex === i}
                                            onChange={() => handleCircuitChange(i)}
                                        />
                                        <span className={`text-sm ${circuitIndex === i ? 'font-semibold' : 'font-medium'}`}>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 후보자 */}
                    {selectedCircuit && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">후보자 이름</h2>
                            <div className="space-y-3">
                                {candidates.map((c, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <input
                                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                            type="text"
                                            value={c}
                                            onChange={e => handleCandidateChange(i, e.target.value)}
                                            placeholder={`후보 ${i + 1}`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !selectedCircuit}
                        className="w-full py-3.5 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed bg-purple-700 hover:bg-purple-800"
                    >
                        {isLoading ? '생성 중...' : '투표 생성'}
                    </button>
                </form>
            </main>
        </div>
    );
}

export default CreateVotePage;
