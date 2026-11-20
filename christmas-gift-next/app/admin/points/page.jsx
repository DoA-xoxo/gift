'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Star, Plus, Minus, LogOut } from 'lucide-react';

const panel = { background: '#fffaf0', color: '#34241b', borderRadius: 12, padding: 22, boxShadow: '0 12px 36px #0002' };
const input = { boxSizing: 'border-box', width: '100%', padding: 11, border: '1px solid #c6a77e', borderRadius: 6, background: '#fff', color: '#34241b', fontSize: 14 };
const button = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', border: 0, borderRadius: 6, background: '#751515', color: '#fff6e5', fontWeight: 700, cursor: 'pointer' };
const secondary = { ...button, background: 'transparent', border: '1px solid #c6a77e', color: '#34241b' };

function dateText(value) {
  return value ? new Date(value).toLocaleString('ko-KR') : '-';
}

export default function SharedPointsAdminPage() {
  const [data, setData] = useState({ users: [], transactions: [] });
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('100');
  const [direction, setDirection] = useState('grant');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/points', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '포인트 정보를 불러오지 못했습니다.');
      setData(result);
      if (!accountId && result.users?.length) setAccountId(result.users[0].id);
    } catch (err) {
      setError(err.message || '서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, amount: Number(amount), direction, description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '포인트 변경에 실패했습니다.');
      setNotice(`${result.nickname} 회원의 잔액이 ${Number(result.balance).toLocaleString()}P로 변경됐습니다.`);
      setDescription('');
      await load();
    } catch (err) {
      setError(err.message || '포인트 변경에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin';
  }

  const visibleUsers = (data.users || []).filter(user => user.nickname.toLowerCase().includes(filter.trim().toLowerCase()));
  const total = (data.users || []).reduce((sum, user) => sum + Number(user.balance || 0), 0);

  return (
    <main style={{ minHeight: '100vh', background: '#0b1a13', color: '#fff6e5', padding: '24px 14px 48px', boxSizing: 'border-box' }}>
      <div style={{ width: 'min(100%, 1040px)', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          <a href="/admin" style={{ color: '#fff6e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}><ArrowLeft size={16} /> 관리자 메뉴</a>
          <button type="button" style={{ ...secondary, color: '#fff6e5', borderColor: '#c6a77e' }} onClick={logout}><LogOut size={15} /> 로그아웃</button>
        </header>
        <section style={panel}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Star size={30} />
            <p style={{ fontSize: 10, letterSpacing: '.18em', fontWeight: 700 }}>SHARED POINT CONTROL</p>
            <h1 style={{ fontSize: 27, margin: '8px 0' }}>공통 포인트 관리</h1>
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>세 사이트에서 함께 사용하는 회원별 포인트 지갑을 관리합니다.</p>
          </div>
          {loading ? <p style={{ textAlign: 'center' }}>정보를 불러오고 있습니다...</p> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f3e8d5', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#6a5140' }}>전체 회원</div>
                  <strong style={{ fontSize: 25 }}>{data.users.length.toLocaleString()}명</strong>
                </div>
                <div style={{ background: '#f3e8d5', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#6a5140' }}>전체 지갑 잔액 합계</div>
                  <strong style={{ fontSize: 25 }}>{total.toLocaleString()}P</strong>
                </div>
                <div style={{ background: '#f3e8d5', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#6a5140' }}>최근 거래 표시</div>
                  <strong style={{ fontSize: 25 }}>{data.transactions.length.toLocaleString()}건</strong>
                </div>
              </div>
              <section style={{ border: '1px solid #e6d9c3', borderRadius: 8, padding: 18, marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, marginTop: 0 }}>포인트 지급 / 회수</h2>
                <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>회원
                    <select value={accountId} onChange={e => setAccountId(e.target.value)} required style={{ ...input, marginTop: 7 }}>
                      {data.users.map(user => <option key={user.id} value={user.id}>{user.nickname} · {Number(user.balance).toLocaleString()}P</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>처리 종류
                    <select value={direction} onChange={e => setDirection(e.target.value)} style={{ ...input, marginTop: 7 }}>
                      <option value="grant">포인트 지급</option>
                      <option value="deduct">포인트 회수</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>수량 (P)
                    <input type="number" min="1" max="1000000" step="1" required value={amount} onChange={e => setAmount(e.target.value)} style={{ ...input, marginTop: 7 }} />
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>메모 (선택)
                    <input value={description} maxLength={120} onChange={e => setDescription(e.target.value)} placeholder="예: 이벤트 보상" style={{ ...input, marginTop: 7 }} />
                  </label>
                  <button type="submit" disabled={busy || !accountId} style={{ ...button, minHeight: 42, gridColumn: '1 / -1', opacity: busy ? .6 : 1 }}>
                    {direction === 'grant' ? <Plus size={16} /> : <Minus size={16} />}
                    {busy ? '처리 중...' : direction === 'grant' ? '포인트 지급하기' : '포인트 회수하기'}
                  </button>
                </form>
                <p style={{ fontSize: 12, color: '#765f4c', lineHeight: 1.7, marginBottom: 0 }}>회수는 회원 잔액보다 많은 수량을 처리할 수 없으며, 모든 변경은 거래 내역에 기록됩니다.</p>
              </section>
              <section style={{ border: '1px solid #e6d9c3', borderRadius: 8, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 18, margin: 0 }}>회원별 공통 포인트</h2>
                  <button type="button" style={secondary} onClick={load}><RefreshCw size={14} /> 새로고침</button>
                </div>
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="닉네임 검색" style={{ ...input, margin: '12px 0' }} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', whiteSpace: 'nowrap', fontSize: 13 }}>
                    <thead><tr>{['닉네임', '공통 잔액'].map(label => <th key={label} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #d8c5a9' }}>{label}</th>)}</tr></thead>
                    <tbody>{visibleUsers.map(user => <tr key={user.id}><td style={{ padding: 10, borderBottom: '1px solid #eee3d2' }}>{user.nickname}</td><td style={{ padding: 10, borderBottom: '1px solid #eee3d2', fontWeight: 700 }}>{Number(user.balance).toLocaleString()}P</td></tr>)}</tbody>
                  </table>
                  {visibleUsers.length === 0 && <p style={{ fontSize: 13 }}>검색 결과가 없습니다.</p>}
                </div>
              </section>
              <section style={{ border: '1px solid #e6d9c3', borderRadius: 8, padding: 18 }}>
                <h2 style={{ fontSize: 18, marginTop: 0 }}>전체 거래 내역 (최근 500건)</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', whiteSpace: 'nowrap', fontSize: 12 }}>
                    <thead><tr>{['시간', '닉네임', '변동', '구분', '사이트', '메모'].map(label => <th key={label} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #d8c5a9' }}>{label}</th>)}</tr></thead>
                    <tbody>{data.transactions.map(tx => <tr key={tx.id}>
                      <td style={{ padding: 9, borderBottom: '1px solid #eee3d2' }}>{dateText(tx.created_at)}</td>
                      <td style={{ padding: 9, borderBottom: '1px solid #eee3d2' }}>{tx.nickname}</td>
                      <td style={{ padding: 9, borderBottom: '1px solid #eee3d2', fontWeight: 700, color: Number(tx.amount) >= 0 ? '#24633b' : '#a52c25' }}>{Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toLocaleString()}P</td>
                      <td style={{ padding: 9, borderBottom: '1px solid #eee3d2' }}>{tx.transaction_type}</td>
                      <td style={{ padding: 9, borderBottom: '1px solid #eee3d2' }}>{tx.source_site}</td>
                      <td style={{ padding: 9, borderBottom: '1px solid #eee3d2', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description || '-'}</td>
                    </tr>)}</tbody>
                  </table>
                  {data.transactions.length === 0 && <p style={{ fontSize: 13 }}>거래 내역이 없습니다.</p>}
                </div>
              </section>
            </>
          )}
          {error && <p role="alert" style={{ color: '#a52c25', fontSize: 13, marginTop: 16 }}>{error}</p>}
          {notice && <p role="status" style={{ color: '#24633b', fontSize: 13, marginTop: 16 }}>{notice}</p>}
        </section>
      </div>
    </main>
  );
}
