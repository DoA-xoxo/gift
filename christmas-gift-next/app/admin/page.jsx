
'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  RotateCcw,
  Crown,
  LockKeyhole
} from 'lucide-react';

const KEY = 'christmas-gift-event-v1';

// 원하는 관리자 비밀번호로 변경해 줘.
const ADMIN_PASSWORD = 'ahzk0903!';

const defaults = {
  nickname: '크리스마스요정',
  team: 'human',
  points: '100',
  target: 'soldier',
  sabotagePoints: '10',
  rankTeam: 'human',
  progress: {
    human: 0,
    soldier: 0,
    mouse: 0
  },
  ranks: {
    human: [],
    soldier: [],
    mouse: []
  },
  oldName: '크리스마스요정',
  newName: '',
  notice: '현황과 기여도가 초기화되었습니다.'
};

export default function AdminPage() {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function openReset() {
    setConfirming(true);
    setPassword('');
    setError('');
    setDone(false);
  }

  function cancelReset() {
    setConfirming(false);
    setPassword('');
    setError('');
  }

  function resetAll() {
    if (password !== ADMIN_PASSWORD) {
      setError('비밀번호가 올바르지 않습니다.');
      return;
    }

    try {
      localStorage.setItem(KEY, JSON.stringify(defaults));

      setConfirming(false);
      setPassword('');
      setError('');
      setDone(true);
    } catch (e) {
      setError('초기화에 실패했습니다. 다시 시도해 주세요.');
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-top">
        <a href="/" className="back-link">
          <ArrowLeft size={16} />
          사이트로 돌아가기
        </a>

        <span>
          <Crown size={17} />
          HODO THEATER · ADMIN
        </span>
      </div>

      <section className="admin-card">
        <div className="admin-emblem">
          <ShieldAlert size={28} />
        </div>

        <p className="admin-eyebrow">
          ADMIN CONTROL ROOM
        </p>

        <h1>관리자 페이지</h1>

        <p className="admin-lead">
          이벤트 현황을 관리하고 테스트 데이터를 초기화할 수 있습니다.
        </p>

        <div className="admin-warning">
          <ShieldAlert size={18} />

          <p>
            <b>주의</b>
            <br />
            초기화하면 인간·병정·쥐 팀의 제작도가 모두 0%가 되고,
            모든 팀의 기여 포인트 순위 기록이 삭제됩니다.
            초기화 후에는 되돌릴 수 없습니다.
          </p>
        </div>

        <div className="admin-action">
          <div>
            <h2>이벤트 현황 초기화</h2>
            <p>
              제작도와 기여 포인트를 모두 0으로 초기화합니다.
            </p>
          </div>

          <button
            onClick={openReset}
            className="reset-button"
          >
            <RotateCcw size={16} />
            전체 초기화
          </button>
        </div>

        {confirming && (
          <div className="confirm-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LockKeyhole size={20} />
              <strong>관리자 비밀번호 확인</strong>
            </div>

            <p>
              초기화를 진행하려면 관리자 비밀번호를 입력해 주세요.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') resetAll();
              }}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                marginBottom: '10px',
                border: '1px solid #c6a77e',
                borderRadius: '5px',
                background: '#fffaf0',
                color: '#34241b',
                fontSize: '14px'
              }}
            />

            {error && (
              <p
                role="alert"
                style={{
                  color: '#a52c25',
                  fontSize: '12px',
                  margin: '0 0 12px'
                }}
              >
                {error}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <button
                className="cancel-button"
                onClick={cancelReset}
              >
                취소
              </button>

              <button
                className="reset-button"
                onClick={resetAll}
              >
                <RotateCcw size={16} />
                비밀번호 확인 및 초기화
              </button>
            </div>
          </div>
        )}

        {done && (
          <p className="success-note" role="status">
            초기화가 완료되었습니다.
            제작도는 0%, 기여 포인트 순위 기록은 모두 초기화되었습니다.
            메인 페이지로 돌아가 새로고침해 주세요.
          </p>
        )}

        <p className="admin-footnote">
          현재 버전은 브라우저 로컬 저장소를 사용하는 프로토타입입니다.
          실제 다중 사용자 환경에서는 서버 측 관리자 인증과
          데이터베이스 권한 검증이 필요합니다.
        </p>
      </section>
    </main>
  );
}
