
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  RotateCcw,
  Crown,
  LockKeyhole,
  RefreshCw,
  LogOut,
} from 'lucide-react';

const TEAM_NAMES = {
  human: '인간',
  soldier: '병정',
  mouse: '쥐',
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0b1a13',
    color: '#fff6e5',
    padding: '24px 16px 48px',
    boxSizing: 'border-box',
  },
  wrap: { width: 'min(100%, 960px)', margin: '0 auto' },
  card: {
    background: '#fffaf0',
    color: '#34241b',
    borderRadius: 12,
    padding: 'clamp(20px, 4vw, 36px)',
    boxShadow: '0 16px 50px #0003',
  },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    padding: 12,
    border: '1px solid #c6a77e',
    borderRadius: 6,
    background: '#fff',
    color: '#34241b',
    fontSize: 15,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 15px',
    border: 0,
    borderRadius: 6,
    background: '#751515',
    color: '#fff6e5',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 14px',
    border: '1px solid #c6a77e',
    borderRadius: 6,
    background: 'transparent',
    color: '#34241b',
    fontSize: 14,
    cursor: 'pointer',
  },
  section: {
    marginTop: 20,
    padding: 20,
    border: '1px solid #e6d9c3',
    borderRadius: 8,
    minWidth: 0,
  },
  tableWrap: { overflowX: 'auto', width: '100%' },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    fontSize: 13,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  th: {
    padding: '11px 9px',
    borderBottom: '1px solid #d8c5a9',
    color: '#6a5140',
  },
  td: {
    padding: '11px 9px',
    borderBottom: '1px solid #eee3d2',
  },
};

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR');
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const loadSummary = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/summary', {
        cache: 'no-store',
      });
      const result = await response.json();

      if (response.status === 401) {
        setLoggedIn(false);
        setData(null);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || '현황을 불러오지 못했습니다.');
      }

      setData(result);
      setLoggedIn(true);
    } catch (err) {
      setError(err.message || '서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '로그인에 실패했습니다.');
      }

      setPassword('');
      await loadSummary();
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '초기화에 실패했습니다.');
      }

      setConfirming(false);
      setNotice(
        result.warning ||
        '초기화 완료: 제작도, 순위, 사용 내역을 초기화했습니다.'
      );
      await loadSummary();
    } catch (err) {
      setError(err.message || '초기화에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setLoggedIn(false);
      setData(null);
      setNotice('');
      setError('');
    }
  }

  const visibleLogs = (data?.logs || []).filter((log) => {
    const matchesName = log.nickname
      .toLowerCase()
      .includes(filter.trim().toLowerCase());
    const matchesAction =
      actionFilter === 'all' || log.action === actionFilter;
    return matchesName && matchesAction;
  });

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <a
            href="/"
            style={{
              color: '#fff6e5',
              textDecoration: 'none',
              display: 'inline-flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <ArrowLeft size={16} /> 사이트로 돌아가기
          </a>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              letterSpacing: '.08em',
            }}
          >
            <Crown size={17} /> HODO THEATER · ADMIN
          </span>
        </header>

        <section style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <ShieldAlert size={30} />
            <p
              style={{
                fontSize: 10,
                letterSpacing: '.2em',
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              ADMIN CONTROL ROOM
            </p>
            <h1 style={{ fontSize: 28, margin: '0 0 10px' }}>
              관리자 페이지
            </h1>
            <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>
              이벤트 현황과 닉네임별 포인트 사용 내역을 관리합니다.
            </p>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center' }}>관리자 상태를 확인하고 있습니다...</p>
          ) : !loggedIn ? (
            <form onSubmit={login} style={{ maxWidth: 420, margin: '0 auto' }}>
              <label
                htmlFor="admin-password"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                <LockKeyhole size={18} /> 관리자 비밀번호
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호 입력"
                required
                style={{ ...styles.input, marginBottom: 12 }}
              />
              <button
                type="submit"
                disabled={busy}
                style={{ ...styles.button, width: '100%' }}
              >
                {busy ? '확인 중...' : '로그인'}
              </button>
            </form>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <strong>관리자 대시보드</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={styles.secondary}
                    onClick={loadSummary}
                    disabled={busy}
                  >
                    <RefreshCw size={15} /> 새로고침
                  </button>
                  <button
                    type="button"
                    style={styles.secondary}
                    onClick={logout}
                  >
                    <LogOut size={15} /> 로그아웃
                  </button>
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={{ fontSize: 18, marginTop: 0 }}>팀별 제작도</h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12,
                  }}
                >
                  {Object.entries(TEAM_NAMES).map(([team, name]) => (
                    <div
                      key={team}
                      style={{
                        background: '#f3e8d5',
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontSize: 13 }}>{name} 팀</div>
                      <strong style={{ fontSize: 27 }}>
                        {Number(data?.progress?.[team] || 0)}%
                      </strong>
                      <div
                        style={{
                          height: 6,
                          background: '#dfd0b8',
                          borderRadius: 99,
                          marginTop: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(
                              0,
                              Math.min(100, Number(data?.progress?.[team] || 0))
                            )}%`,
                            background: '#751515',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={{ fontSize: 18, marginTop: 0 }}>
                  닉네임별 포인트 통계
                </h2>
                <p style={{ fontSize: 12, lineHeight: 1.7 }}>
                  기록된 작업 기준 통계입니다. 조회 가능한 최근 기록은 최대 5,000건입니다.
                </p>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>닉네임</th>
                        <th style={styles.th}>팀</th>
                        <th style={styles.th}>기여 포인트</th>
                        <th style={styles.th}>방해 포인트</th>
                        <th style={styles.th}>작업 횟수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.users || []).length === 0 ? (
                        <tr>
                          <td style={styles.td} colSpan={5}>
                            아직 기록된 작업이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        data.users.map((user) => (
                          <tr key={user.nickname}>
                            <td style={styles.td}>{user.nickname}</td>
                            <td style={styles.td}>
                              {user.teams.map((team) => TEAM_NAMES[team] || team).join(', ')}
                            </td>
                            <td style={styles.td}>
                              {user.contributePoints.toLocaleString()}
                            </td>
                            <td style={styles.td}>
                              {user.sabotagePoints.toLocaleString()}
                            </td>
                            <td style={styles.td}>{user.actions}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={{ fontSize: 18, marginTop: 0 }}>최근 사용 내역</h2>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}
                >
                  <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="닉네임 검색"
                    aria-label="닉네임 검색"
                    style={{ ...styles.input, flex: '1 1 180px' }}
                  />
                  <select
                    value={actionFilter}
                    onChange={(event) => setActionFilter(event.target.value)}
                    aria-label="작업 종류 필터"
                    style={{ ...styles.input, width: 'auto' }}
                  >
                    <option value="all">모든 작업</option>
                    <option value="contribute">기여</option>
                    <option value="sabotage">방해</option>
                  </select>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>시간</th>
                        <th style={styles.th}>닉네임</th>
                        <th style={styles.th}>작업</th>
                        <th style={styles.th}>대상 팀</th>
                        <th style={styles.th}>사용 포인트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLogs.length === 0 ? (
                        <tr>
                          <td style={styles.td} colSpan={5}>
                            조건에 맞는 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        visibleLogs.map((log) => (
                          <tr key={log.id}>
                            <td style={styles.td}>{fmtDate(log.created_at)}</td>
                            <td style={styles.td}>{log.nickname}</td>
                            <td style={styles.td}>
                              {log.action === 'contribute' ? '기여' : '방해'}
                            </td>
                            <td style={styles.td}>
                              {TEAM_NAMES[log.team] || log.team}
                            </td>
                            <td style={styles.td}>
                              {log.points.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ ...styles.section, borderColor: '#d9b3a5' }}>
                <h2 style={{ fontSize: 18, marginTop: 0 }}>
                  <ShieldAlert size={17} style={{ verticalAlign: 'middle' }} /> 이벤트 전체 초기화
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.8 }}>
                  모든 팀의 제작도와 기여 포인트 순위, 새로 수집한 작업 내역을 삭제합니다.
                  초기화 후에는 되돌릴 수 없습니다.
                </p>

                {!confirming ? (
                  <button
                    type="button"
                    style={styles.button}
                    onClick={() => {
                      setConfirming(true);
                      setError('');
                      setNotice('');
                    }}
                  >
                    <RotateCcw size={16} /> 전체 초기화
                  </button>
                ) : (
                  <div>
                    <p style={{ fontWeight: 700 }}>
                      정말 초기화할까요? 이 작업은 되돌릴 수 없습니다.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={styles.secondary}
                        onClick={() => setConfirming(false)}
                        disabled={busy}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        style={styles.button}
                        onClick={resetAll}
                        disabled={busy}
                      >
                        <RotateCcw size={16} />
                        {busy ? '초기화 중...' : '초기화 확인'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <p role="alert" style={{ color: '#a52c25', fontSize: 13, marginTop: 16 }}>
              {error}
            </p>
          )}
          {notice && (
            <p role="status" style={{ color: '#24633b', fontSize: 13, marginTop: 16 }}>
              {notice}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
