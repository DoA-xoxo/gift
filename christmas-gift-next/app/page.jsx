'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Snowflake, Trophy, Pencil, Coins, Sparkles, ShieldAlert, Crown } from 'lucide-react';
const TEAMS=[{id:'human',name:'인간',color:'#bd302b',soft:'#f8e4df',icon:'♟'},{id:'soldier',name:'병정',color:'#28649a',soft:'#e0ebf6',icon:'♜'},{id:'mouse',name:'쥐',color:'#287347',soft:'#e0eee2',icon:'♚'}];
const initialRanks = { human: [], soldier: [], mouse: [] };
const STORAGE_KEY='christmas-gift-event-v1';
function App(){
 const [hydrated,setHydrated]=useState(false);
 const [nickname,setNickname]=useState(''); const [team,setTeam]=useState('human'); const [points,setPoints]=useState('100'); const [target,setTarget]=useState('soldier'); const [sabotagePoints,setSabotagePoints]=useState('10'); const [rankTeam,setRankTeam]=useState('human'); const [progress,setProgress]=useState({human:42.5,soldier:37.8,mouse:28.6}); const [ranks,setRanks]=useState(initialRanks); const [oldName,setOldName]=useState(''); const [newName,setNewName]=useState(''); const [notice,setNotice]=useState('작은 기여가 모여 멋진 크리스마스 선물이 완성돼요!');
 const [authMode,setAuthMode]=useState('login');
 const [authNickname,setAuthNickname]=useState('');
 const [authPassword,setAuthPassword]=useState('');
 const [loggedInNickname,setLoggedInNickname]=useState('');
 const [showRenameModal, setShowRenameModal] = useState(false);
 const [renameNickname, setRenameNickname] = useState('');
 const [renaming, setRenaming] = useState(false);

 // Restore the signed-in nickname from the HttpOnly session cookie on page load.
 useEffect(() => {
  let cancelled = false;

  async function restoreSession() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!response.ok) return;

      const data = await response.json();
      if (!cancelled && data.loggedIn && data.nickname) {
        setLoggedInNickname(data.nickname);
        setNickname(data.nickname);
      }
    } catch (error) {
      console.error('로그인 상태를 확인하지 못했습니다.', error);
    }
  }

  restoreSession();

  return () => {
    cancelled = true;
  };
 }, []);

 useEffect(() => {
  let cancelled = false;

  async function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const d = JSON.parse(raw);
        if (d.nickname !== undefined) setNickname(d.nickname);
        if (d.team !== undefined) setTeam(d.team);
        if (d.points !== undefined) setPoints(d.points);
        if (d.target !== undefined) setTarget(d.target);
        if (d.sabotagePoints !== undefined) setSabotagePoints(d.sabotagePoints);
        if (d.rankTeam !== undefined) setRankTeam(d.rankTeam);
        if (d.oldName !== undefined) setOldName(d.oldName);
        if (d.newName !== undefined) setNewName(d.newName);
        if (d.notice !== undefined) setNotice(d.notice);
      }

      const response = await fetch('/api/event-state');
      if (!response.ok) throw new Error('공유 데이터를 불러오지 못했습니다.');

      const data = await response.json();

      if (!cancelled) {
        setProgress(data.progress);
        setRanks(data.ranks);
      }
    } catch (error) {
      console.error(error);
      if (!cancelled) {
        setNotice('공유 데이터를 불러오지 못했어요. 새로고침해 주세요.');
      }
    } finally {
      if (!cancelled) setHydrated(true);
    }
  }

  loadData();

  return () => {
    cancelled = true;
  };
}, []);
 
useEffect(() => {
  if (!hydrated) return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        nickname,
        team,
        points,
        target,
        sabotagePoints,
        rankTeam,
        oldName,
        newName,
        notice,
      })
    );
  } catch (error) {
    console.warn('Could not save personal settings', error);
  }
}, [
  hydrated,
  nickname,
  team,
  points,
  target,
  sabotagePoints,
  rankTeam,
  oldName,
  newName,
  notice,
]);

