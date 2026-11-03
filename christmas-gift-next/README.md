# 크리스마스 선물 만들기 대작전 — Next.js

Nutcracker-inspired Christmas event dashboard built with **Next.js App Router**, React, CSS, and Lucide icons. The current page is a client-side demo with interactive contribution, sabotage, team ranking tabs, and nickname rename behavior.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Upload this folder to a GitHub repository.
2. Import the repository at https://vercel.com/new.
3. Vercel detects Next.js automatically; use the default build command `next build` and output settings.
4. Deploy.

## Supabase real-time setup

The UI currently runs in demo mode with in-memory sample data. To run a shared, multi-user event, connect Supabase and move point balances, contributions, team progress and nickname updates into database-backed server-validated RPCs. Never let a browser directly set its own point balance or team progress. `.env.example` shows the public project variables; no real credentials are included in this package.

Suggested tables: `profiles`, `team_progress`, `contributions`, and `point_transactions`. Enable Realtime for `team_progress` and `contributions`; add Row Level Security and validate point spending inside SQL functions/transactions before launching publicly.

## Project structure

- `app/page.jsx` — interactive dashboard UI
- `app/layout.jsx` — Korean metadata and root layout
- `app/globals.css` — responsive theme styling
- `public/gift-box.png` — transparent gift-box artwork
- `preview-concept.png` — visual design reference

## 관리자 페이지와 초기화

- 관리자 페이지: `/admin`
- `전체 초기화` 버튼은 브라우저에 저장된 데모 데이터를 인간/병정/쥐 제작도 0%, 모든 팀 순위 및 기여 포인트 0건으로 초기화합니다.
- 데모 데이터는 `localStorage`에 저장되므로 같은 브라우저의 같은 사이트에서 공유됩니다. 다른 기기/사용자 간에는 공유되지 않습니다.
- `/admin`은 현재 인증이 없는 프로토타입용 화면입니다. 실제 공개 이벤트 전에 서버 측 관리자 인증과 Supabase RPC/권한 정책을 구현해야 합니다.
- 쥐 팀 아이콘은 이모지 대신 체스 킹 기호 `♚`로 변경했습니다.


## 마리의 장난감 상자와 공통 회원 계정

이 프로젝트의 `public.event_users` 테이블이 두 사이트의 공통 로그인 ID/비밀번호 저장소입니다. 마리의 장난감 상자도 반드시 같은 Supabase 프로젝트를 사용해야 합니다.

- 마리 프로젝트의 `supabase/schema.sql`을 먼저 실행하고 `supabase/check-shared-auth-conflicts.sql` 결과가 0행인지 확인한 다음, `supabase/shared-auth-migration.sql`을 같은 Supabase SQL Editor에서 실행합니다.
- 두 Vercel 프로젝트의 `NEXT_PUBLIC_SUPABASE_URL` 및 서버 전용 `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`는 동일한 Supabase 프로젝트를 가리켜야 합니다.
- 기존 gift 계정의 scrypt 비밀번호 해시는 변경되지 않습니다. 이전 Mari 프로토타입의 bcrypt 계정 해시도 지원합니다.
- 새 회원가입은 어느 사이트에서 하든 `event_users`에 생성되며, DB 트리거가 Mari 프로필을 함께 생성합니다.
- 닉네임/로그인 ID를 한 사이트에서 변경하면 공통 계정과 Mari 프로필에도 반영됩니다. 두 사이트는 서로 다른 도메인이므로 세션은 각각 로그인해야 합니다.

**마이그레이션 전 Supabase 백업을 만드세요.** 같은 닉네임이 두 사이트의 기존 테이블에 동시에 존재하면 SQL이 안전을 위해 중단됩니다. 이때에는 임의로 계정을 합치지 말고 충돌 목록을 확인해야 합니다.
