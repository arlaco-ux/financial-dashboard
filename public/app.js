// 전역 변수
let selectedCompany = null;
let currentCharts = {};

// DOM 요소
const companySearch = document.getElementById('companySearch');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const selectedCompanyDiv = document.getElementById('selectedCompany');
const companyInfo = document.getElementById('companyInfo');
const loadFinancialBtn = document.getElementById('loadFinancialBtn');
const loading = document.getElementById('loading');
const financialMetrics = document.getElementById('financialMetrics');
const metricsRow = document.getElementById('metricsRow');
const yearSelector = document.getElementById('yearSelector');
const reloadBtn = document.getElementById('reloadBtn');

// 이벤트 리스너
searchBtn.addEventListener('click', searchCompany);
companySearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCompany();
});

// 실시간 자동완성 기능
companySearch.addEventListener('input', debounce(handleRealTimeSearch, 300));
companySearch.addEventListener('focus', handleSearchFocus);
companySearch.addEventListener('blur', handleSearchBlur);

loadFinancialBtn.addEventListener('click', loadFinancialData);

// 결과 화면에서 연도 변경 조회 버튼
reloadBtn.addEventListener('click', reloadFinancialData);

// 디바운스 함수 (너무 빈번한 검색 방지)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 회사 검색 함수
async function searchCompany() {
    const query = companySearch.value.trim();
    if (!query) {
        alert('회사명을 입력해주세요.');
        return;
    }

    showLoading(true);
    
    try {
        const response = await fetch(`/api/search-company?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.data);
        } else {
            alert('검색 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('검색 오류:', error);
        alert('검색 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

// 검색 결과 표시
function displaySearchResults(companies) {
    if (companies.length === 0) {
        searchResults.innerHTML = '<div class="alert alert-info">검색 결과가 없습니다.</div>';
        return;
    }

    const resultsHtml = companies.map(company => `
        <div class="company-card" onclick="selectCompany('${company.corp_code}')" style="cursor: pointer;">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1" style="color: var(--primary-blue); font-weight: 600;">
                        ${company.corp_name}
                    </h6>
                    <div style="display: flex; gap: 15px; margin-top: 5px;">
                        <small class="text-muted">
                            <i class="fas fa-building"></i> ${company.corp_code}
                        </small>
                        ${company.stock_code ? `
                            <small style="color: #10b981; font-weight: 500;">
                                <i class="fas fa-chart-line"></i> ${company.stock_code}
                            </small>
                        ` : ''}
                    </div>
                </div>
                <div class="text-end">
                    <small class="text-muted" style="font-size: 11px;">
                        ${company.corp_eng_name || ''}
                    </small>
                </div>
            </div>
        </div>
    `).join('');

    searchResults.innerHTML = resultsHtml;
}

// 실시간 검색 처리
async function handleRealTimeSearch() {
    const query = companySearch.value.trim();
    if (!query || query.length < 1) {
        searchResults.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/api/search-company?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            displaySearchResults(data.data.slice(0, 8)); // 최대 8개만 표시
        } else {
            searchResults.innerHTML = '<div class="alert alert-info" style="font-size: 14px; padding: 10px;">검색 결과가 없습니다.</div>';
        }
    } catch (error) {
        console.error('실시간 검색 오류:', error);
        searchResults.innerHTML = '<div class="alert alert-danger" style="font-size: 14px; padding: 10px;">검색 중 오류가 발생했습니다.</div>';
    }
}

// 검색창 포커스 처리
function handleSearchFocus() {
    const query = companySearch.value.trim();
    if (query && query.length >= 1) {
        handleRealTimeSearch();
    }
}

// 검색창 블러 처리 (약간의 지연을 두어 클릭 이벤트가 먼저 실행되도록)
function handleSearchBlur() {
    setTimeout(() => {
        // 마우스가 검색 결과 영역에 있는지 확인
        if (!searchResults.matches(':hover')) {
            searchResults.innerHTML = '';
        }
    }, 200);
}

// 회사 선택 - 바로 2024년 재무제표 조회
async function selectCompany(corpCode) {
    showLoading(true);
    
    try {
        const response = await fetch(`/api/company-info/${corpCode}`);
        const data = await response.json();
        
        if (data.success) {
            selectedCompany = data.data;
            displaySelectedCompany(selectedCompany);
            selectedCompanyDiv.classList.remove('d-none');
            
            // 탭 네비게이션 표시
            document.getElementById('tabNavigation').classList.remove('d-none');
            
            // 재무제표 분석 탭으로 자동 이동
            const financialTab = new bootstrap.Tab(document.getElementById('financial-tab'));
            financialTab.show();
            
            // 기본값 설정 (2024년, 사업보고서)
            document.getElementById('bsnsYear').value = '2024';
            document.getElementById('reportType').value = '사업보고서';
            
            // 바로 재무제표 조회 실행
            await loadFinancialData();
            
        } else {
            alert('회사 정보를 불러오는 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('회사 정보 조회 오류:', error);
        alert('회사 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

// 선택된 회사 정보 표시
function displaySelectedCompany(company) {
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            // YYYYMMDD 형식인 경우 처리
            if (typeof dateStr === 'string' && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            // 일반적인 날짜 형식 처리
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // 파싱 실패시 원본 반환
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.log('날짜 파싱 오류:', dateStr, error);
            return dateStr || '-';
        }
    };

    // 상장회사 여부에 따른 레이아웃 결정
    const hasStockCode = company.stock_code && company.stock_code.trim() !== '';
    const colClass = hasStockCode ? 'col-md-4' : 'col-md-6';

    companyInfo.innerHTML = `
        <!-- 메인 회사 정보 -->
        <div style="display: flex; align-items: flex-start; margin-bottom: 30px;">
            <!-- 회사 로고/아이콘 -->
            <div style="
                background: rgba(255, 255, 255, 0.25);
                border-radius: 20px;
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 25px;
                font-size: 32px;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
                flex-shrink: 0;
            ">
                <i class="fas fa-building"></i>
            </div>
            
            <!-- 회사명 및 기본 정보 -->
            <div style="flex: 1; min-width: 0;">
                <div style="margin-bottom: 15px;">
                    <h1 style="
                        margin: 0; 
                        font-weight: 800; 
                        font-size: 32px; 
                        line-height: 1.2;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    ">
                        ${company.corp_name}
                    </h1>
                    ${company.corp_eng_name ? `
                        <div style="
                            font-size: 16px; 
                            opacity: 0.9; 
                            font-weight: 300;
                            margin-top: 8px;
                            letter-spacing: 0.5px;
                        ">
                            ${company.corp_eng_name}
                        </div>
                    ` : ''}
                </div>
                
                <!-- 상태 배지 -->
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <div style="
                        background: rgba(255, 255, 255, 0.2);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 25px;
                        padding: 8px 16px;
                        font-size: 13px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <i class="fas fa-chart-line" style="font-size: 12px;"></i>
                        분석 준비 완료
                    </div>
                    ${hasStockCode ? `
                        <div style="
                            background: rgba(16, 249, 129, 0.2);
                            border: 1px solid rgba(16, 249, 129, 0.4);
                            border-radius: 25px;
                            padding: 8px 16px;
                            font-size: 13px;
                            font-weight: 600;
                            color: #10f981;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <i class="fas fa-certificate" style="font-size: 12px;"></i>
                            상장회사
                        </div>
                    ` : `
                        <div style="
                            background: rgba(156, 163, 175, 0.2);
                            border: 1px solid rgba(156, 163, 175, 0.4);
                            border-radius: 25px;
                            padding: 8px 16px;
                            font-size: 13px;
                            font-weight: 600;
                            color: #9ca3af;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <i class="fas fa-building" style="font-size: 12px;"></i>
                            비상장회사
                        </div>
                    `}
                </div>
            </div>
        </div>
        
        <!-- 상세 정보 카드들 -->
        <div style="
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px;
            margin-top: 25px;
        ">
            <!-- 회사코드 -->
            <div style="
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                transition: transform 0.2s ease;
                backdrop-filter: blur(10px);
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="
                    font-size: 13px; 
                    opacity: 0.8; 
                    margin-bottom: 8px; 
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">
                    <i class="fas fa-id-card"></i> Company Code
                </div>
                <div style="font-weight: 700; font-size: 18px;">
                    ${company.corp_code}
                </div>
            </div>
            
            ${hasStockCode ? `
                <!-- 종목코드 -->
                <div style="
                    background: rgba(255, 255, 255, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 15px;
                    padding: 20px;
                    text-align: center;
                    transition: transform 0.2s ease;
                    backdrop-filter: blur(10px);
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="
                        font-size: 13px; 
                        opacity: 0.8; 
                        margin-bottom: 8px; 
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">
                        <i class="fas fa-chart-line"></i> Stock Code
                    </div>
                    <div style="font-weight: 700; font-size: 18px; color: #10f981;">
                        ${company.stock_code}
                    </div>
                </div>
            ` : ''}
            
            <!-- 최종수정일 -->
            <div style="
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                transition: transform 0.2s ease;
                backdrop-filter: blur(10px);
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="
                    font-size: 13px; 
                    opacity: 0.8; 
                    margin-bottom: 8px; 
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">
                    <i class="fas fa-calendar"></i> Last Updated
                </div>
                <div style="font-weight: 700; font-size: 18px;">
                    ${formatDate(company.modify_date)}
                </div>
            </div>
        </div>
    `;
}

// 재무제표 데이터 로드
async function loadFinancialData() {
    if (!selectedCompany) {
        alert('회사를 먼저 선택해주세요.');
        return;
    }

    const bsnsYear = document.getElementById('bsnsYear').value;
    const reportType = document.getElementById('reportType').value;

    showLoading(true);
    
    try {
        const response = await fetch(`/api/financial-statement?corpCode=${selectedCompany.corp_code}&bsnsYear=${bsnsYear}&reportType=${encodeURIComponent(reportType)}`);
        const data = await response.json();
        
        if (data.success) {
            displayFinancialData(data.data);
        } else {
            alert('재무제표 데이터를 불러오는 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('재무제표 조회 오류:', error);
        alert('재무제표 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

// 재무 데이터 표시
function displayFinancialData(data) {
    // 기존 차트 제거
    destroyCharts();
    
    // 연도 선택기 표시 및 값 동기화
    yearSelector.classList.remove('d-none');
    document.getElementById('resultBsnsYear').value = document.getElementById('bsnsYear').value;
    document.getElementById('resultReportType').value = document.getElementById('reportType').value;
    
    // 메트릭 카드 표시
    displayMetrics(data.metrics, data.ratios);
    
    // 차트 생성
    createRatioChart(data.ratios);
    createRadarChart(data.ratios);
    createBalanceSheetChart(data.metrics);
    createIncomeChart(data.incomeStatement);
    loadCompanyStock(selectedCompany.corp_code);
    
    // 재무비율 추이 차트를 위한 3개년 데이터 로드
    loadMultiYearRatioData(data.ratios);
    
    financialMetrics.classList.remove('d-none');
}

// 결과 화면에서 연도 변경하여 재조회
async function reloadFinancialData() {
    if (!selectedCompany) {
        alert('회사를 먼저 선택해주세요.');
        return;
    }

    const bsnsYear = document.getElementById('resultBsnsYear').value;
    const reportType = document.getElementById('resultReportType').value;
    
    // 원본 select box도 동기화
    document.getElementById('bsnsYear').value = bsnsYear;
    document.getElementById('reportType').value = reportType;

    showLoading(true);
    
    try {
        // 기존 차트들을 먼저 안전하게 제거
        destroyCharts();
        
        const response = await fetch(`/api/financial-statement?corpCode=${selectedCompany.corp_code}&bsnsYear=${bsnsYear}&reportType=${encodeURIComponent(reportType)}`);
        const data = await response.json();
        
        if (data.success) {
            displayFinancialData(data.data);
        } else {
            console.error('API 응답 오류:', data);
            alert(`재무제표 데이터를 불러오는 중 오류가 발생했습니다: ${data.message || '알 수 없는 오류'}`);
        }
    } catch (error) {
        console.error('재무제표 조회 오류:', error);
        alert(`재무제표 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// 메트릭 카드 표시
function displayMetrics(metrics, ratios) {
    const metricsData = [
        { label: '총자산', value: formatCurrency(metrics.totalAssets), color: '#2563eb' },
        { label: '총부채', value: formatCurrency(metrics.totalLiabilities), color: '#3b82f6' },
        { label: '총자본', value: formatCurrency(metrics.totalEquity), color: '#60a5fa' },
        { label: '매출액', value: formatCurrency(metrics.revenue), color: '#1e40af' },
        { label: '당기순이익', value: formatCurrency(metrics.netIncome), color: '#1d4ed8' },
        { label: '부채비율', value: ratios.debtRatio + '%', color: '#2563eb' }
    ];

    metricsRow.innerHTML = metricsData.map(metric => `
        <div class="col-md-4 col-lg-2">
            <div class="metric-card">
                <div class="metric-value" style="color: ${metric.color}">${metric.value}</div>
                <div class="metric-label">${metric.label}</div>
            </div>
        </div>
    `).join('');
}

// 회사 주가 데이터 로드
async function loadCompanyStock(corpCode) {
    const stockContainer = document.getElementById('newsContainer');
    
    try {
        const response = await fetch(`/api/stock-price/${corpCode}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            displayCompanyStock(data.data, data.timestamp);
        } else {
            stockContainer.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-info-circle"></i>
                    <p class="mt-2">주가 정보를 불러올 수 없습니다.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('주가 데이터 로드 오류:', error);
        stockContainer.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-exclamation-triangle"></i>
                <p class="mt-2">주가 데이터를 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `;
    }
}

// 회사 주가 정보 표시
function displayCompanyStock(stockData, timestamp) {
    const stockContainer = document.getElementById('newsContainer');
    
    const updateTime = new Date(timestamp).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const isPositive = stockData.status === 'positive';
    const changeColor = isPositive ? '#10b981' : '#ef4444';
    const changeIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    
    const stockHtml = `
        <div style="padding: 15px;">
            <!-- 주가 헤더 -->
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                    <h6 style="margin: 0; color: var(--text-primary); font-weight: 600; font-size: 16px;">
                        ${stockData.companyName}
                    </h6>
                    <small style="color: var(--text-secondary); font-size: 11px;">
                        <i class="fas fa-clock"></i> ${updateTime}
                    </small>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                    ${stockData.stockCode || 'N/A'}
                </div>
                
                <!-- 현재 주가 -->
                <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 15px;">
                    <span style="font-size: 24px; font-weight: bold; color: var(--primary-blue);">
                        ${stockData.currentPrice.toLocaleString()}원
                    </span>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: ${changeColor}; font-weight: 600; font-size: 14px;">
                            <i class="fas ${changeIcon}"></i>
                            ${Math.abs(stockData.change).toLocaleString()}원
                        </span>
                        <span style="color: ${changeColor}; font-weight: 600; font-size: 14px;">
                            (${stockData.changePercent}%)
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- 주가 차트 -->
            <div style="margin-bottom: 15px;">
                <canvas id="stockChart" style="width: 100%; height: 200px;"></canvas>
            </div>
            
            <!-- 주요 정보 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                <div style="padding: 8px; background: var(--lighter-blue); border-radius: 6px;">
                    <div style="color: var(--text-secondary); margin-bottom: 2px;">52주 최고</div>
                    <div style="color: var(--text-primary); font-weight: 600;">
                        ${stockData.high52w.toLocaleString()}원
                    </div>
                </div>
                <div style="padding: 8px; background: var(--lighter-blue); border-radius: 6px;">
                    <div style="color: var(--text-secondary); margin-bottom: 2px;">52주 최저</div>
                    <div style="color: var(--text-primary); font-weight: 600;">
                        ${stockData.low52w.toLocaleString()}원
                    </div>
                </div>
                <div style="padding: 8px; background: var(--lighter-blue); border-radius: 6px; grid-column: 1 / -1;">
                    <div style="color: var(--text-secondary); margin-bottom: 2px;">시가총액</div>
                    <div style="color: var(--text-primary); font-weight: 600;">
                        ${stockData.marketCap}원
                    </div>
                </div>
            </div>
        </div>
    `;
    
    stockContainer.innerHTML = stockHtml;
    
    // 주가 차트 생성
    createStockChart(stockData.chartData);
}

// 주가 차트 생성
function createStockChart(chartData) {
    const ctx = document.getElementById('stockChart');
    
    // 기존 차트가 있다면 제거
    if (currentCharts.stock) {
        currentCharts.stock.destroy();
    }
    
    currentCharts.stock = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.dates.map(date => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: [{
                label: '주가',
                data: chartData.prices,
                borderColor: 'rgba(37, 99, 235, 1)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: 'rgba(37, 99, 235, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#1e293b',
                    borderColor: 'rgba(37, 99, 235, 0.2)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(chartData.dates[context[0].dataIndex]);
                            return date.toLocaleDateString('ko-KR');
                        },
                        label: function(context) {
                            return `주가: ${context.parsed.y.toLocaleString()}원`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 7,
                        color: '#64748b',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    display: true,
                    position: 'right',
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return value.toLocaleString() + '원';
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// 재무비율 차트 (개별 게이지 형태)
function createRatioChart(ratios) {
    const container = document.getElementById('ratioChart').parentElement;
    
    // 캔버스 대신 div로 교체
    container.innerHTML = `
        <h5><i class="fas fa-chart-doughnut"></i> 재무비율 현황</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 20px;">
            <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.05)); border-radius: 10px; border: 2px solid rgba(37, 99, 235, 0.2);">
                <div style="font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px;">${ratios.debtRatio}%</div>
                <div style="font-size: 14px; color: #64748b;">부채비율</div>
                <div style="width: 100%; background: rgba(226, 232, 240, 0.5); border-radius: 10px; height: 8px; margin-top: 8px;">
                    <div style="width: ${Math.min(parseFloat(ratios.debtRatio), 100)}%; background: #2563eb; height: 100%; border-radius: 10px; transition: width 0.3s ease;"></div>
                </div>
            </div>
            
            <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05)); border-radius: 10px; border: 2px solid rgba(59, 130, 246, 0.2);">
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 5px;">${ratios.equityRatio}%</div>
                <div style="font-size: 14px; color: #64748b;">자기자본비율</div>
                <div style="width: 100%; background: rgba(226, 232, 240, 0.5); border-radius: 10px; height: 8px; margin-top: 8px;">
                    <div style="width: ${Math.min(parseFloat(ratios.equityRatio), 100)}%; background: #3b82f6; height: 100%; border-radius: 10px; transition: width 0.3s ease;"></div>
                </div>
            </div>
            
            <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(96, 165, 250, 0.05)); border-radius: 10px; border: 2px solid rgba(96, 165, 250, 0.2);">
                <div style="font-size: 24px; font-weight: bold; color: #60a5fa; margin-bottom: 5px;">${ratios.netProfitMargin}%</div>
                <div style="font-size: 14px; color: #64748b;">순이익률</div>
                <div style="width: 100%; background: rgba(226, 232, 240, 0.5); border-radius: 10px; height: 8px; margin-top: 8px;">
                    <div style="width: ${Math.min(Math.max(parseFloat(ratios.netProfitMargin), 0), 100)}%; background: #60a5fa; height: 100%; border-radius: 10px; transition: width 0.3s ease;"></div>
                </div>
            </div>
            
            <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(30, 64, 175, 0.05)); border-radius: 10px; border: 2px solid rgba(30, 64, 175, 0.2);">
                <div style="font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px;">${ratios.operatingProfitMargin}%</div>
                <div style="font-size: 14px; color: #64748b;">영업이익률</div>
                <div style="width: 100%; background: rgba(226, 232, 240, 0.5); border-radius: 10px; height: 8px; margin-top: 8px;">
                    <div style="width: ${Math.min(Math.max(parseFloat(ratios.operatingProfitMargin), 0), 100)}%; background: #1e40af; height: 100%; border-radius: 10px; transition: width 0.3s ease;"></div>
                </div>
            </div>
        </div>
    `;
}

// 5각형 레이더 차트 (재무비율)
function createRadarChart(ratios) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    console.log('레이더 차트 데이터:', ratios);
    
    const radarData = [
        parseFloat(ratios.debtRatio),
        parseFloat(ratios.equityRatio),
        parseFloat(ratios.netProfitMargin),
        parseFloat(ratios.operatingProfitMargin),
        parseFloat(ratios.roe || 0)
    ];
    
    console.log('레이더 차트 파싱된 데이터:', radarData);
    
    currentCharts.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['부채비율', '자기자본비율', '순이익률', '영업이익률', 'ROE'],
            datasets: [{
                label: '재무비율 (%)',
                data: radarData,
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(37, 99, 235, 1)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// 손익계산서 차트 (개별 카드 형태)
function createIncomeChart(incomeStatement) {
    // 주요 항목만 필터링
    const keyItems = incomeStatement.filter(item => 
        item.account_nm.includes('매출') || 
        item.account_nm.includes('영업이익') || 
        item.account_nm.includes('당기순이익') ||
        item.account_nm.includes('매출원가') ||
        item.account_nm.includes('판매비와관리비')
    ).slice(0, 8);

    const container = document.getElementById('incomeChart');
    
    // 항목별 색상 정의 (푸른색 계열 통일)
    const getItemColor = (accountName) => {
        if (accountName.includes('매출') && !accountName.includes('원가')) {
            return { bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.3)', text: '#2563eb' }; // 진한 파란색 (수익)
        } else if (accountName.includes('영업이익')) {
            return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' }; // 중간 파란색
        } else if (accountName.includes('당기순이익')) {
            return { bg: 'rgba(96, 165, 250, 0.1)', border: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa' }; // 밝은 파란색
        } else if (accountName.includes('매출원가') || accountName.includes('판매비') || accountName.includes('관리비')) {
            return { bg: 'rgba(30, 64, 175, 0.1)', border: 'rgba(30, 64, 175, 0.3)', text: '#1e40af' }; // 어두운 파란색 (비용)
        } else {
            return { bg: 'rgba(29, 78, 216, 0.1)', border: 'rgba(29, 78, 216, 0.3)', text: '#1d4ed8' }; // 진한 파란색 (기타)
        }
    };
    
    // 금액 포맷팅 함수
    const formatAmount = (amount) => {
        const trillion = Math.abs(amount) / 1000000000000;
        const billion = Math.abs(amount) / 100000000;
        
        if (trillion >= 1) {
            return (amount / 1000000000000).toFixed(1) + '조원';
        } else if (billion >= 1) {
            return (amount / 100000000).toFixed(1) + '억원';
        } else {
            const million = Math.abs(amount) / 1000000;
            if (million >= 1) {
                return (amount / 1000000).toFixed(1) + '백만원';
            }
            return amount.toLocaleString() + '원';
        }
    };
    
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; padding: 15px;">
            ${keyItems.map(item => {
                const colors = getItemColor(item.account_nm);
                const amount = item.thstrm_amount;
                const isNegative = amount < 0;
                
                return `
                    <div style="
                        background: ${colors.bg}; 
                        border: 2px solid ${colors.border}; 
                        border-radius: 10px; 
                        padding: 15px; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        transition: transform 0.2s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: ${colors.text}; font-size: 14px; margin-bottom: 4px;">
                                ${item.account_nm}
                            </div>
                            <div style="font-size: 12px; color: #64748b;">
                                ${item.thstrm_dt ? item.thstrm_dt + ' 기준' : '당기'}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="
                                font-size: 18px; 
                                font-weight: bold; 
                                color: ${isNegative ? '#e74c3c' : colors.text};
                            ">
                                ${isNegative ? '-' : ''}${formatAmount(Math.abs(amount))}
                            </div>
                            <div style="font-size: 11px; color: #64748b;">
                                ${amount.toLocaleString()}원
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// 다중 연도 재무비율 데이터 로드
async function loadMultiYearRatioData(currentRatios) {
    const currentYear = parseInt(document.getElementById('bsnsYear').value);
    const reportType = document.getElementById('reportType').value;
    
    // 과거 3개년 데이터 로드 (현재 연도 포함)
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const multiYearData = [];
    
    for (const year of years) {
        try {
            const response = await fetch(`/api/financial-statement?corpCode=${selectedCompany.corp_code}&bsnsYear=${year}&reportType=${reportType}`);
            const data = await response.json();
            
            if (data.success) {
                multiYearData.push({
                    year: year.toString(),
                    ratios: data.data.ratios
                });
            } else {
                // 데이터가 없으면 0으로 채움
                multiYearData.push({
                    year: year.toString(),
                    ratios: { debtRatio: '0', equityRatio: '0', netProfitMargin: '0', operatingProfitMargin: '0', roe: '0' }
                });
            }
        } catch (error) {
            console.error(`${year}년 데이터 로드 실패:`, error);
            // 에러 시에도 0으로 채움
            multiYearData.push({
                year: year.toString(),
                ratios: { debtRatio: '0', equityRatio: '0', netProfitMargin: '0', operatingProfitMargin: '0', roe: '0' }
            });
        }
    }
    
    console.log('3개년 재무비율 데이터:', multiYearData);
    
    // 추이 차트 생성
    createRatioTrendChart(multiYearData);
}

// 재무비율 추이 차트 (파스텔톤)
function createRatioTrendChart(multiYearData) {
    const ctx = document.getElementById('ratioTrendChart').getContext('2d');
    
    const years = multiYearData.map(item => item.year + '년');
    const debtRatios = multiYearData.map(item => parseFloat(item.ratios.debtRatio));
    const equityRatios = multiYearData.map(item => parseFloat(item.ratios.equityRatio));
    const netProfitMargins = multiYearData.map(item => parseFloat(item.ratios.netProfitMargin));
    const operatingProfitMargins = multiYearData.map(item => parseFloat(item.ratios.operatingProfitMargin));
    
    currentCharts.ratioTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: '부채비율 (%)',
                    data: debtRatios,
                    borderColor: 'rgba(37, 99, 235, 1)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.2
                },
                {
                    label: '자기자본비율 (%)',
                    data: equityRatios,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.2
                },
                {
                    label: '순이익률 (%)',
                    data: netProfitMargins,
                    borderColor: 'rgba(96, 165, 250, 1)',
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.2
                },
                {
                    label: '영업이익률 (%)',
                    data: operatingProfitMargins,
                    borderColor: 'rgba(30, 64, 175, 1)',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// 재무상태표 차트 (차변/대변 형태)
function createBalanceSheetChart(metrics) {
    const container = document.getElementById('balanceSheetChart');
    
    // 금액을 조원 단위로 변환
    const currentAssets = metrics.currentAssets / 1000000000000;
    const nonCurrentAssets = metrics.nonCurrentAssets / 1000000000000;
    const currentLiabilities = metrics.currentLiabilities / 1000000000000;
    const nonCurrentLiabilities = metrics.nonCurrentLiabilities / 1000000000000;
    const equity = metrics.totalEquity / 1000000000000;
    
    const totalAssets = currentAssets + nonCurrentAssets;
    const totalLiabilitiesAndEquity = currentLiabilities + nonCurrentLiabilities + equity;
    
    container.innerHTML = `
        <div style="flex: 1; padding: 10px; border: 2px solid #2563eb; border-radius: 10px; margin: 5px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);">
            <h6 style="text-align: center; color: white; margin-bottom: 15px; font-weight: bold;">자산 (차변)</h6>
            <div style="background: rgba(255,255,255,0.95); padding: 15px; border-radius: 8px; height: 250px; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="background: rgba(37, 99, 235, 0.9); padding: 12px; border-radius: 6px; text-align: center; flex: ${currentAssets/totalAssets}; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: bold; color: white;">유동자산</div>
                        <div style="font-size: 14px; color: white;">${currentAssets.toFixed(1)}조원</div>
                    </div>
                </div>
                <div style="background: rgba(59, 130, 246, 0.9); padding: 12px; border-radius: 6px; text-align: center; flex: ${nonCurrentAssets/totalAssets}; display: flex; align-items: center; justify-content: center;">
                    <div>
                        <div style="font-weight: bold; color: white;">비유동자산</div>
                        <div style="font-size: 14px; color: white;">${nonCurrentAssets.toFixed(1)}조원</div>
                    </div>
                </div>
            </div>
            <div style="text-align: center; color: white; margin-top: 10px; font-weight: bold;">총 ${totalAssets.toFixed(1)}조원</div>
        </div>
        
        <div style="flex: 1; padding: 10px; border: 2px solid #60a5fa; border-radius: 10px; margin: 5px; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);">
            <h6 style="text-align: center; color: white; margin-bottom: 15px; font-weight: bold;">부채 + 자본 (대변)</h6>
            <div style="background: rgba(255,255,255,0.95); padding: 15px; border-radius: 8px; height: 250px; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="background: rgba(96, 165, 250, 0.9); padding: 10px; border-radius: 6px; text-align: center; flex: ${currentLiabilities/totalLiabilitiesAndEquity}; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                    <div>
                        <div style="font-weight: bold; color: white; font-size: 13px;">유동부채</div>
                        <div style="font-size: 12px; color: white;">${currentLiabilities.toFixed(1)}조원</div>
                    </div>
                </div>
                <div style="background: rgba(30, 64, 175, 0.9); padding: 10px; border-radius: 6px; text-align: center; flex: ${nonCurrentLiabilities/totalLiabilitiesAndEquity}; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                    <div>
                        <div style="font-weight: bold; color: white; font-size: 13px;">비유동부채</div>
                        <div style="font-size: 12px; color: white;">${nonCurrentLiabilities.toFixed(1)}조원</div>
                    </div>
                </div>
                <div style="background: rgba(29, 78, 216, 0.9); padding: 12px; border-radius: 6px; text-align: center; flex: ${equity/totalLiabilitiesAndEquity}; display: flex; align-items: center; justify-content: center;">
                    <div>
                        <div style="font-weight: bold; color: white;">자기자본</div>
                        <div style="font-size: 14px; color: white;">${equity.toFixed(1)}조원</div>
                    </div>
                </div>
            </div>
            <div style="text-align: center; color: white; margin-top: 10px; font-weight: bold;">총 ${totalLiabilitiesAndEquity.toFixed(1)}조원</div>
        </div>
    `;
}

// 차트 제거
function destroyCharts() {
    Object.values(currentCharts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    currentCharts = {};
}

// 로딩 표시/숨김
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// 통화 포맷팅 (조/억원 단위)
function formatCurrency(amount) {
    if (amount === 0) return '0';
    
    const trillion = amount / 1000000000000;
    const billion = amount / 1000000000;
    
    if (trillion >= 1) {
        return trillion.toFixed(1) + '조원';
    } else if (billion >= 1) {
        return billion.toFixed(1) + '억원';
    } else {
        const million = amount / 1000000;
        if (million >= 1) {
            return million.toFixed(1) + '백만원';
        }
        return amount.toLocaleString() + '원';
    }
}

// AI 분석 요청
async function requestAIAnalysis(analysisType) {
    if (!selectedCompany) {
        alert('먼저 회사를 선택해주세요.');
        return;
    }
    
    const analysisResultDiv = document.getElementById('aiAnalysisResult');
    analysisResultDiv.style.display = 'block';
    analysisResultDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> AI 분석 중...</div>';
    
    try {
        const response = await fetch(`/api/ai-analysis?corpCode=${selectedCompany.corp_code}&analysisType=${analysisType}`);
        const data = await response.json();
        
        if (data.success) {
            analysisResultDiv.innerHTML = `
                <div class="alert alert-success">
                    <h6><i class="fas fa-robot"></i> AI 분석 결과</h6>
                    <div style="white-space: pre-line; text-align: left; margin-top: 10px;">
                        ${data.data.analysis}
                    </div>
                </div>
            `;
        } else {
            analysisResultDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> ${data.message}</div>`;
        }
    } catch (error) {
        console.error('AI 분석 오류:', error);
        analysisResultDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> AI 분석 중 오류가 발생했습니다.</div>';
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    console.log('재무제표 시각화 대시보드가 로드되었습니다.');
    
    // 검색 버튼 이벤트
    document.getElementById('searchBtn').addEventListener('click', searchCompany);
    document.getElementById('companySearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchCompany();
        }
    });
    
    // 재무제표 조회 버튼 이벤트
    document.getElementById('loadFinancialBtn').addEventListener('click', loadFinancialData);
    
    // AI 분석 버튼 이벤트
    document.getElementById('comprehensiveAnalysisBtn').addEventListener('click', () => requestAIAnalysis('comprehensive'));
    document.getElementById('ratioAnalysisBtn').addEventListener('click', () => requestAIAnalysis('ratios'));
    document.getElementById('incomeAnalysisBtn').addEventListener('click', () => requestAIAnalysis('income'));
    document.getElementById('simpleAnalysisBtn').addEventListener('click', () => requestAIAnalysis('simple'));
}); 