require('dotenv').config({ path: './config.env' });
const axios = require('axios');

// 재무제표 데이터 조회 클래스
class FinancialData {
    constructor() {
        this.API_KEY = process.env.OPEN_DART_API_KEY;
        this.BASE_URL = process.env.OPEN_DART_BASE_URL || 'https://opendart.fss.or.kr/api';
        
        if (!this.API_KEY) {
            throw new Error('OPEN_DART_API_KEY가 설정되지 않았습니다.');
        }
    }

    // 보고서 코드 매핑
    getReportCode(reportType) {
        const reportCodes = {
            '1분기보고서': '11013',
            '반기보고서': '11012',
            '3분기보고서': '11014',
            '사업보고서': '11011',
            '11013': '11013', // 1분기보고서
            '11012': '11012', // 반기보고서
            '11014': '11014', // 3분기보고서
            '11011': '11011'  // 사업보고서
        };
        return reportCodes[reportType] || '11011';
    }

    // 단일회사 주요계정 조회
    async getFinancialStatement(corpCode, bsnsYear, reportType = '사업보고서') {
        try {
            console.log(`📊 재무제표 조회 중...`);
            console.log(`🏢 회사코드: ${corpCode}`);
            console.log(`📅 사업연도: ${bsnsYear}`);
            console.log(`📋 보고서: ${reportType}`);

            const reportCode = this.getReportCode(reportType);
            
            const response = await axios.get(`${this.BASE_URL}/fnlttSinglAcnt.json`, {
                params: {
                    crtfc_key: this.API_KEY,
                    corp_code: corpCode,
                    bsns_year: bsnsYear,
                    reprt_code: reportCode
                },
                timeout: 30000
            });

            if (response.data.status === '000') {
                console.log('✅ 재무제표 조회 성공!');
                return this.processFinancialData(response.data);
            } else {
                throw new Error(`API 오류: ${response.data.status} - ${response.data.message}`);
            }

        } catch (error) {
            console.error('❌ 재무제표 조회 실패:', error.message);
            throw error;
        }
    }

    // 재무 데이터 처리 및 정리
    processFinancialData(data) {
        const processed = {
            summary: {
                totalItems: data.list ? data.list.length : 0,
                reportInfo: {
                    rcept_no: data.list?.[0]?.rcept_no || '',
                    bsns_year: data.list?.[0]?.bsns_year || '',
                    stock_code: data.list?.[0]?.stock_code || '',
                    reprt_code: data.list?.[0]?.reprt_code || ''
                }
            },
            balanceSheet: [], // 재무상태표
            incomeStatement: [], // 손익계산서
            cashFlow: [] // 현금흐름표
        };

        if (!data.list) {
            return processed;
        }

        data.list.forEach(item => {
            const financialItem = {
                account_nm: item.account_nm,
                fs_div: item.fs_div,
                fs_nm: item.fs_nm,
                sj_div: item.sj_div,
                sj_nm: item.sj_nm,
                thstrm_nm: item.thstrm_nm,
                thstrm_dt: item.thstrm_dt,
                thstrm_amount: this.parseAmount(item.thstrm_amount),
                thstrm_add_amount: this.parseAmount(item.thstrm_add_amount),
                frmtrm_nm: item.frmtrm_nm,
                frmtrm_dt: item.frmtrm_dt,
                frmtrm_amount: this.parseAmount(item.frmtrm_amount),
                frmtrm_add_amount: this.parseAmount(item.frmtrm_add_amount),
                bfefrmtrm_nm: item.bfefrmtrm_nm,
                bfefrmtrm_dt: item.bfefrmtrm_dt,
                bfefrmtrm_amount: this.parseAmount(item.bfefrmtrm_amount),
                ord: item.ord,
                currency: item.currency
            };

            // 재무제표 구분에 따라 분류
            switch (item.sj_div) {
                case 'BS': // 재무상태표
                    processed.balanceSheet.push(financialItem);
                    break;
                case 'IS': // 손익계산서
                    processed.incomeStatement.push(financialItem);
                    break;
                case 'CF': // 현금흐름표
                    processed.cashFlow.push(financialItem);
                    break;
            }
        });

        return processed;
    }

    // 금액 파싱 (문자열을 숫자로 변환)
    parseAmount(amountStr) {
        if (!amountStr || amountStr === '') return 0;
        
        // 쉼표 제거 후 숫자로 변환
        const cleanAmount = amountStr.replace(/,/g, '');
        const amount = parseFloat(cleanAmount);
        
        return isNaN(amount) ? 0 : amount;
    }

