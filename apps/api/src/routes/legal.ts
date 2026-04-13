import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

/**
 * Static legal pages required for a public KR B2B SaaS launch:
 *   GET /terms    이용약관
 *   GET /privacy  개인정보처리방침
 *   GET /about    사업자 정보 (정보통신망법 표시 의무)
 *
 * Phase 8 will replace these with vendor-reviewed copy. The current
 * versions are intentionally minimal placeholders that satisfy the
 * "must exist" launch gate without exposing inaccurate legal commitments.
 *
 * Each page is server-rendered HTML so no React routing is required and
 * the content is indexable by search engines.
 */

const COMPANY = {
  name: "GoldenCheck",
  legalName: "(주)코넥트",
  representative: "박재준",
  bizNo: "123-45-67890",
  address: "서울특별시 강남구 테헤란로 123, 4층",
  email: "hello@goldencheck.kr",
  phone: "02-1234-5678",
  privacyOfficer: "박재준",
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function renderPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — GoldenCheck</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard",
                   "Helvetica Neue", Arial, sans-serif;
      background: #f7f7f8;
      color: #18181b;
      line-height: 1.7;
    }
    main { max-width: 760px; margin: 0 auto; padding: 48px 24px 96px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .meta { color: #71717a; font-size: 13px; margin-bottom: 32px; }
    h2 { font-size: 18px; margin-top: 32px; margin-bottom: 8px; }
    h3 { font-size: 15px; margin-top: 20px; margin-bottom: 4px; }
    p, li { font-size: 14px; color: #27272a; }
    ul, ol { padding-left: 22px; }
    .nav { font-size: 13px; margin-bottom: 24px; }
    .nav a { color: #3f3f46; text-decoration: none; margin-right: 12px; }
    .nav a:hover { text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 8px 0 20px; }
    th, td { border: 1px solid #e4e4e7; padding: 8px 10px; text-align: left; }
    th { background: #fafafa; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <div class="nav">
      <a href="/">← Home</a>
      <a href="/terms">이용약관</a>
      <a href="/privacy">개인정보처리방침</a>
      <a href="/about">사업자 정보</a>
    </div>
    ${body}
  </main>
</body>
</html>`;
}

function termsHtml(): string {
  return renderPage(
    "이용약관",
    `<h1>이용약관</h1>
<p class="meta">시행일: 2026년 4월 13일 · 버전 v1.0</p>

<h2>제1조 (목적)</h2>
<p>본 약관은 ${COMPANY.legalName}(이하 "회사")가 제공하는 GoldenCheck 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자(이하 "이용자")의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

<h2>제2조 (정의)</h2>
<ul>
  <li><strong>서비스</strong>: 회사가 제공하는 AI 기반 마케팅 분석, 여론 모니터링(SignalCraft), 리드 스코어링 등 일체의 기능</li>
  <li><strong>이용자</strong>: 본 약관에 동의하고 서비스를 이용하는 법인 또는 개인사업자</li>
  <li><strong>테넌트</strong>: 이용자별로 격리된 데이터 공간 단위</li>
</ul>

<h2>제3조 (약관의 효력 및 변경)</h2>
<ol>
  <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
  <li>회사는 합리적인 사유가 있을 경우 약관을 변경할 수 있으며, 변경 시 시행일 7일 전(이용자에게 불리한 변경의 경우 30일 전)에 공지합니다.</li>
</ol>

<h2>제4조 (이용계약의 체결)</h2>
<p>이용자는 회사가 정한 가입 절차에 따라 가입을 신청하고 회사가 이를 승낙함으로써 이용계약이 체결됩니다.</p>

<h2>제5조 (서비스의 제공 및 변경)</h2>
<ol>
  <li>회사는 이용자에게 SignalCraft 여론 분석, 통합 리포트, 대시보드 KPI 등의 서비스를 제공합니다.</li>
  <li>회사는 운영상·기술상 필요에 따라 서비스의 일부 또는 전부를 변경할 수 있으며, 사전 공지합니다.</li>
</ol>

<h2>제6조 (이용자의 의무)</h2>
<ul>
  <li>이용자는 본 약관 및 관련 법령을 준수하여야 합니다.</li>
  <li>이용자는 타인의 정보 도용, 시스템에 대한 부당한 침해, 자동화된 대량 요청 등을 하여서는 안 됩니다.</li>
  <li>이용자가 분석을 요청한 키워드 및 콘텐츠에 대한 법적 책임은 이용자에게 있습니다.</li>
</ul>

<h2>제7조 (요금 및 결제)</h2>
<p>유료 서비스의 요금, 결제 수단, 환불 정책은 별도의 가격 정책 페이지에서 정합니다. 무료 베타 기간 중에는 별도 요금이 발생하지 않습니다.</p>

<h2>제8조 (지적재산권)</h2>
<p>서비스 및 회사가 제작한 콘텐츠에 대한 저작권 및 기타 지적재산권은 회사에 귀속됩니다. 이용자가 분석을 위해 입력한 데이터의 권리는 이용자에게 귀속됩니다.</p>

<h2>제9조 (면책조항)</h2>
<ul>
  <li>회사는 천재지변, 통신장애, 외부 데이터 소스(예: 공개 API)의 변경 등 회사의 통제 범위를 벗어난 사유로 인한 손해에 대해 책임지지 않습니다.</li>
  <li>SignalCraft 분석 결과는 의사결정의 보조 자료이며, 최종 의사결정에 대한 책임은 이용자에게 있습니다.</li>
  <li>AI 모델의 출력에 사실 오류(환각)가 포함될 수 있음을 이용자는 인지하며, 회사는 confidence 표시 및 출처 인용을 통해 신뢰도를 표기합니다.</li>
</ul>

<h2>제10조 (분쟁 해결)</h2>
<p>본 약관에 관한 분쟁은 대한민국 법률을 준거법으로 하며, 관할 법원은 서울중앙지방법원으로 합니다.</p>

<h2>제11조 (문의)</h2>
<p>본 약관에 관한 문의는 ${COMPANY.email} 으로 연락 주십시오.</p>

<p class="meta" style="margin-top: 48px;">본 문서에 대한 문의는 hello@goldencheck.kr로 연락 주십시오.</p>`,
  );
}

function privacyHtml(): string {
  return renderPage(
    "개인정보처리방침",
    `<h1>개인정보처리방침</h1>
<p class="meta">시행일: 2026년 4월 13일 · 버전 v1.0</p>

<p>${COMPANY.legalName}(이하 "회사")는 「개인정보 보호법」 및 관련 법령에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.</p>

<h2>1. 수집하는 개인정보 항목</h2>
<table>
  <thead>
    <tr><th>구분</th><th>수집 항목</th><th>수집 시점</th></tr>
  </thead>
  <tbody>
    <tr><td>회원가입</td><td>이메일, 회사명, 담당자명</td><td>가입 신청 시</td></tr>
    <tr><td>서비스 이용</td><td>접속 로그, 쿠키, 분석 키워드</td><td>서비스 이용 중 자동 수집</td></tr>
    <tr><td>결제(유료 시)</td><td>결제 수단 정보, 사업자등록번호</td><td>결제 시</td></tr>
  </tbody>
</table>

<h2>2. 개인정보의 수집 및 이용 목적</h2>
<ul>
  <li>회원 식별 및 본인 확인</li>
  <li>서비스 제공 및 운영, 통계 분석</li>
  <li>법적 의무 이행 및 분쟁 대응</li>
  <li>신규 기능 안내, 공지사항 전달 (수신 동의 시)</li>
</ul>

<h2>3. 개인정보의 보유 및 이용기간</h2>
<ul>
  <li>회원 탈퇴 시까지. 단, 관련 법령에 따라 보존 의무가 있는 경우 해당 기간까지 보존</li>
  <li>전자상거래법: 계약 또는 청약철회 기록 5년, 대금결제 및 재화 공급에 관한 기록 5년, 소비자의 불만 또는 분쟁처리 기록 3년</li>
</ul>

<h2>4. 개인정보의 제3자 제공</h2>
<p>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 법령에 의거하거나 수사기관이 요구한 경우는 예외로 합니다.</p>

<h2>5. 개인정보 처리 위탁</h2>
<table>
  <thead>
    <tr><th>수탁자</th><th>위탁 업무</th></tr>
  </thead>
  <tbody>
    <tr><td>Railway Corp.</td><td>인프라 호스팅 (US/EU 리전)</td></tr>
    <tr><td>Cloudflare, Inc.</td><td>DNS 및 보안 (글로벌)</td></tr>
    <tr><td>Functional Software, Inc. (Sentry)</td><td>오류 추적 (US 리전)</td></tr>
  </tbody>
</table>
<p>국외 이전이 발생할 수 있으며, 이용자는 가입 시 이에 대해 동의한 것으로 간주됩니다.</p>

<h2>6. 정보주체의 권리</h2>
<p>이용자는 언제든지 본인의 개인정보에 대해 다음 권리를 행사할 수 있습니다.</p>
<ul>
  <li>개인정보 열람·정정·삭제 요구</li>
  <li>처리 정지 요구</li>
  <li>동의 철회</li>
</ul>
<p>요청은 ${COMPANY.email} 로 연락 주십시오.</p>

<h2>7. 쿠키 사용</h2>
<p>회사는 서비스 운영을 위해 세션 유지용 필수 쿠키를 사용합니다. 마케팅 또는 추적 목적의 쿠키는 사용하지 않습니다. 이용자는 브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 기능 이용에 제한이 있을 수 있습니다.</p>

<h2>8. 개인정보 보호책임자</h2>
<table>
  <tbody>
    <tr><th>책임자</th><td>${COMPANY.privacyOfficer}</td></tr>
    <tr><th>이메일</th><td>${COMPANY.email}</td></tr>
  </tbody>
</table>

<h2>9. 권익침해 구제방법</h2>
<ul>
  <li>개인정보보호위원회: <a href="https://www.pipc.go.kr">https://www.pipc.go.kr</a> (국번없이 182)</li>
  <li>한국인터넷진흥원 개인정보침해신고센터: <a href="https://privacy.kisa.or.kr">https://privacy.kisa.or.kr</a> (국번없이 118)</li>
</ul>

<h2>10. 개인정보처리방침의 변경</h2>
<p>본 방침이 변경될 경우 변경사항의 시행일 7일 전부터 본 페이지를 통해 공지합니다.</p>

<p class="meta" style="margin-top: 48px;">본 문서에 대한 문의는 hello@goldencheck.kr로 연락 주십시오.</p>`,
  );
}

function aboutHtml(): string {
  return renderPage(
    "사업자 정보",
    `<h1>사업자 정보</h1>
<p class="meta">정보통신망 이용촉진 및 정보보호 등에 관한 법률 제3조에 따른 표시</p>

<table>
  <tbody>
    <tr><th>상호</th><td>${COMPANY.legalName}</td></tr>
    <tr><th>서비스명</th><td>${COMPANY.name}</td></tr>
    <tr><th>대표자</th><td>${COMPANY.representative}</td></tr>
    <tr><th>사업자등록번호</th><td>${COMPANY.bizNo}</td></tr>
    <tr><th>사업장 주소</th><td>${COMPANY.address}</td></tr>
    <tr><th>이메일</th><td><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></td></tr>
    <tr><th>전화</th><td>${COMPANY.phone}</td></tr>
    <tr><th>개인정보보호책임자</th><td>${COMPANY.privacyOfficer}</td></tr>
  </tbody>
</table>

<h2>서비스 개요</h2>
<p>GoldenCheck는 교육 콘텐츠 및 도서 출판사를 위한 AI 기반 마케팅 분석 플랫폼입니다. SignalCraft 여론 분석 파이프라인, 카테고리 A 마스터 데이터셋(글로벌 바이어, 시장 트렌드, 환율, 베스트셀러 등), 14모듈 LLM 분석, 통합 리포트 등을 제공합니다.</p>

<h2>관련 페이지</h2>
<ul>
  <li><a href="/terms">이용약관</a></li>
  <li><a href="/privacy">개인정보처리방침</a></li>
</ul>

<p class="meta" style="margin-top: 48px;">본 페이지에 대한 문의는 hello@goldencheck.kr로 연락 주십시오.</p>`,
  );
}

function pricingHtml(): string {
  return renderPage(
    "요금제",
    `<h1>요금제</h1>
<p class="meta">VAT 별도.</p>

<table>
  <thead>
    <tr><th>항목</th><th>Starter</th><th>Professional</th><th>Enterprise</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>월 요금</strong></td><td>50만원</td><td><strong>150만원</strong></td><td>문의</td></tr>
    <tr><td>제품 수</td><td>5개</td><td>20개</td><td>무제한</td></tr>
    <tr><td>키워드 수</td><td>20개</td><td>100개</td><td>무제한</td></tr>
    <tr><td>월 분석 횟수</td><td>10회</td><td>무제한</td><td>무제한</td></tr>
    <tr><td>리포트 형식</td><td>기본 리포트</td><td>전체 리포트 + 캠페인 생성</td><td>커스텀 리포트</td></tr>
    <tr><td>SOV 분석</td><td>-</td><td>포함</td><td>포함</td></tr>
    <tr><td>콘텐츠 갭 분석</td><td>-</td><td>포함</td><td>포함</td></tr>
    <tr><td>리스크 알림</td><td>-</td><td>포함</td><td>포함 + 커스텀 룰</td></tr>
    <tr><td>API 연동</td><td>-</td><td>-</td><td>포함</td></tr>
    <tr><td>전담 매니저</td><td>-</td><td>포함</td><td>포함</td></tr>
    <tr><td>SLA</td><td>-</td><td>99.5%</td><td>99.9%</td></tr>
    <tr><td>데이터 보관</td><td>90일</td><td>1년</td><td>무제한</td></tr>
  </tbody>
</table>

<h2>자주 묻는 질문</h2>

<h3>결제 수단은 무엇인가요?</h3>
<p>신용카드, 계좌이체, 세금계산서 발행이 가능합니다. Enterprise 플랜은 연간 계약 시 10% 할인을 제공합니다.</p>

<h3>플랜을 변경할 수 있나요?</h3>
<p>언제든지 상위 플랜으로 업그레이드할 수 있으며, 남은 기간은 일할 정산됩니다. 다운그레이드는 다음 결제일부터 적용됩니다.</p>

<h3>환불 정책은 어떻게 되나요?</h3>
<p>결제일로부터 7일 이내 요청 시 전액 환불이 가능합니다. 7일 이후에는 잔여 기간에 대한 일할 환불을 제공합니다.</p>

<h2>문의</h2>
<p>요금제 관련 상담은 <a href="mailto:${COMPANY.email}">${COMPANY.email}</a> 또는 전화 ${COMPANY.phone}으로 연락 주십시오.</p>`,
  );
}

export const legalRouter: ExpressRouter = Router();

legalRouter.get("/terms", (_req: Request, res: Response) => {
  res.set("content-type", "text/html; charset=utf-8");
  res.send(termsHtml());
});

legalRouter.get("/privacy", (_req: Request, res: Response) => {
  res.set("content-type", "text/html; charset=utf-8");
  res.send(privacyHtml());
});

legalRouter.get("/about", (_req: Request, res: Response) => {
  res.set("content-type", "text/html; charset=utf-8");
  res.send(aboutHtml());
});

legalRouter.get("/pricing", (_req: Request, res: Response) => {
  res.set("content-type", "text/html; charset=utf-8");
  res.send(pricingHtml());
});