useEffect(() => {
  if (!hydrated) return;

  const timer = setInterval(async () => {
    try {
      const response = await fetch('/api/event-state', {
        cache: 'no-store',
      });

      if (!response.ok) return;

      const data = await response.json();
      setProgress(data.progress);
      setRanks(data.ranks);
    } catch (error) {
      console.warn('공유 데이터 새로고침 실패', error);
    }
  }, 5000);

  return () => clearInterval(timer);
}, [hydrated]);

 const active=TEAMS.find(t=>t.id===team); const totalPoints=useMemo(()=>Object.values(ranks).flat().find(r=>r.name===nickname)?.points||0,[ranks,nickname]);

async function logout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      alert('로그아웃에 실패했습니다. 다시 시도해 주세요.');
      return;
    }

    setLoggedInNickname('');
    setAuthNickname('');
    setAuthPassword('');
    setNickname('');

    alert('로그아웃되었습니다!');
  } catch (error) {
    alert('오류가 발생했습니다. 다시 시도해 주세요.');
  }
}
 
async function submitAuth(e) {
   e.preventDefault();
   const cleanNickname = authNickname.trim();
   if (!cleanNickname || !authPassword) {
     setNotice('닉네임과 비밀번호를 입력해 주세요.');
     return;
   }

   try {
     const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
     const response = await fetch(endpoint, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ nickname: cleanNickname, password: authPassword }),
     });
     const data = await response.json().catch(() => ({}));
         if (!response.ok) throw new Error(data.error || (authMode === 'register' ? '회원가입에 실패했어요.' : '로그인에 실패했어요.'));

     if (authMode === 'register') {
       setAuthMode('login');
       setAuthPassword('');
       setNotice('회원가입이 완료됐어요! 같은 닉네임과 비밀번호로 로그인해 주세요.');
     } else {
       setLoggedInNickname(cleanNickname);
       setNickname(cleanNickname);
       setAuthPassword('');
       setNotice(`${cleanNickname}님, 로그인했어요! 이제 포인트를 사용할 수 있어요.`);
     }
   } catch (error) {
     setNotice(error.message || '요청을 처리하지 못했어요.');
   }
 }

 async function contribute() {
   const n = Math.floor(Number(points));
   if (!loggedInNickname) {
     setNotice('먼저 회원가입 후 로그인해 주세요.');
     return;
   }
   if (!Number.isFinite(n) || n <= 0) {
     setNotice('사용할 포인트를 1 이상 입력해 주세요.');
     return;
   }

   try {
     const response = await fetch('/api/event-action', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action: 'contribute', team, points: n }),
     });
     const data = await response.json().catch(() => ({}));
     if (!response.ok) throw new Error(data.error || '저장에 실패했어요.');
     setProgress(data.progress);
     setRanks(data.ranks);
     setNotice(`${active.name} 팀에 ${n.toLocaleString()} 포인트를 기여했어요! 제작도가 서버에 반영됐어요.`);
   } catch (error) {
     setNotice(error.message || '저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
   }
 }

 async function sabotage() {
   const n = Math.floor(Number(sabotagePoints));
   if (!loggedInNickname) {
     setNotice('먼저 회원가입 후 로그인해 주세요.');
     return;
   }
   if (!Number.isFinite(n) || n <= 0) {
     setNotice('방해할 포인트를 1 이상 입력해 주세요.');
     return;
   }

   try {
     const response = await fetch('/api/event-action', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action: 'sabotage', target, points: n }),
     });
     const data = await response.json().catch(() => ({}));
     if (!response.ok) throw new Error(data.error || '저장에 실패했어요.');
     setProgress(data.progress);
     setRanks(data.ranks);
     setNotice(`${TEAMS.find(t => t.id === target).name} 팀 제작도 변경 사항이 서버에 반영됐어요.`);
   } catch (error) {
     setNotice(error.message || '저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
   }
 }

 async function rename() {
  const from = oldName.trim();
  const to = newName.trim();

  if (!from || !to) {
    setNotice('기존 닉네임과 변경할 닉네임을 모두 입력해 주세요.');
    return;
  }

  const nextRanks = { ...ranks };

  for (const k of Object.keys(nextRanks)) {
    const merged = {};

    (nextRanks[k] || []).forEach(r => {
      const name = r.name === from ? to : r.name;
      merged[name] = (merged[name] || 0) + r.points;
    });

    nextRanks[k] = Object.entries(merged)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);
  }

  setRanks(nextRanks);

  try {
    const response = await fetch('/api/event-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, ranks: nextRanks }),
    });

    if (!response.ok) throw new Error('저장 실패');

    if (nickname === from) setNickname(to);
    setOldName(to);
    setNewName('');
    setNotice(`닉네임이 ${to}(으)로 변경됐어요. 순위표에도 반영했습니다.`);
  } catch (error) {
    console.error(error);
    setNotice('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
  }
}
 return <main className="page"><div className="snow s1">✧</div><div className="snow s2">✦</div><header className="topline"><div className="mini-brand"><Crown size={17}/>HODO THEATER</div></header><section className="hero"><div className="eyebrow"><Snowflake size={15}/> THE HOLIDAY MISSION <Snowflake size={15}/></div><h1>크리스마스 선물<br/><em>만들기 대작전</em></h1><p>각 팀이 힘을 모아 크리스마스 선물을 완성하세요.</p><div className="hero-art"><div className="glow"/><img src="/gift-box1.png" alt="빨간색 리본 크리스마스 선물 상자"/><span className="spark sp1">✧</span><span className="spark sp2">✦</span><span className="spark sp3">✧</span></div><div className="progress-wrap"><div className="section-label"><span/> 팀별 선물 제작도 <span/></div><div className="progress-grid">{TEAMS.map(t=><div className="progress-card" key={t.id}><div className="team-icon" style={{'--team':t.color}}>{t.icon}</div><div className="progress-info"><div className="progress-title"><b>{t.name} 팀</b><strong>{progress[t.id].toFixed(1)}%</strong></div><div className="bar"><span style={{width:`${progress[t.id]}%`,background:t.color}}/></div></div></div>)}</div></div></section>