    // 주요 재무지표 추출
    extractKeyMetrics(financialData) {
        const metrics = {
            totalAssets: 0,
            totalLiabilities: 0,
            totalEquity: 0,
            revenue: 0,
            netIncome: 0,
            operatingIncome: 0,
            // 유동/비유동 자산/부채 추가
            currentAssets: 0,
            nonCurrentAssets: 0,
            currentLiabilities: 0,
            nonCurrentLiabilities: 0
        };

        // 재무상태표에서 자산, 부채, 자본 추출 (최대값 사용 - 최신/연결 기준)
        financialData.balanceSheet.forEach(item => {
            const accountName = item.account_nm.toLowerCase();
            
            // 총계 항목들
            if (accountName.includes('자산총계') || accountName.includes('자산 총계')) {
                metrics.totalAssets = Math.max(metrics.totalAssets, item.thstrm_amount);
            }
            if (accountName.includes('부채총계') || accountName.includes('부채 총계')) {
                metrics.totalLiabilities = Math.max(metrics.totalLiabilities, item.thstrm_amount);
            }
            if (accountName.includes('자본총계') || accountName.includes('자본 총계')) {
                metrics.totalEquity = Math.max(metrics.totalEquity, item.thstrm_amount);
            }
            
            // 유동/비유동 자산/부채 (독립적으로 체크)
            if (accountName.includes('유동자산')) {
                metrics.currentAssets = Math.max(metrics.currentAssets, item.thstrm_amount);
            }
            if (accountName.includes('비유동자산') || accountName.includes('고정자산')) {
                metrics.nonCurrentAssets = Math.max(metrics.nonCurrentAssets, item.thstrm_amount);
            }
            if (accountName.includes('유동부채')) {
                metrics.currentLiabilities = Math.max(metrics.currentLiabilities, item.thstrm_amount);
            }
            if (accountName.includes('비유동부채') || accountName.includes('고정부채')) {
                metrics.nonCurrentLiabilities = Math.max(metrics.nonCurrentLiabilities, item.thstrm_amount);
            }
        });

        // 손익계산서에서 매출, 순이익, 영업이익 추출
        financialData.incomeStatement.forEach(item => {
            const accountName = item.account_nm.toLowerCase();
            
            if (accountName.includes('매출') || accountName.includes('매출액')) {
                metrics.revenue = item.thstrm_amount;
            } else if (accountName.includes('당기순이익') || accountName.includes('순이익')) {
                metrics.netIncome = item.thstrm_amount;
            } else if (accountName.includes('영업이익')) {
                metrics.operatingIncome = item.thstrm_amount;
            }
        });

        return metrics;
    }

    // 재무비율 계산
    calculateRatios(metrics) {
        return {
            debtRatio: metrics.totalAssets > 0 ? (metrics.totalLiabilities / metrics.totalAssets * 100).toFixed(2) : 0,
            equityRatio: metrics.totalAssets > 0 ? (metrics.totalEquity / metrics.totalAssets * 100).toFixed(2) : 0,
            netProfitMargin: metrics.revenue > 0 ? (metrics.netIncome / metrics.revenue * 100).toFixed(2) : 0,
            operatingProfitMargin: metrics.revenue > 0 ? (metrics.operatingIncome / metrics.revenue * 100).toFixed(2) : 0,
            roe: metrics.totalEquity > 0 ? (metrics.netIncome / metrics.totalEquity * 100).toFixed(2) : 0
        };
    }
}

// 테스트 함수
async function testFinancialData() {
    try {
        const financialData = new FinancialData();
        
        // 삼성전자 2023년 사업보고서 조회
        const data = await financialData.getFinancialStatement('00126380', '2023', '사업보고서');
        
        console.log('\n📊 재무제표 요약:');
        console.log(`📋 총 항목 수: ${data.summary.totalItems}개`);
        console.log(`📅 사업연도: ${data.summary.reportInfo.bsns_year}`);
        console.log(`🏢 종목코드: ${data.summary.reportInfo.stock_code}`);
        
        console.log(`\n📈 재무상태표 항목 수: ${data.balanceSheet.length}개`);
        console.log(`📊 손익계산서 항목 수: ${data.incomeStatement.length}개`);
        console.log(`💰 현금흐름표 항목 수: ${data.cashFlow.length}개`);
        
        // 주요 재무지표 추출
        const metrics = financialData.extractKeyMetrics(data);
        const ratios = financialData.calculateRatios(metrics);
        
        console.log('\n🎯 주요 재무지표:');
        console.log(`💰 총자산: ${(metrics.totalAssets / 1000000000).toFixed(2)}십억원`);
        console.log(`💳 총부채: ${(metrics.totalLiabilities / 1000000000).toFixed(2)}십억원`);
        console.log(`🏦 총자본: ${(metrics.totalEquity / 1000000000).toFixed(2)}십억원`);
        console.log(`📈 매출액: ${(metrics.revenue / 1000000000).toFixed(2)}십억원`);
        console.log(`💵 당기순이익: ${(metrics.netIncome / 1000000000).toFixed(2)}십억원`);
        
        console.log('\n📊 재무비율:');
        console.log(`📉 부채비율: ${ratios.debtRatio}%`);
        console.log(`📈 자기자본비율: ${ratios.equityRatio}%`);
        console.log(`💰 순이익률: ${ratios.netProfitMargin}%`);
        console.log(`📊 영업이익률: ${ratios.operatingProfitMargin}%`);
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    }
}

// 모듈로 실행될 때만 테스트 실행
if (require.main === module) {
    testFinancialData();
}

module.exports = FinancialData; 