require('dotenv').config({ path: './config.env' });
const axios = require('axios');

// 환경 변수에서 API 키 가져오기
const OPEN_DART_API_KEY = process.env.OPEN_DART_API_KEY;
const OPEN_DART_BASE_URL = process.env.OPEN_DART_BASE_URL || 'https://opendart.fss.or.kr/api';

// API 키가 설정되어 있는지 확인
if (!OPEN_DART_API_KEY) {
    console.error('❌ OPEN_DART_API_KEY가 설정되지 않았습니다.');
    console.log('📝 config.env.example 파일을 config.env로 복사하고 실제 API 키를 입력해주세요.');
    process.exit(1);
}

console.log('✅ Open DART API 키가 성공적으로 로드되었습니다.');
console.log(`🌐 API Base URL: ${OPEN_DART_BASE_URL}`);

// Open DART API 호출 예시 함수
async function getCompanyInfo(corpCode) {
    try {
        const response = await axios.get(`${OPEN_DART_BASE_URL}/company.json`, {
            params: {
                crtfc_key: OPEN_DART_API_KEY,
                corp_code: corpCode
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('API 호출 중 오류 발생:', error.message);
        throw error;
    }
}

// 사용 예시
async function main() {
    try {
        console.log('🚀 Open DART API 테스트를 시작합니다...');
        
        // 예시: 삼성전자 회사 정보 조회 (실제 corp_code는 다를 수 있음)
        // const companyInfo = await getCompanyInfo('00126380');
        // console.log('회사 정보:', companyInfo);
        
        console.log('✅ 환경 변수 설정이 완료되었습니다!');
        console.log('📚 이제 Open DART API를 사용할 준비가 되었습니다.');
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = {
    getCompanyInfo,
    OPEN_DART_API_KEY,
    OPEN_DART_BASE_URL
}; 