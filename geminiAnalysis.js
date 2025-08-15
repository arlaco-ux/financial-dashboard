const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './config.env' });

class GeminiAnalysis {
    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
        }
        
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }

    // 재무제표 종합 분석
    async analyzeFinancialStatement(companyInfo, financialData) {
        try {
            console.log('🔍 AI 분석 시작:', companyInfo.corp_name);
            console.log('📊 재무 데이터 구조:', Object.keys(financialData));
            
            const { metrics, ratios, incomeStatement } = financialData;
            
            // 데이터 유효성 검사
            if (!metrics || !ratios) {
                console.error('❌ metrics 또는 ratios가 없습니다.');
                return '재무 데이터가 충분하지 않아 분석할 수 없습니다.';
            }
            
            const prompt = `
다음은 ${companyInfo.corp_name}의 재무제표 데이터입니다. 
일반 투자자도 이해할 수 있도록 쉽고 친근한 톤으로 분석해주세요.

**회사 정보:**
- 회사명: ${companyInfo.corp_name}
- 종목코드: ${companyInfo.stock_code || '비상장'}
- 업종: ${companyInfo.sector || '정보없음'}

**주요 재무지표:**
- 총자산: ${this.formatCurrency(metrics.totalAssets)}원
- 총부채: ${this.formatCurrency(metrics.totalLiabilities)}원
- 자기자본: ${this.formatCurrency(metrics.totalEquity)}원
- 매출액: ${this.formatCurrency(metrics.revenue)}원
- 영업이익: ${this.formatCurrency(metrics.operatingIncome)}원
- 당기순이익: ${this.formatCurrency(metrics.netIncome)}원

**재무비율:**
- 부채비율: ${ratios.debtRatio}%
- 자기자본비율: ${ratios.equityRatio}%
- 순이익률: ${ratios.netProfitMargin}%
- 영업이익률: ${ratios.operatingProfitMargin}%
- ROE: ${ratios.roe || 0}%

다음 형식으로 분석해주세요:

## 📊 ${companyInfo.corp_name} 재무제표 분석

### 🎯 핵심 요약
(3-4문장으로 핵심 내용 요약)

### 💰 재무상태 분석
- **자산 규모**: (총자산 기준으로 대기업/중견기업/중소기업 판단)
- **부채 수준**: (부채비율 기준으로 안정성 평가)
- **자기자본**: (자기자본비율 기준으로 재무건전성 평가)

### 📈 수익성 분석
- **매출 규모**: (매출액 기준으로 사업 규모 평가)
- **수익성**: (영업이익률, 순이익률 기준으로 수익성 평가)
- **ROE**: (자기자본 대비 수익성 평가)

### ⚠️ 주의사항
(투자 시 고려해야 할 리스크나 주의점)

### 💡 투자자 관점
(일반 투자자에게 도움이 되는 조언)

분석은 친근하고 이해하기 쉽게 작성해주세요. 전문 용어는 최대한 피하고, 일상적인 비유를 사용해주세요.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
            
        } catch (error) {
            console.error('Gemini 분석 오류:', error);
            console.error('오류 상세:', error.message);
            console.error('오류 스택:', error.stack);
            
            // 쿼터 초과 에러 처리
            if (error.message.includes('429 Too Many Requests') || error.message.includes('quota')) {
                return `🤖 AI 분석 서비스가 일시적으로 사용량 한계에 도달했습니다.

📊 현재 상황:
• 무료 사용량 한계 초과
• 분당 요청 제한 또는 일일 요청 제한 도달

⏰ 해결 방법:
• 잠시 후(1-10분) 다시 시도해주세요
• 또는 내일 다시 시도해주세요

💡 대안:
• 재무제표 차트와 수치를 직접 확인해보세요
• 주요 재무비율을 직접 해석해보세요`;
            }
            
            return `재무제표 분석 중 오류가 발생했습니다: ${error.message}`;
        }
    }

    // 재무비율 상세 분석
    async analyzeFinancialRatios(ratios) {
        try {
            const prompt = `
다음 재무비율들을 분석해서 투자자에게 도움이 되는 설명을 해주세요:

- 부채비율: ${ratios.debtRatio}%
- 자기자본비율: ${ratios.equityRatio}%
- 순이익률: ${ratios.netProfitMargin}%
- 영업이익률: ${ratios.operatingProfitMargin}%
- ROE: ${ratios.roe || 0}%

각 비율이 무엇을 의미하는지, 현재 수치가 좋은지 나쁜지, 
일반 투자자가 이해하기 쉽게 설명해주세요.

## 📊 재무비율 분석

### 🔍 각 비율의 의미와 현재 상태
(각 비율별로 2-3문장씩 설명)

### 🎯 종합 평가
(전체적인 재무건전성과 수익성 평가)

### 💡 투자 관점
(이 비율들을 보고 투자 결정을 내릴 때 고려사항)

친근하고 이해하기 쉬운 톤으로 작성해주세요.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
            
        } catch (error) {
            console.error('재무비율 분석 오류:', error);
            
            // 쿼터 초과 에러 처리
            if (error.message.includes('429 Too Many Requests') || error.message.includes('quota')) {
                return `🤖 AI 분석 서비스가 일시적으로 사용량 한계에 도달했습니다.

📊 현재 상황:
• 무료 사용량 한계 초과
• 분당 요청 제한 또는 일일 요청 제한 도달

⏰ 해결 방법:
• 잠시 후(1-10분) 다시 시도해주세요
• 또는 내일 다시 시도해주세요

💡 대안:
• 재무제표 차트와 수치를 직접 확인해보세요
• 주요 재무비율을 직접 해석해보세요`;
            }
            
            return '재무비율 분석 중 오류가 발생했습니다.';
        }
    }

    // 손익계산서 분석
    async analyzeIncomeStatement(incomeStatement) {
        try {
            // incomeStatement가 없는 경우 처리
            if (!incomeStatement || !Array.isArray(incomeStatement)) {
                return '손익계산서 데이터가 없어 분석할 수 없습니다.';
            }
            
            // 주요 항목만 필터링
            const keyItems = incomeStatement.filter(item => 
                item.account_nm.includes('매출') || 
                item.account_nm.includes('영업이익') || 
                item.account_nm.includes('당기순이익') ||
                item.account_nm.includes('매출원가') ||
                item.account_nm.includes('판매비와관리비')
            ).slice(0, 10);

            const itemsText = keyItems.map(item => 
                `- ${item.account_nm}: ${this.formatCurrency(item.thstrm_amount)}원`
            ).join('\n');

            const prompt = `
다음은 손익계산서의 주요 항목들입니다:

${itemsText}

이 데이터를 바탕으로 회사의 수익 구조와 비용 구조를 분석해주세요.

## 📈 손익계산서 분석

### 💰 수익 구조
(매출 관련 항목들의 분석)

### 💸 비용 구조
(비용 관련 항목들의 분석)

### 📊 수익성 평가
(영업이익과 당기순이익을 중심으로 한 수익성 분석)

### 🔍 주목할 점
(특별히 주목해야 할 항목이나 트렌드)

일반 투자자도 이해할 수 있도록 쉽게 설명해주세요.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
            
        } catch (error) {
            console.error('손익계산서 분석 오류:', error);
            
            // 쿼터 초과 에러 처리
            if (error.message.includes('429 Too Many Requests') || error.message.includes('quota')) {
                return `🤖 AI 분석 서비스가 일시적으로 사용량 한계에 도달했습니다.

📊 현재 상황:
• 무료 사용량 한계 초과
• 분당 요청 제한 또는 일일 요청 제한 도달

⏰ 해결 방법:
• 잠시 후(1-10분) 다시 시도해주세요
• 또는 내일 다시 시도해주세요

💡 대안:
• 재무제표 차트와 수치를 직접 확인해보세요
• 주요 재무비율을 직접 해석해보세요`;
            }
            
            return '손익계산서 분석 중 오류가 발생했습니다.';
        }
    }

    // 간단 요약 분석
    async analyzeSimpleSummary(companyInfo, financialData) {
        try {
            const { metrics, ratios } = financialData;
            if (!metrics || !ratios) {
                return '재무 데이터가 충분하지 않아 간단 분석을 제공할 수 없습니다.';
            }
            const prompt = `
다음은 ${companyInfo.corp_name}의 주요 재무지표입니다. 핵심만 2~3문장으로 아주 간단하게 요약해 주세요.

- 총자산: ${this.formatCurrency(metrics.totalAssets)}원
- 총부채: ${this.formatCurrency(metrics.totalLiabilities)}원
- 자기자본: ${this.formatCurrency(metrics.totalEquity)}원
- 매출액: ${this.formatCurrency(metrics.revenue)}원
- 당기순이익: ${this.formatCurrency(metrics.netIncome)}원
- 부채비율: ${ratios.debtRatio}%
- 자기자본비율: ${ratios.equityRatio}%

전문 용어 없이, 투자자 입장에서 한눈에 파악할 수 있게 간단하게 써주세요.`;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('간단 분석 오류:', error);
            
            // 쿼터 초과 에러 처리
            if (error.message.includes('429 Too Many Requests') || error.message.includes('quota')) {
                return `🤖 AI 분석 서비스가 일시적으로 사용량 한계에 도달했습니다.

📊 현재 상황:
• 무료 사용량 한계 초과
• 분당 요청 제한 또는 일일 요청 제한 도달

⏰ 해결 방법:
• 잠시 후(1-10분) 다시 시도해주세요
• 또는 내일 다시 시도해주세요

💡 대안:
• 재무제표 차트와 수치를 직접 확인해보세요
• 주요 재무비율을 직접 해석해보세요`;
            }
            
            return '간단 분석 중 오류가 발생했습니다.';
        }
    }

    // 금액 포맷팅
    formatCurrency(amount) {
        if (amount === 0) return '0';
        const trillion = amount / 1000000000000;
        const billion = amount / 1000000000;
        if (trillion >= 1) {
            return trillion.toFixed(1) + '조';
        } else if (billion >= 1) {
            return billion.toFixed(1) + '억';
        } else {
            const million = amount / 1000000;
            if (million >= 1) {
                return million.toFixed(1) + '백만';
            }
            return amount.toLocaleString();
        }
    }
}

module.exports = GeminiAnalysis; 