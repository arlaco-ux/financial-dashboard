require('dotenv').config({ path: './config.env' });
const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// 환경 변수에서 API 키 가져오기
const OPEN_DART_API_KEY = process.env.OPEN_DART_API_KEY;
const OPEN_DART_BASE_URL = process.env.OPEN_DART_BASE_URL || 'https://opendart.fss.or.kr/api';

// API 키 확인
if (!OPEN_DART_API_KEY) {
    console.error('❌ OPEN_DART_API_KEY가 설정되지 않았습니다.');
    console.log('📝 config.env 파일에 실제 API 키를 입력해주세요.');
    process.exit(1);
}

// 회사코드 다운로드 함수
async function downloadCorpCode() {
    try {
        console.log('🚀 회사코드 파일 다운로드를 시작합니다...');
        console.log(`🌐 API URL: ${OPEN_DART_BASE_URL}/corpCode.xml`);
        
        // ZIP 파일 다운로드
        const response = await axios({
            method: 'GET',
            url: `${OPEN_DART_BASE_URL}/corpCode.xml`,
            params: {
                crtfc_key: OPEN_DART_API_KEY
            },
            responseType: 'arraybuffer', // 바이너리 데이터로 받기
            timeout: 60000 // 60초 타임아웃
        });

        // 응답이 XML 에러 메시지인지 확인
        const responseText = response.data.toString();
        if (responseText.includes('<?xml') && responseText.includes('<result>')) {
            console.error('❌ API 에러 응답을 받았습니다:');
            console.log(responseText);
            
            // 에러 코드별 메시지
            if (responseText.includes('010')) {
                console.error('🔑 등록되지 않은 인증키입니다. API 키를 확인해주세요.');
                console.error('💡 Open DART 웹사이트에서 API 키가 올바르게 등록되었는지 확인하세요.');
            } else if (responseText.includes('011')) {
                console.error('🔑 사용할 수 없는 키입니다. API 키 상태를 확인해주세요.');
            } else if (responseText.includes('012')) {
                console.error('🌐 접근할 수 없는 IP입니다. IP 등록을 확인해주세요.');
            } else if (responseText.includes('020')) {
                console.error('⏰ 요청 제한을 초과하였습니다. 잠시 후 다시 시도해주세요.');
            } else if (responseText.includes('800')) {
                console.error('🔧 시스템 점검 중입니다. 잠시 후 다시 시도해주세요.');
            }
            
            return;
        }

        console.log('✅ ZIP 파일 다운로드 완료');
        console.log(`📦 파일 크기: ${(response.data.length / 1024 / 1024).toFixed(2)} MB`);

        // 다운로드 폴더 생성
        const downloadDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
            console.log('📁 downloads 폴더 생성 완료');
        }

        // ZIP 파일 저장
        const zipPath = path.join(downloadDir, 'corpCode.zip');
        fs.writeFileSync(zipPath, response.data);
        console.log(`💾 ZIP 파일 저장 완료: ${zipPath}`);

        // ZIP 파일 압축 해제
        console.log('🔓 ZIP 파일 압축 해제 중...');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(downloadDir, true);
        console.log('✅ 압축 해제 완료');

        // XML 파일 찾기
        const files = fs.readdirSync(downloadDir);
        const xmlFile = files.find(file => file.endsWith('.xml'));
        
        if (xmlFile) {
            const xmlPath = path.join(downloadDir, xmlFile);
            const stats = fs.statSync(xmlPath);
            console.log(`📄 XML 파일 발견: ${xmlFile}`);
            console.log(`📊 XML 파일 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            
            // XML 파일 내용 일부 출력 (처음 1000자)
            const xmlContent = fs.readFileSync(xmlPath, 'utf8');
            console.log('\n📋 XML 파일 내용 미리보기:');
            console.log('─'.repeat(50));
            console.log(xmlContent.substring(0, 1000) + '...');
            console.log('─'.repeat(50));
            
            // 회사 수 계산 (간단한 방법)
            const companyCount = (xmlContent.match(/<list>/g) || []).length;
            console.log(`🏢 총 회사 수: ${companyCount.toLocaleString()}개`);
            
        } else {
            console.log('⚠️ XML 파일을 찾을 수 없습니다.');
        }

        // ZIP 파일 삭제 (선택사항)
        fs.unlinkSync(zipPath);
        console.log('🗑️ 원본 ZIP 파일 삭제 완료');

        console.log('\n🎉 회사코드 다운로드가 완료되었습니다!');
        console.log(`📂 파일 위치: ${downloadDir}`);
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        
        if (error.response) {
            console.error('📡 HTTP 상태 코드:', error.response.status);
            console.error('📡 응답 데이터:', error.response.data);
        }
        
        // 에러 코드별 메시지
        if (error.response && error.response.data) {
            const errorData = error.response.data.toString();
            if (errorData.includes('010')) {
                console.error('🔑 등록되지 않은 키입니다. API 키를 확인해주세요.');
            } else if (errorData.includes('011')) {
                console.error('🔑 사용할 수 없는 키입니다. API 키 상태를 확인해주세요.');
            } else if (errorData.includes('012')) {
                console.error('🌐 접근할 수 없는 IP입니다. IP 등록을 확인해주세요.');
            } else if (errorData.includes('020')) {
                console.error('⏰ 요청 제한을 초과하였습니다. 잠시 후 다시 시도해주세요.');
            } else if (errorData.includes('800')) {
                console.error('🔧 시스템 점검 중입니다. 잠시 후 다시 시도해주세요.');
            }
        }
    }
}

// 스크립트 실행
if (require.main === module) {
    downloadCorpCode();
}

module.exports = {
    downloadCorpCode
}; 