# 크리스마스 선물 만들기 대작전

호두까기 인형 + 엔틱 크리스마스 테마의 React/Vite 프로토타입입니다.

## 실행
```bash
npm install
npm run dev
```

## Vercel 배포
1. `christmas-gift-operation` 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 저장소를 Import 합니다.
3. Framework Preset은 Vite, Build Command는 `npm run build`, Output Directory는 `dist`로 설정합니다.

## 기능
- 닉네임 입력 및 팀 선택(인간/병정/쥐)
- 기여 포인트 10P당 제작도 +1%
- 방해 포인트 10P당 제작도 -0.5%
- 팀별 제작도 막대와 팀별 기여 순위 보드
- 닉네임 변경 시 현재 브라우저 상태의 순위표 반영
- 반응형 모바일 레이아웃
- `public/gift-box.png`: 투명 배경 선물 상자 PNG

## 중요
현재는 화면 디자인 검토용 프론트엔드 프로토타입으로, 데이터는 브라우저 메모리에만 존재합니다. 새로고침하거나 다른 사용자가 접속하면 데이터가 공유되지 않습니다. 실제 다중 사용자 실시간 운영을 위해서는 Supabase/Firebase 등의 데이터베이스와 서버 측 포인트 검증 및 동시성 처리를 연결해야 합니다.
