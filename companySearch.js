const fs = require('fs');
const path = require('path');

// 회사코드 JSON 파일에서 회사 검색
class CompanySearch {
    constructor() {
        this.companies = this.loadCompanies();
    }

    // 회사코드 JSON 파일 로드
    loadCompanies() {
        try {
            const jsonPath = path.join(__dirname, 'downloads', 'corpCode.json');
            if (!fs.existsSync(jsonPath)) {
                console.error('❌ corpCode.json 파일이 없습니다. 먼저 회사코드를 다운로드해주세요.');
                return [];
            }
            
            const data = fs.readFileSync(jsonPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ 회사코드 파일 로드 중 오류:', error.message);
            return [];
        }
    }

    // 회사명으로 검색
    searchByName(companyName) {
        if (!companyName || companyName.trim() === '') {
            return [];
        }

        const searchTerm = companyName.trim();
        const results = this.companies.filter(company => 
            company.corp_name && 
            company.corp_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // 상장회사 우선 정렬
        results.sort((a, b) => {
            const aListed = a.stock_code && a.stock_code.trim() !== '';
            const bListed = b.stock_code && b.stock_code.trim() !== '';
            
            if (aListed && !bListed) return -1;
            if (!aListed && bListed) return 1;
            return 0;
        });

        return results.slice(0, 20); // 최대 20개 결과
    }

    // 회사코드로 회사 정보 조회
    getCompanyByCode(corpCode) {
        return this.companies.find(company => company.corp_code === corpCode);
    }

    // 상장회사만 조회
    getListedCompanies() {
        return this.companies.filter(company => 
            company.stock_code && company.stock_code.trim() !== ''
        );
    }

    // 통계 정보
    getStats() {
        const total = this.companies.length;
        const listed = this.getListedCompanies().length;
        const unlisted = total - listed;
        
        return {
            total,
            listed,
            unlisted,
            lastUpdate: this.companies.length > 0 ? this.companies[0].modify_date : null
        };
    }
}

// 테스트 함수
function testCompanySearch() {
    const search = new CompanySearch();
    
    console.log('🔍 회사 검색 테스트');
    console.log('─'.repeat(50));
    
    // 통계 정보
    const stats = search.getStats();
    console.log(`📊 총 회사 수: ${stats.total.toLocaleString()}개`);
    console.log(`📈 상장회사: ${stats.listed.toLocaleString()}개`);
    console.log(`📊 비상장회사: ${stats.unlisted.toLocaleString()}개`);
    console.log(`📅 최종 업데이트: ${stats.lastUpdate}`);
    
    console.log('\n🔍 "삼성전자" 검색 결과:');
    const results = search.searchByName('삼성전자');
    results.forEach((company, index) => {
        console.log(`${index + 1}. ${company.corp_name} (${company.corp_code})`);
        console.log(`   종목코드: ${company.stock_code || 'N/A'}`);
        console.log(`   영문명: ${company.corp_eng_name || 'N/A'}`);
        console.log('');
    });
}

// 모듈로 실행될 때만 테스트 실행
if (require.main === module) {
    testCompanySearch();
}

module.exports = CompanySearch; 