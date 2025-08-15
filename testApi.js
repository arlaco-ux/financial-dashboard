require('dotenv').config({ path: './config.env' });
const axios = require('axios');

const OPEN_DART_API_KEY = process.env.OPEN_DART_API_KEY;
const OPEN_DART_BASE_URL = process.env.OPEN_DART_BASE_URL || 'https://opendart.fss.or.kr/api';

console.log('🔑 API 키 테스트를 시작합니다...');
console.log(`📝 API 키: ${OPEN_DART_API_KEY}`);
console.log(`🌐 Base URL: ${OPEN_DART_BASE_URL}`);

// 간단한 API 테스트 (회사개황 조회)
async function testApi() {
    try {
        console.log('\n🚀 API 테스트 중...');
        
        // 삼성전자 회사개황 조회 (corp_code: 00126380)
        const response = await axios.get(`${OPEN_DART_BASE_URL}/company.json`, {
            params: {
                crtfc_key: OPEN_DART_API_KEY,
                corp_code: '00126380'
            },
            timeout: 10000
        });
        
        console.log('✅ API 호출 성공!');
        console.log('📊 응답 데이터:', response.data);
        
    } catch (error) {
        console.error('❌ API 호출 실패:', error.message);
        
        if (error.response) {
            console.error('📡 HTTP 상태 코드:', error.response.status);
            console.error('📡 응답 데이터:', error.response.data);
        }
    }
}

testApi(); 