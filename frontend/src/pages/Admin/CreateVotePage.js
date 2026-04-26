import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';

function CreateVotePage() {
    const [name, setName] = useState('');
    const [merkleTreeDepth, setMerkleTreeDepth] = useState('');
    const [candidates, setCandidates] = useState(['', '']);
    const [regEndTime, setRegEndTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleCandidateChange = (index, value) => {
        const next = [...candidates];
        next[index] = value;
        setCandidates(next);
    };

    const addCandidate = () => setCandidates([...candidates, '']);
    const removeCandidate = (index) => {
        if (candidates.length > 2) setCandidates(candidates.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalCandidates = candidates.map(c => c.trim()).filter(Boolean);
        if (finalCandidates.length < 2) {
            alert('후보자를 최소 2명 입력해주세요.');
            return;
        }
        setIsLoading(true);
        try {
            await axios.post('/api/elections', {
                name: name.trim(),
                merkleTreeDepth: parseInt(merkleTreeDepth, 10),
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
        <div style={styles.page}>
            <button style={styles.back} onClick={() => navigate('/admin')}>← 돌아가기</button>
            <h2 style={styles.title}>새 투표 생성</h2>

            <form onSubmit={handleSubmit} style={styles.form}>
                <Field label="투표 이름">
                    <input style={styles.input} type="text" value={name}
                        onChange={(e) => setName(e.target.value)} required />
                </Field>

                <Field label="유권자 등록 마감 시간">
                    <input style={styles.input} type="datetime-local" value={regEndTime}
                        onChange={(e) => setRegEndTime(e.target.value)} required />
                </Field>

                <Field label="Merkle tree 깊이" hint="2^깊이 = 최대 유권자 수 (예: 10 → 1024명)">
                    <input style={styles.input} type="number" min="2" max="32"
                        value={merkleTreeDepth} onChange={(e) => setMerkleTreeDepth(e.target.value)}
                        placeholder="예: 10" required />
                </Field>

                <div>
                    <label style={styles.label}>후보자 목록</label>
                    {candidates.map((c, i) => (
                        <div key={i} style={styles.candidateRow}>
                            <input style={{ ...styles.input, flex: 1, margin: 0 }} type="text"
                                value={c} onChange={(e) => handleCandidateChange(i, e.target.value)}
                                placeholder={`후보 ${i + 1}`} required />
                            {candidates.length > 2 && (
                                <button type="button" style={styles.btnRemove}
                                    onClick={() => removeCandidate(i)}>제거</button>
                            )}
                        </div>
                    ))}
                    <button type="button" style={styles.btnAdd} onClick={addCandidate}>
                        + 후보자 추가
                    </button>
                </div>

                <button type="submit" style={isLoading ? styles.btnDisabled : styles.btnSubmit}
                    disabled={isLoading}>
                    {isLoading ? '생성 중...' : '투표 생성'}
                </button>
            </form>
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <div style={styles.field}>
            <label style={styles.label}>{label}</label>
            {hint && <p style={styles.hint}>{hint}</p>}
            {children}
        </div>
    );
}

const styles = {
    page: { fontFamily: "'Segoe UI', sans-serif", padding: '32px 24px', maxWidth: '560px', margin: 'auto', color: '#1a1a2e' },
    back: { background: 'none', border: 'none', color: '#764ba2', cursor: 'pointer', fontSize: '0.95rem', padding: 0, marginBottom: '20px' },
    title: { fontSize: '1.5rem', fontWeight: '700', margin: '0 0 28px', color: '#0f3460' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '0.85rem', fontWeight: '600', color: '#444' },
    hint: { margin: '0 0 4px', fontSize: '0.8rem', color: '#888' },
    input: { padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' },
    candidateRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' },
    btnAdd: { background: 'none', border: '1.5px dashed #764ba2', color: '#764ba2', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' },
    btnRemove: { padding: '10px 12px', background: 'none', border: '1.5px solid #f44336', color: '#f44336', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
    btnSubmit: { padding: '13px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
    btnDisabled: { padding: '13px', background: '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'not-allowed' },
};

export default CreateVotePage;
