require('dotenv').config({ path: './config.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const CompanySearch = require('./companySearch');
const FinancialData = require('./financialData');
const GeminiAnalysis = require('./geminiAnalysis');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 회사 검색 및 재무 데이터 인스턴스 생성
const companySearch = new CompanySearch();
const financialData = new FinancialData();

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 회사 검색 API
app.get('/api/search-company', (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: '검색어를 입력해주세요.' });
        }

        const results = companySearch.searchByName(query);
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 재무제표 조회 API
app.get('/api/financial-statement', async (req, res) => {
    try {
        const { corpCode, bsnsYear, reportType } = req.query;
        
        if (!corpCode || !bsnsYear) {
            return res.status(400).json({ error: '회사코드와 사업연도를 입력해주세요.' });
        }

        const data = await financialData.getFinancialStatement(corpCode, bsnsYear, reportType || '사업보고서');
        const metrics = financialData.extractKeyMetrics(data);
        const ratios = financialData.calculateRatios(metrics);

        res.json({
            success: true,
            data: {
                ...data,
                metrics,
                ratios
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 회사 정보 조회 API
app.get('/api/company-info/:corpCode', (req, res) => {
    try {
        const { corpCode } = req.params;
        const company = companySearch.getCompanyByCode(corpCode);
        
        if (!company) {
            return res.status(404).json({ error: '회사를 찾을 수 없습니다.' });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 통계 정보 API
app.get('/api/stats', (req, res) => {
    try {
        const stats = companySearch.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 회사별 주가 데이터 API
app.get('/api/stock-price/:corpCode', async (req, res) => {
    try {
        const { corpCode } = req.params;
        console.log('📈 주가 데이터 조회 요청:', corpCode);
        
        // 회사 정보 조회
        const company = companySearch.getCompanyByCode(corpCode);
        if (!company) {
            return res.status(404).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
        }

        // 모의 주가 데이터 생성 (실제로는 외부 주가 API에서 가져올 수 있음)
        const generateStockData = (companyName, stockCode) => {
            const basePrice = stockCode === '005930' ? 75000 : 50000; // 삼성전자는 75000원 기준
            const dates = [];
            const prices = [];
            const volumes = [];
            
            // 최근 30일 데이터 생성
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(date.toISOString().split('T')[0]);
                
                // 랜덤한 주가 변동 생성 (±5% 범위)
                const randomChange = (Math.random() - 0.5) * 0.1; // -5% ~ +5%
                const price = Math.round(basePrice * (1 + randomChange * (i / 30)));
                prices.push(price);
                
                // 랜덤한 거래량 생성
                const volume = Math.floor(Math.random() * 1000000) + 100000;
                volumes.push(volume);
            }

            const currentPrice = prices[prices.length - 1];
            const previousPrice = prices[prices.length - 2];
            const change = currentPrice - previousPrice;
            const changePercent = ((change / previousPrice) * 100).toFixed(2);

            return {
                companyName,
                stockCode,
                currentPrice,
                change,
                changePercent,
                status: change >= 0 ? 'positive' : 'negative',
                chartData: {
                    dates,
                    prices,
                    volumes
                },
                marketCap: (currentPrice * 5800000000).toLocaleString(), // 가상의 시가총액
                high52w: Math.max(...prices),
                low52w: Math.min(...prices)
            };
        };

        const stockData = generateStockData(company.corp_name, company.stock_code);

        console.log('✅ 주가 데이터 조회 성공!');
        res.json({
            success: true,
            data: stockData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 주가 데이터 조회 오류:', error.message);
        res.status(500).json({
            success: false,
            error: '주가 데이터를 불러오는 중 오류가 발생했습니다.'
        });
    }
});

// Gemini AI 분석 API
app.get('/api/ai-analysis', async (req, res) => {
    try {
        const { corpCode, analysisType } = req.query;
        
        console.log('🤖 AI 분석 요청:', analysisType);
        console.log('🏢 회사코드:', corpCode);
        
        // 회사 정보 조회
        const companyInfo = companySearch.getCompanyByCode(corpCode);
        if (!companyInfo) {
            return res.status(404).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
        }
        
        // 최근 재무 데이터 조회 (2024년 사업보고서 기준)
        let rawFinancialData;
        try {
            rawFinancialData = await financialData.getFinancialStatement(corpCode, '2024', '사업보고서');
        } catch (error) {
            try {
                rawFinancialData = await financialData.getFinancialStatement(corpCode, '2023', '사업보고서');
            } catch (error) {
                try {
                    rawFinancialData = await financialData.getFinancialStatement(corpCode, '2022', '사업보고서');
                } catch (error) {
                    return res.status(400).json({ success: false, message: '재무 데이터를 찾을 수 없습니다. (2022-2024년 데이터 확인됨)' });
                }
            }
        }
        
        // metrics와 ratios 계산
        const metrics = financialData.extractKeyMetrics(rawFinancialData);
        const ratios = financialData.calculateRatios(metrics);
        
        // AI 분석용 데이터 구조 생성
        const analysisData = {
            ...rawFinancialData.data,
            metrics: metrics,
            ratios: ratios
        };
        
        // Gemini AI 분석
        const geminiAnalysis = new GeminiAnalysis();
        let analysisResult = '';
        
        switch (analysisType) {
            case 'comprehensive':
                analysisResult = await geminiAnalysis.analyzeFinancialStatement(companyInfo, analysisData);
                break;
            case 'ratios':
                analysisResult = await geminiAnalysis.analyzeFinancialRatios(ratios);
                break;
            case 'income':
                analysisResult = await geminiAnalysis.analyzeIncomeStatement(analysisData.incomeStatement);
                break;
            case 'simple':
                analysisResult = await geminiAnalysis.analyzeSimpleSummary(companyInfo, analysisData);
                break;
            default:
                return res.status(400).json({ success: false, message: '지원하지 않는 분석 유형입니다.' });
        }
        
        console.log('✅ AI 분석 완료!');
        res.json({ 
            success: true, 
            data: {
                analysis: analysisResult,
                companyInfo: companyInfo,
                analysisType: analysisType
            }
        });
        
    } catch (error) {
        console.error('AI 분석 오류:', error);
        res.status(500).json({ success: false, message: 'AI 분석 중 오류가 발생했습니다.' });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 재무제표 시각화 웹 애플리케이션이 시작되었습니다!`);
    console.log(`🌐 서버 주소: http://localhost:${PORT}`);
    console.log(`📊 API 엔드포인트:`);
    console.log(`   - 회사 검색: GET /api/search-company?query=회사명`);
    console.log(`   - 재무제표: GET /api/financial-statement?corpCode=코드&bsnsYear=연도&reportType=보고서`);
    console.log(`   - 회사 정보: GET /api/company-info/:corpCode`);
    console.log(`   - 통계 정보: GET /api/stats`);
});

module.exports = app; 