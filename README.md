# 재무제표 시각화 대시보드

Open DART API를 활용한 실시간 재무제표 시각화 웹 애플리케이션입니다.

## 🌐 Live Demo
배포된 애플리케이션을 확인하세요: [재무제표 대시보드](https://financial-dashboard-oc7yhuabn-taeseong-lees-projects.vercel.app)

## 🚀 주요 기능

### 1. 회사 검색 및 회사코드 조회
- **112,949개 회사** 데이터베이스에서 실시간 검색
- 회사명으로 검색하여 회사코드 자동 조회
- 상장회사 우선 정렬 및 종목코드 표시

### 2. 재무제표 데이터 조회
- Open DART API를 통한 실시간 재무제표 데이터 수집
- 사업보고서, 분기보고서 등 다양한 보고서 지원
- 재무상태표, 손익계산서, 현금흐름표 데이터 제공

### 3. 재무 데이터 시각화
- **주요 재무지표**: 총자산, 총부채, 총자본, 매출액, 순이익 등
- **재무비율**: 부채비율, 자기자본비율, 순이익률, 영업이익률
- **인터랙티브 차트**: Chart.js를 활용한 다양한 차트 시각화

## 📁 프로젝트 구조

```
fs-project/
├── 📄 config.env.example          # 환경 변수 설정 예시
├── 📄 config.env                  # 실제 API 키 설정 파일
├── 📄 .gitignore                  # Git 보안 설정
├── 📄 package.json                # 프로젝트 설정 및 의존성
├── 📄 index.js                    # 기본 API 테스트
├── 📄 downloadCorpCode.js         # 회사코드 다운로드
├── 📄 parseCorpCode.js            # XML 파싱 및 검색
├── 📄 companySearch.js            # 회사 검색 클래스
├── 📄 financialData.js            # 재무제표 데이터 조회
├── 📄 webApp.js                   # Express 웹 서버
├── 📄 run.sh                      # 편의 실행 스크립트
├── 📄 README.md                   # 프로젝트 설명서
├── 📁 downloads/                  # 다운로드된 파일들
│   ├── 📄 CORPCODE.xml           # 원본 회사코드 XML (27.26 MB)
│   └── 📄 corpCode.json          # 파싱된 JSON (18.97 MB)
├── 📁 public/                     # 웹 프론트엔드
│   ├── 📄 index.html             # 메인 HTML 페이지
│   └── 📄 app.js                 # 프론트엔드 JavaScript
└── 📁 node_modules/              # 설치된 패키지들
```

## 🛠️ 설치 및 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
# config.env.example을 config.env로 복사
cp config.env.example config.env

# config.env 파일 편집하여 실제 API 키 입력
nano config.env
```

### 3. 회사코드 데이터베이스 구축
```bash
# 회사코드 다운로드
npm run download-corp-code

# XML을 JSON으로 변환
npm run parse-corp-code
```

## 🚀 실행 방법

### 웹 애플리케이션 실행
```bash
npm run web
```
- 웹 브라우저에서 `http://localhost:3000` 접속
- 실시간 재무제표 시각화 대시보드 사용 가능

### 개별 기능 테스트
```bash
# 회사 검색 테스트
npm run test-company-search

# 재무제표 데이터 테스트
npm run test-financial-data

# 회사코드 다운로드
npm run download-corp-code

# XML 파싱
npm run parse-corp-code

# 회사 검색
npm run search-company "삼성전자"
```

## 📊 데이터베이스 정보

### 회사코드 데이터베이스
- **총 회사 수**: 112,949개
- **상장회사**: 3,881개
- **비상장회사**: 109,068개
- **최종 업데이트**: 2017년 6월 30일

### 지원하는 보고서 유형
- **사업보고서** (11011)
- **1분기보고서** (11013)
- **반기보고서** (11012)
- **3분기보고서** (11014)

## 🎯 주요 재무지표

### 기본 재무지표
- **총자산**: 회사의 전체 자산 규모
- **총부채**: 회사의 전체 부채 규모
- **총자본**: 회사의 순자산 규모
- **매출액**: 회사의 영업 수익
- **당기순이익**: 회사의 순이익

### 재무비율
- **부채비율**: 총부채 / 총자산 × 100
- **자기자본비율**: 총자본 / 총자산 × 100
- **순이익률**: 당기순이익 / 매출액 × 100
- **영업이익률**: 영업이익 / 매출액 × 100

## 📈 시각화 차트

### 1. 자산/부채/자본 구조 차트
- 막대 차트로 총자산, 총부채, 총자본 비교
- 금액 단위: 십억원

### 2. 재무비율 도넛 차트
- 부채비율, 자기자본비율, 순이익률, 영업이익률
- 백분율로 표시

### 3. 손익계산서 라인 차트
- 주요 손익 항목들의 추이
- 매출, 영업이익, 당기순이익 등

## 🔧 API 엔드포인트

### 웹 애플리케이션 API
- `GET /api/search-company?query=회사명` - 회사 검색
- `GET /api/financial-statement?corpCode=코드&bsnsYear=연도&reportType=보고서` - 재무제표 조회
- `GET /api/company-info/:corpCode` - 회사 정보 조회
- `GET /api/stats` - 통계 정보

### 사용 예시
```bash
# 회사 검색
curl "http://localhost:3000/api/search-company?query=삼성전자"

# 재무제표 조회
curl "http://localhost:3000/api/financial-statement?corpCode=00126380&bsnsYear=2023&reportType=사업보고서"
```

## 🛡️ 보안

- API 키는 환경 변수로 안전하게 관리
- `.env` 파일은 Git에서 제외
- CORS 설정으로 웹 보안 강화

## 🚨 에러 코드

| 코드 | 설명 |
|------|------|
| 000 | 정상 |
| 010 | 등록되지 않은 키 |
| 011 | 사용할 수 없는 키 |
| 012 | 접근할 수 없는 IP |
| 013 | 조회된 데이터가 없음 |
| 020 | 요청 제한 초과 |
| 800 | 시스템 점검 중 |
| 900 | 정의되지 않은 오류 |

## 📝 사용 예시

### 1. 웹 애플리케이션 사용
1. `npm run web` 실행
2. 브라우저에서 `http://localhost:3000` 접속
3. 회사명 입력 (예: "삼성전자")
4. 검색 결과에서 회사 선택
5. 사업연도와 보고서 선택
6. "재무제표 조회" 버튼 클릭
7. 시각화된 재무 데이터 확인

### 2. 프로그래밍 방식 사용
```javascript
const CompanySearch = require('./companySearch');
const FinancialData = require('./financialData');

// 회사 검색
const search = new CompanySearch();
const companies = search.searchByName('삼성전자');

// 재무제표 조회
const financial = new FinancialData();
const data = await financial.getFinancialStatement('00126380', '2023', '사업보고서');
```

## 🔮 향후 개선 계획

- [ ] 다중 회사 비교 기능
- [ ] 시계열 분석 차트
- [ ] 재무비율 트렌드 분석
- [ ] 모바일 반응형 디자인 개선
- [ ] 데이터 캐싱 시스템
- [ ] 사용자 인증 시스템

## 🚀 배포

### Vercel을 사용한 배포

1. **GitHub 리포지토리 생성**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Financial Dashboard"
   git remote add origin https://github.com/your-username/financial-dashboard.git
   git push -u origin main
   ```

2. **Vercel 계정 생성 및 배포**
   - [Vercel](https://vercel.com)에 GitHub으로 로그인
   - "New Project" 클릭
   - GitHub 리포지토리 선택
   - 환경 변수 설정:
     - `OPEN_DART_API_KEY`: Open DART API 키
     - `GOOGLE_AI_API_KEY`: Google Gemini API 키
   - "Deploy" 클릭

3. **배포 후 확인**
   - 배포 완료 후 제공되는 URL로 접속
   - 모든 기능이 정상 작동하는지 확인

### 환경 변수 설정

배포 플랫폼에서 다음 환경 변수들을 설정해야 합니다:

```bash
OPEN_DART_API_KEY=your_actual_api_key
GOOGLE_AI_API_KEY=your_actual_google_ai_key
NODE_ENV=production
PORT=3000
```

### 로컬 개발 환경

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 모드 실행
npm start
```

## 📞 지원

문제가 발생하거나 개선 사항이 있으시면 이슈를 등록해주세요.

---

**재무제표 시각화 대시보드** - Open DART API를 활용한 실시간 재무 데이터 분석 도구 🚀 