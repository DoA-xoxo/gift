'use client';
import { useState } from 'react';
import { ArrowLeft, ShieldAlert, RotateCcw, Crown } from 'lucide-react';

const KEY='christmas-gift-event-v1';
const defaults={
  nickname:'크리스마스요정',team:'human',points:'100',target:'soldier',sabotagePoints:'10',rankTeam:'human',
  progress:{human:0,soldier:0,mouse:0},
  ranks:{human:[],soldier:[],mouse:[]},oldName:'크리스마스요정',newName:'',notice:'현황과 기여도가 초기화되었습니다.'
};
export default function AdminPage(){
 const [confirming,setConfirming]=useState(false);const [done,setDone]=useState(false);
 function resetAll(){localStorage.setItem(KEY,JSON.stringify(defaults));setConfirming(false);setDone(true);}
 return <main className="admin-page"><div className="admin-top"><a href="/" className="back-link"><ArrowLeft size={16}/> 사이트로 돌아가기</a><span><Crown size={17}/> NUTCRACKER CLUB · ADMIN</span></div><section className="admin-card"><div className="admin-emblem"><ShieldAlert size={28}/></div><p className="admin-eyebrow">ADMIN CONTROL ROOM</p><h1>관리자 페이지</h1><p className="admin-lead">이벤트 현황을 관리하고 테스트 데이터를 초기화할 수 있습니다.</p><div className="admin-warning"><ShieldAlert size={18}/><p><b>주의</b><br/>초기화하면 팀별 제작도와 모든 팀의 기여 포인트 순위가 0%와 0P로 초기화됩니다. 되돌릴 수 없으니 실행 전에 확인해 주세요.</p></div><div className="admin-action"><div><h2>이벤트 현황 초기화</h2><p>제작도와 기여 포인트를 모두 0으로 초기화합니다.</p></div><button onClick={()=>setConfirming(true)} className="reset-button"><RotateCcw size={16}/> 전체 초기화</button></div>{confirming&&<div className="confirm-box"><p>정말로 현황과 기여도를 초기화할까요?</p><div><button className="cancel-button" onClick={()=>setConfirming(false)}>취소</button><button className="reset-button" onClick={resetAll}>초기화 확정</button></div></div>}{done&&<p className="success-note">초기화 데이터가 저장되었습니다. 메인 페이지로 돌아가 새로고침하면 반영됩니다.</p>}<p className="admin-footnote">현재 버전은 브라우저 로컬 저장소를 사용하는 프로토타입입니다. 이 페이지는 비밀번호 보호가 적용되지 않았으며, 여러 사용자에게 공유되는 운영 환경의 관리자 기능으로 사용하기 전에 서버 인증과 데이터베이스 권한 검증이 필요합니다.</p></section></main>
}
