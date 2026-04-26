import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from '../../api/axios';

const pageStyle = { fontFamily: "'Segoe UI', sans-serif", padding: '24px', maxWidth: '600px', margin: 'auto', color: '#1a1a2e' };
const headerStyle = { borderBottom: '2px solid #e0e0e0', paddingBottom: '16px', marginBottom: '24px' };
const candidateListStyle = { listStyleType: 'none', padding: '0', margin: '0' };
const candidateItemStyle = { border: '1.5px solid #e0e0e0', borderRadius: '10px', padding: '16px 20px', margin: '10px 0', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' };
const selectedCandidateStyle = { ...candidateItemStyle, borderColor: '#764ba2', backgroundColor: '#f3e8ff', fontWeight: '700' };
const buttonStyle = { width: '100%', padding: '14px', border: 'none', borderRadius: '8px', backgroundColor: '#764ba2', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', marginTop: '24px' };
const loadingOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1000, fontSize: '1.2rem', textAlign: 'center', gap: '12px' };

const ZKP_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function VotePage() {
    const { id: electionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { vote: election } = location.state || {};

    const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleVote = async () => {
        if (selectedCandidateIndex === null) {
            alert('먼저 후보를 선택해주세요.');
            return;
        }

        let submissionTicket = null;

        try {
            setErrorMessage('');
            setLoadingMessage('투표 증명에 필요한 정보를 요청하는 중...');

            // 1. 인증된 엔드포인트에서 증명 데이터 + 단일 사용 티켓 수신
            const serverResponse = await axios.post(`/api/elections/${electionId}/proof`);
            const { user_secret, root, pathElements, pathIndices, submissionTicket: receivedTicket } = serverResponse.data;
            submissionTicket = receivedTicket;

            if (!submissionTicket) {
                throw new Error('제출 티켓을 받지 못했습니다.');
            }

            // 2. ZK 회로 입력 준비 (1-hot 인코딩)
            const voteArray = Array(election.candidates.length).fill(0);
            voteArray[selectedCandidateIndex] = 1;

            const inputs = {
                root_in: root,
                user_secret,
                vote: voteArray,
                pathElements,
                pathIndices,
                election_id: '0x' + electionId.replace(/-/g, ''),
            };

            // 3. ZKP 파일 경로 구성 (merkleTreeDepth, numCandidates는 Spring Boot 응답 camelCase)
            const buildDir = `build_${election.merkleTreeDepth}_${election.numCandidates}`;
            const wasmPath = `${ZKP_BASE_URL}/zkp-files/${buildDir}/VoteCheck_temp_js/VoteCheck_temp.wasm`;
            const zkeyPath = `${ZKP_BASE_URL}/zkp-files/${buildDir}/circuit_final.zkey`;

            setLoadingMessage('영지식 증명을 생성하는 중...\n(UI는 멈추지 않아요!)');

            // 4. Web Worker에서 증명 생성
            const worker = new Worker(new URL('../../workers/proof.worker.js', import.meta.url));
            worker.postMessage({ inputs, wasmPath, zkeyPath });

            // 5. Worker 완료 후 증명 제출
            worker.onmessage = async (event) => {
                const { status, proof, publicSignals, message } = event.data;

                if (status === 'success') {
                    setLoadingMessage('생성된 증명을 안전하게 제출하는 중...');

                    // 익명 제출 엔드포인트 (raw snarkjs proof 전송)
                    await axios.post(`/api/elections/${electionId}/submit`, {
                        proof,
                        publicSignals,
                        submissionTicket,
                    });

                    setLoadingMessage('');
                    alert('투표가 성공적으로 제출되었습니다!');

                    try {
                        localStorage.setItem(`voted_${electionId}`, 'true');
                    } catch (e) {
                        console.error('localStorage 저장 실패:', e);
                    }

                    navigate('/');
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
            <div style={loadingOverlayStyle}>
                <div>⏳</div>
                <div style={{ whiteSpace: 'pre-line' }}>{loadingMessage}</div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div style={pageStyle}>
                <h2 style={{ color: '#c62828' }}>오류 발생</h2>
                <p style={{ color: '#666' }}>{errorMessage}</p>
                <button style={buttonStyle} onClick={() => navigate('/')}>메인으로 돌아가기</button>
            </div>
        );
    }

    if (!election) {
        return (
            <div style={pageStyle}>
                <h2>잘못된 접근입니다.</h2>
                <p>투표 정보를 찾을 수 없습니다. 메인 페이지에서 다시 시도해주세요.</p>
                <button style={buttonStyle} onClick={() => navigate('/')}>메인으로 돌아가기</button>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <header style={headerStyle}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f3460', margin: '0 0 8px' }}>{election.name}</h1>
                <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>
                    투표 마감: {new Date(election.votingEndTime).toLocaleString()}
                </p>
            </header>

            <p style={{ color: '#444', marginBottom: '16px' }}>투표할 후보를 선택해주세요.</p>
            <ul style={candidateListStyle}>
                {election.candidates.map((candidate, index) => (
                    <li
                        key={index}
                        style={selectedCandidateIndex === index ? selectedCandidateStyle : candidateItemStyle}
                        onClick={() => setSelectedCandidateIndex(index)}
                    >
                        {candidate}
                    </li>
                ))}
            </ul>

            <button style={buttonStyle} onClick={handleVote} disabled={!!loadingMessage}>
                투표 제출하기
            </button>
        </div>
    );
}

export default VotePage;
