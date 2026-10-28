import './globals.css';

export const metadata = {
  title: '크리스마스 선물 만들기 대작전',
  description: '호두까기 인형 테마의 크리스마스 팀 이벤트',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
