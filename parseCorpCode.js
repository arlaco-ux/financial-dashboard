require('dotenv').config({ path: './config.env' });
const fs = require('fs');
const path = require('path');

// XML을 파싱하여 회사 정보를 추출하는 함수
function parseCorpCodeXML(xmlContent) {
    const companies = [];
    
    // XML에서 <list> 태그들을 찾아서 회사 정보 추출
    const listMatches = xmlContent.match(/<list>([\s\S]*?)<\/list>/g);
    
    if (listMatches) {
        listMatches.forEach(listMatch => {
            const company = {};
            
            // corp_code 추출
            const corpCodeMatch = listMatch.match(/<corp_code>([^<]+)<\/corp_code>/);
            if (corpCodeMatch) company.corp_code = corpCodeMatch[1];
            
            // corp_name 추출
            const corpNameMatch = listMatch.match(/<corp_name>([^<]+)<\/corp_name>/);
            if (corpNameMatch) company.corp_name = corpNameMatch[1];
            
            // corp_eng_name 추출
            const corpEngNameMatch = listMatch.match(/<corp_eng_name>([^<]*)<\/corp_eng_name>/);
            if (corpEngNameMatch) company.corp_eng_name = corpEngNameMatch[1];
            
            // stock_code 추출
            const stockCodeMatch = listMatch.match(/<stock_code>([^<]*)<\/stock_code>/);
            if (stockCodeMatch) company.stock_code = stockCodeMatch[1];
            
            // modify_date 추출
            const modifyDateMatch = listMatch.match(/<modify_date>([^<]+)<\/modify_date>/);
            if (modifyDateMatch) company.modify_date = modifyDateMatch[1];
            
            companies.push(company);
        });
    }
    
    return companies;
}

// 회사코드 XML 파일을 JSON으로 변환하는 함수
function convertCorpCodeToJSON() {
    try {
        const downloadDir = path.join(__dirname, 'downloads');
        
        // XML 파일 찾기
        const files = fs.readdirSync(downloadDir);
        const xmlFile = files.find(file => file.endsWith('.xml'));
        
        if (!xmlFile) {
            console.error('❌ XML 파일을 찾을 수 없습니다. 먼저 회사코드를 다운로드해주세요.');
            return;
        }
        
        const xmlPath = path.join(downloadDir, xmlFile);
        console.log(`📄 XML 파일 읽는 중: ${xmlFile}`);
        
        // XML 파일 읽기
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        
        // XML 파싱
        console.log('🔍 XML 파싱 중...');
        const companies = parseCorpCodeXML(xmlContent);
        
        console.log(`✅ 총 ${companies.length.toLocaleString()}개 회사 정보 파싱 완료`);
        
        // JSON 파일로 저장
        const jsonPath = path.join(downloadDir, 'corpCode.json');
        fs.writeFileSync(jsonPath, JSON.stringify(companies, null, 2), 'utf8');
        
        console.log(`💾 JSON 파일 저장 완료: ${jsonPath}`);
        console.log(`📊 JSON 파일 크기: ${(fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2)} MB`);
        
        // 샘플 데이터 출력
        console.log('\n📋 샘플 회사 정보 (처음 5개):');
        console.log('─'.repeat(80));
        companies.slice(0, 5).forEach((company, index) => {
            console.log(`${index + 1}. ${company.corp_name} (${company.corp_code})`);
            console.log(`   종목코드: ${company.stock_code || 'N/A'}`);
            console.log(`   영문명: ${company.corp_eng_name || 'N/A'}`);
            console.log(`   수정일: ${company.modify_date}`);
            console.log('');
        });
        
        // 상장회사 통계
        const listedCompanies = companies.filter(company => company.stock_code && company.stock_code.trim() !== '');
        console.log(`📈 상장회사: ${listedCompanies.length.toLocaleString()}개`);
        console.log(`📊 비상장회사: ${(companies.length - listedCompanies.length).toLocaleString()}개`);
        
        return companies;
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

// 회사명으로 검색하는 함수
function searchCompanyByName(companyName) {
    try {
        const jsonPath = path.join(__dirname, 'downloads', 'corpCode.json');
        
        if (!fs.existsSync(jsonPath)) {
            console.error('❌ JSON 파일이 없습니다. 먼저 XML을 JSON으로 변환해주세요.');
            return;
        }
        
        const companies = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const searchResults = companies.filter(company => 
            company.corp_name && company.corp_name.includes(companyName)
        );
        
        console.log(`🔍 "${companyName}" 검색 결과: ${searchResults.length}개`);
        
        if (searchResults.length > 0) {
            searchResults.forEach((company, index) => {
                console.log(`${index + 1}. ${company.corp_name} (${company.corp_code})`);
                console.log(`   종목코드: ${company.stock_code || 'N/A'}`);
                console.log(`   영문명: ${company.corp_eng_name || 'N/A'}`);
                console.log(`   수정일: ${company.modify_date}`);
                console.log('');
            });
        }
        
        return searchResults;
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

// 스크립트 실행
if (require.main === module) {
    const command = process.argv[2];
    const searchTerm = process.argv[3];
    
    if (command === 'search' && searchTerm) {
        searchCompanyByName(searchTerm);
    } else {
        convertCorpCodeToJSON();
    }
}

module.exports = {
    parseCorpCodeXML,
    convertCorpCodeToJSON,
    searchCompanyByName
}; 