<section
  className="panel auth-panel"
  style={{
    width: '100%',
    maxWidth: 'none',
    boxSizing: 'border-box',
    margin: '24px 0 28px',
    padding: 12,
  }}
>




{!loggedInNickname ? (
  <form onSubmit={submitAuth}>
    <div
      className="auth-controls"
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: 8,
        marginTop: 0,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="auth-mode-buttons"
        style={{
          display: 'flex',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setAuthMode('login')}
          style={{
            height: 40,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid #8b5e3c',
            background: authMode === 'login' ? '#8b5e3c' : '#fffaf4',
            color: authMode === 'login' ? '#fff' : '#6b5544',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'wrap',
          }}
        >
          로그인
        </button>

        <button
          type="button"
          onClick={() => setAuthMode('register')}
          style={{
            height: 40,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid #8b5e3c',
            background: authMode === 'register' ? '#8b5e3c' : '#fffaf4',
            color: authMode === 'register' ? '#fff' : '#6b5544',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          회원가입
        </button>
      </div>

      <input
        aria-label="닉네임"
        value={authNickname}
        onChange={e => setAuthNickname(e.target.value)}
        autoComplete="username"
        maxLength={20}
        placeholder="닉네임"
        style={{
          flex: '1 1 100px',
          width: 0,
          minWidth: 0,
          height: 40,
          margin: 0,
          boxSizing: 'border-box',
          padding: '0 12px',
        }}
      />

      <input
        aria-label="비밀번호"
        type="password"
        value={authPassword}
        onChange={e => setAuthPassword(e.target.value)}
        autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
        minLength={authMode === 'register' ? 4 : 1}
        maxLength={128}
        placeholder={authMode === 'register' ? '비밀번호 (4자 이상)' : '비밀번호'}
        style={{
          flex: '1 1 120px',
          width: 0,
          minWidth: 0,
          height: 40,
          margin: 0,
          boxSizing: 'border-box',
          padding: '0 12px',
        }}
      />

      <button
        type="submit"
        className="primary-button"
        style={{
          flex: '0 0 auto',
          width: 'auto',
          minWidth: 0,
          height: 40,
          margin: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          whiteSpace: 'nowrap',
        }}
      >
        {authMode === 'register' ? '가입하기' : '로그인'}
      </button>
    </div>

    {authMode === 'register' && (
      <p className="hint" style={{ marginTop: 6 }}>
        닉네임 1~20자, 비밀번호 4자 이상
      </p>
    )}
  </form>
) : (
  <div
    className="auth-user-row"
    style={{
      marginTop: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'nowrap',
      width: '100%',
      minHeight: 40,
      boxSizing: 'border-box',
    }}
  >
    <p
      style={{
        margin: 0,
        flex: '1 1 auto',
        minWidth: 0,
        lineHeight: 1.4,
        overflowWrap: 'anywhere',
      }}
    >
      <strong>{loggedInNickname}</strong> 님, 메리 크리스마스!
    </p>

    <button
      type="button"
      className="primary-button"
      onClick={() => {
        setRenameNickname(loggedInNickname);
        setShowRenameModal(true);
      }}
      style={{
        width: 'auto',
        flex: '0 0 auto',
        height: 40,
        margin: 0,
        padding: '0 12px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      닉네임 변경
    </button>

    <button
      type="button"
      className="primary-button"
      onClick={logout}
      style={{
        width: 'auto',
        flex: '0 0 auto',
        height: 40,
        margin: 0,
        padding: '0 12px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      로그아웃
    </button>
  </div>
)}

  </section>
  
  <section className="action-grid"><article className="panel contribution"><div className="panel-heading"><div className="heading-icon red"><Gift size={19}/></div><div><h2>기여하기</h2><p>선택한 팀의 선물 제작도를 올려요</p></div></div><label>참여 닉네임</label><input value={loggedInNickname || ""} readOnly placeholder="먼저 로그인해 주세요"/><label>기여할 팀 선택</label><div className="team-buttons">{TEAMS.map(t=><button key={t.id} className={team===t.id?'chosen':''} style={{'--team':t.color}} onClick={()=>setTeam(t.id)}>{t.icon} {t.name}</button>)}</div><label>사용할 포인트</label><div className="point-input"><Coins size={17}/><input type="number" min="1" value={points} onChange={e=>setPoints(e.target.value)}/><span>P</span></div><p className="hint">10 포인트 사용 시 제작도 1% 증가</p><button className="primary-button" style={{'--team':active.color}} onClick={contribute}>선물 제작에 기여하기 <span>↗</span></button></article>
 <article className="panel sabotage"><div className="panel-heading"><div className="heading-icon green"><ShieldAlert size={19}/></div><div><h2>방해하기</h2><p>다른 팀의 제작도를 낮춰요</p></div></div><label>방해할 팀 선택</label><div className="team-buttons">{TEAMS.map(t=><button key={t.id} className={target===t.id?'chosen':''} style={{'--team':t.color}} onClick={()=>setTarget(t.id)}>{t.icon} {t.name}</button>)}</div><label>사용할 포인트</label><div className="point-input"><Coins size={17}/><input type="number" min="1" value={sabotagePoints} onChange={e=>setSabotagePoints(e.target.value)}/><span>P</span></div><p className="hint">10 포인트 사용 시 제작도 0.5% 감소</p><button className="primary-button dark" onClick={sabotage}>방해 작전 실행 <span>↗</span></button><p className="fineprint">※ 방해에 사용한 포인트는 기여 포인트에 집계되지 않습니다.</p></article>
 <article className="panel ranking"><div className="panel-heading"><div className="heading-icon gold"><Trophy size={19}/></div><div><h2>팀별 순위 보드</h2><p>우리 팀의 기여자를 확인하세요</p></div></div><div className="rank-tabs">{TEAMS.map(t=><button key={t.id} onClick={()=>setRankTeam(t.id)} className={rankTeam===t.id?'active':''} style={{'--team':t.color}}>{t.name}</button>)}</div><div className="rank-head"><span>순위</span><span>닉네임</span><span>기여 포인트</span></div><div className="rank-list">{[...(ranks[rankTeam]||[])].sort((a,b)=>b.points-a.points).slice(0,8).map((r,i)=><div className={'rank-row '+(r.name===nickname?'me':'')} key={r.name}><span className="rank-num">{i===0?'♛':String(i+1).padStart(2,'0')}</span><span className="rank-name">{r.name}{r.name===nickname&&<small>ME</small>}</span><strong>{r.points.toLocaleString()} <small>P</small></strong></div>)}</div><div className="rank-foot"><span>TEAM CONTRIBUTION</span><span>{TEAMS.find(t=>t.id===rankTeam).name} TEAM</span></div></article></section>

  
{showRenameModal && loggedInNickname && (
  <div
    onClick={() => !renaming && setShowRenameModal(false)}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(20, 8, 4, 0.72)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      boxSizing: 'border-box',
    }}
  >
    <section
      className="panel rename-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-heading"
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: 420,
        boxSizing: 'border-box',
        padding: 24,
        borderRadius: 12,
      }}
    >
      <div className="rename-title">
        <div className="heading-icon gold">
          <Pencil size={18} />
        </div>
        <div>
          <h2 id="rename-heading">닉네임 변경</h2>
          <p>새로운 닉네임을 입력해 주세요.</p>
        </div>
      </div>

      <form
        onSubmit={async e => {
          e.preventDefault();
          if (renaming) return;

          const nextNickname = renameNickname.trim();

          if (
            !nextNickname ||
            nextNickname.length > 20 ||
            !/^[a-zA-Z0-9가-힣_-]+$/.test(nextNickname)
          ) {
            setNotice('닉네임은 한글, 영문, 숫자, _ 또는 -로 1~20자 입력해 주세요.');
            return;
          }

          setRenaming(true);

          try {
            const response = await fetch('/api/auth/rename', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ nickname: nextNickname }),
            });

            const data = await response.json();

            if (!response.ok) {
              setNotice(data.error || '닉네임 변경에 실패했어요.');
              return;
            }

            setLoggedInNickname(data.nickname);
            setNickname(data.nickname);
            setOldName(data.nickname);
            setNewName('');
            setShowRenameModal(false);
            setNotice('닉네임이 성공적으로 변경됐어요! 🎄');
          } catch (error) {
            console.error('닉네임 변경 실패:', error);
            setNotice('서버에 연결하지 못했어요. 다시 시도해 주세요.');
          } finally {
            setRenaming(false);
          }
        }}
      >
       <label
  htmlFor="rename-nickname"
  style={{
    display: 'block',
    marginTop: 22,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 700,
  }}
>
  새 닉네임
</label>

<input
  id="rename-nickname"
  name="newNickname"
  value={renameNickname}
  onChange={e => setRenameNickname(e.target.value)}
  placeholder="새 닉네임"
  aria-label="새 닉네임"
  autoComplete="off"
  maxLength={20}
  required
  style={{
    display: 'block',
    width: '100%',
    height: 44,
    boxSizing: 'border-box',
    marginTop: 8,
    padding: '0 14px',
    borderRadius: 8,
  }}
/>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 10,
          }}
        >
          <button
            type="button"
            disabled={renaming}
            onClick={() => setShowRenameModal(false)}

style={{
  width: 'auto',
  minWidth: 76,
  minHeight: 42,
  padding: '10px 16px',
  borderRadius: 8,
}}

          >
            취소
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={renaming}
            style={{
              width: 'auto',
              padding: '10px 14px',
            }}
          >
            {renaming ? '변경 중...' : '변경하기'}
          </button>
        </div>
      </form>
    </section>
  </div>
)}

  
<div className="toast"><Sparkles size={16}/><span>{notice}</span></div><footer><span>✦</span> MADE WITH A LITTLE CHRISTMAS MAGIC <span>✦</span><p>당신의 작은 기여가 모두의 크리스마스를 완성합니다.</p></footer></main>
}

export default App;
