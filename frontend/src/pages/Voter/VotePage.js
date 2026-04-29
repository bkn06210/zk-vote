import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from '../../api/axios';

async function computeVoteReceipt(nullifierHash, nonce, candidateIndex) {
    const text = `${nullifierHash}:${nonce}:${candidateIndex}`;
    const encoded = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const ZKP_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function VotePage() {
    const { id: electionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { vote: election } = location.state || {};

    const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);
    const [nonce, setNonce] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [receipt, setReceipt] = useState(null);

    const handleVote = async () => {
        if (selectedCandidateIndex === null) { alert('먼저 후보를 선택해주세요.'); return; }
        if (nonce.length < 6) { alert('nonce는 최소 6자 이상이어야 합니다.'); return; }

        let submissionTicket = null;
        try {
            setErrorMessage('');
            setLoadingMessage('투표 증명에 필요한 정보를 요청하는 중...');

            const serverResponse = await axios.post(`/api/elections/${electionId}/proof`);
            const { user_secret, root, pathElements, pathIndices, submissionTicket: receivedTicket, circuitNumCandidates } = serverResponse.data;
            submissionTicket = receivedTicket;

            if (!submissionTicket) throw new Error('제출 티켓을 받지 못했습니다.');

            const voteArray = Array(circuitNumCandidates).fill(0);
            voteArray[selectedCandidateIndex] = 1;

            const inputs = {
                root_in: root,
                user_secret,
                vote: voteArray,
                pathElements,
                pathIndices,
                election_id: '0x' + electionId.replace(/-/g, ''),
            };

            const buildDir = `build_${election.merkleTreeDepth}_${circuitNumCandidates}`;
            const wasmPath = `${ZKP_BASE_URL}/zkp-files/${buildDir}/VoteCheck_temp_js/VoteCheck_temp.wasm`;
            const zkeyPath = `${ZKP_BASE_URL}/zkp-files/${buildDir}/circuit_final.zkey`;

            setLoadingMessage('영지식 증명을 생성하는 중...\n(UI는 멈추지 않아요!)');

            const worker = new Worker(new URL('../../workers/proof.worker.js', import.meta.url));
            worker.postMessage({ inputs, wasmPath, zkeyPath });

            worker.onmessage = async (event) => {
                const { status, proof, publicSignals, message } = event.data;
                if (status === 'success') {
                    setLoadingMessage('투표 영수증을 계산하는 중...');
                    const nullifierHash = publicSignals[2];
                    const voteReceipt = await computeVoteReceipt(nullifierHash, nonce, selectedCandidateIndex);
                    setLoadingMessage('생성된 증명을 안전하게 제출하는 중...');
                    const submitRes = await axios.post(`/api/elections/${electionId}/submit`, {
                        proof, publicSignals, submissionTicket, voteReceipt,
                    });
                    setLoadingMessage('');
                    try { localStorage.setItem(`voted_${electionId}`, 'true'); } catch (e) { /* ignore */ }
                    setReceipt({
                        nullifierHash,
                        nonce,
                        candidateIndex: selectedCandidateIndex,
                        candidateName: election.candidates[selectedCandidateIndex],
                        voteReceipt,
                        txHash: submitRes.data?.txHash || null,
                        contractAddress: election.contractAddress || null,
                    });
                } else {
                    setLoadingMessage('');
                    setErrorMessage(`증명 생성 실패: ${message}`);
                }
                worker.terminate();
            };

            worker.onerror = (error) => {
                setLoadingMessage('');
                setErrorMessage(`Web Worker 오류: ${error.message}`);
                worker.terminate();
            };
        } catch (error) {
            setLoadingMessage('');
            console.error('투표 처리 실패:', error.response?.data);
            setErrorMessage(`투표 실패: ${error.response?.data?.message || error.message}`);
        }
    };

    if (loadingMessage) {
        return (
            <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 gap-4 text-white text-center px-6">
                <div className="text-5xl animate-pulse">⏳</div>
                <p className="text-lg font-medium whitespace-pre-line">{loadingMessage}</p>
            </div>
        );
    }

    if (receipt) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
                <div className="w-full max-w-xl">
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">✅</div>
                        <h2 className="text-2xl font-bold text-emerald-700">투표 완료</h2>
                        <p className="text-gray-500 text-sm mt-1">투표가 성공적으로 제출되었습니다. 영수증을 안전한 곳에 보관하세요.</p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2">🧾 투표 영수증</h3>

                        <ReceiptRow label="선택한 후보" value={`${receipt.candidateName} (인덱스: ${receipt.candidateIndex})`} />
                        <ReceiptRow label="내 Nullifier Hash" value={receipt.nullifierHash} mono />
                        <ReceiptRow label="내 Nonce (본인만 알고 있음)" value={receipt.nonce} mono />
                        <ReceiptRow label="Vote Receipt (on-chain 저장됨)" value={receipt.voteReceipt} mono />

                        {receipt.txHash && (
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">트랜잭션 해시</p>
                                {receipt.contractAddress ? (
                                    <a href={`https://sepolia.etherscan.io/tx/${receipt.txHash}`} target="_blank" rel="noopener noreferrer"
                                        className="block font-mono text-xs bg-white border border-emerald-200 px-3 py-2 rounded-lg text-blue-600 break-all hover:underline">
                                        {receipt.txHash}
                                    </a>
                                ) : (
                                    <span className="block font-mono text-xs bg-white border border-emerald-200 px-3 py-2 rounded-lg text-gray-700 break-all">{receipt.txHash}</span>
                                )}
                            </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                            ⚠️ 이 nonce를 기억해두세요. 나중에 블록체인에서 본인의 투표가 위조되지 않았는지 직접 확인할 수 있습니다.<br />
                            검증: SHA-256(<code className="font-mono">{receipt.nullifierHash.substring(0, 8)}...:{receipt.nonce}:{receipt.candidateIndex}</code>) = vote_receipt
                        </div>
                    </div>

                    <button className="w-full mt-6 py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors" onClick={() => navigate('/')}>
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <div className="text-5xl mb-4">❌</div>
                    <h2 className="text-xl font-bold text-red-700 mb-2">오류 발생</h2>
                    <p className="text-gray-500 text-sm mb-6">{errorMessage}</p>
                    <button className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors" onClick={() => navigate('/')}>
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    if (!election) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">잘못된 접근입니다.</h2>
                    <p className="text-gray-500 text-sm mb-6">투표 정보를 찾을 수 없습니다. 메인 페이지에서 다시 시도해주세요.</p>
                    <button className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors" onClick={() => navigate('/')}>
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const isReady = selectedCandidateIndex !== null && nonce.length >= 6;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-xl mx-auto px-6 py-5">
                    <h1 className="text-xl font-bold text-gray-900">{election.name}</h1>
                    <p className="text-xs text-gray-400 mt-1">투표 마감: {new Date(election.votingEndTime).toLocaleString()}</p>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 py-8 space-y-6">
                {/* 후보 선택 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">후보 선택</h2>
                    <ul className="space-y-2">
                        {election.candidates.map((candidate, index) => (
                            <li
                                key={index}
                                onClick={() => setSelectedCandidateIndex(index)}
                                className={`flex items-center gap-3 px-4 py-4 border rounded-lg cursor-pointer transition-all ${selectedCandidateIndex === index
                                    ? 'border-purple-400 bg-purple-50 text-purple-800 font-bold'
                                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
                            >
                                <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedCandidateIndex === index ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                                    {selectedCandidateIndex === index && <span className="w-2 h-2 bg-white rounded-full" />}
                                </span>
                                {candidate}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Nonce 입력 */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                    <label className="block text-sm font-bold text-purple-900 mb-1">나만의 Nonce 입력</label>
                    <p className="text-xs text-purple-600 mb-3">
                        6자 이상의 문자를 입력하세요. 이 값은 서버에 저장되지 않습니다.<br />
                        나중에 본인의 투표가 위조되지 않았는지 블록체인에서 직접 확인하는 데 사용됩니다.
                    </p>
                    <input
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 bg-white transition"
                        type="text"
                        value={nonce}
                        onChange={(e) => setNonce(e.target.value)}
                        placeholder="예: mySecret123"
                        minLength={6}
                    />
                    {nonce.length > 0 && nonce.length < 6 && (
                        <p className="text-red-500 text-xs mt-1.5">최소 6자 이상 입력하세요. (현재 {nonce.length}자)</p>
                    )}
                </div>

                <button
                    onClick={handleVote}
                    disabled={!isReady}
                    className="w-full py-4 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed bg-purple-700 hover:bg-purple-800"
                >
                    투표 제출하기
                </button>
            </main>
        </div>
    );
}

function ReceiptRow({ label, value, mono }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
            <span className={`block text-xs bg-white border border-emerald-200 px-3 py-2 rounded-lg text-gray-700 break-all ${mono ? 'font-mono' : ''}`}>
                {value}
            </span>
        </div>
    );
}

export default VotePage;
