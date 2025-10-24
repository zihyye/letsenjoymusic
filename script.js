// DOM 요소가 모두 로드된 후에 스크립트를 실행합니다.
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. 전역 변수 및 차트 초기화 ---
    
    // 차트 객체를 저장할 변수 (데이터 업데이트 시 필요)
    let frequencyChart = null;
    let genreChart = null;

    // 통계 데이터를 저장할 객체
    // 'frequency': { "4매우자주들음": 1, "3자주듣는편": 5, ... }
    // 'genre': { "발라드": 3, "힙합": 1, "K-POP": 5, ... }
    const stats = {
        frequency: {},
        genre: {},
        listenReasons: [], // 노래 듣는 이유 목록
        recommendations: []  // 추천 아티스트/노래 목록
    };

    // 차트 색상 설정
    const chartColors = [
        '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#E0F2FE',
        '#10B981', '#6EE7B7', '#A7F3D0'
    ];

    // --- 2. 차트 생성 함수 ---

    // (수정됨) '노래 청취 빈도' 파이 차트 생성
    function createFrequencyChart() {
        const ctx = document.getElementById('frequency-chart').getContext('2d');
        
        // stats.frequency 객체에서 라벨과 데이터를 분리
        const labels = Object.keys(stats.frequency);
        const data = Object.values(stats.frequency);
        
        // 기존 차트가 있으면 파괴
        if (frequencyChart) {
            frequencyChart.destroy();
        }
        
        frequencyChart = new Chart(ctx, {
            type: 'pie', // 파이 차트
            data: {
                labels: labels.map(label => label.substring(1)), // "4매우자주들음" -> "매우자주들음"
                datasets: [{
                    label: '청취 빈도',
                    data: data,
                    backgroundColor: chartColors.slice(0, labels.length), // 데이터 개수만큼 색상 사용
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom', // 범례를 아래쪽으로
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.parsed || 0;
                                let total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                let percentage = ((value / total) * 100).toFixed(1) + '%';
                                return ` ${label}: ${value}명 (${percentage})`;
                            }
                        }
                    }
                }
            }
        });
    }

    // (★ 수정됨) '선호 장르' 막대 차트 생성 (장르별 집계)
    function createGenreChart() {
        const ctx = document.getElementById('genre-chart').getContext('2d');
        
        // stats.genre 객체에서 라벨과 데이터를 분리
        // { "발라드": 3, "K-POP": 5 } -> labels: ["발라드", "K-POP"], data: [3, 5]
        const labels = Object.keys(stats.genre);
        const data = Object.values(stats.genre);

        // 기존 차트가 있으면 파괴
        if (genreChart) {
            genreChart.destroy();
        }

        genreChart = new Chart(ctx, {
            type: 'bar', // 막대 차트
            data: {
                labels: labels, // X축: 장르 이름
                datasets: [{
                    label: '선택 수 (명)',
                    data: data,  // Y축: 선택한 사람 수
                    backgroundColor: chartColors, // 막대 색상
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // ★ 중요: 가로 막대 차트로 변경 (장르 이름이 길어도 잘 보임)
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            // 정수 단위로만 축을 표시 (예: 1.5명 방지)
                            stepSize: 1 
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // 범례 숨기기 (데이터셋이 1개라 불필요)
                    }
                }
            }
        });
    }

    // (★ 추가됨) '노래를 듣는 이유' 섹션 업데이트
    function updateListenReasons() {
        const container = document.getElementById('listen-reasons-container');
        if (!container) return; // HTML에 해당 요소가 없으면 종료

        // 기존 내용 비우기
        container.innerHTML = ''; 

        if (stats.listenReasons.length === 0) {
            container.innerHTML = '<p class="loading-message">아직 등록된 의견이 없습니다.</p>';
            return;
        }

        // 각 이유를 화면에 추가
        stats.listenReasons.forEach(reason => {
            if (reason.trim() === '') return; // 빈 내용은 무시

            const reasonElement = document.createElement('div');
            reasonElement.className = 'record-item-small'; // (CSS 클래스 추가 필요 - 아래 참고)
            reasonElement.textContent = `💬 "${reason}"`;
            container.appendChild(reasonElement);
        });
    }

    // (★ 수정됨) '다른 사람들의 추천과 생각' 섹션 업데이트
    function updateRecommendations() {
        const container = document.getElementById('records-container');
        container.innerHTML = ''; // '로딩 중' 메시지 제거

        if (stats.recommendations.length === 0) {
            container.innerHTML = '<p class="loading-message">아직 등록된 추천이 없습니다.</p>';
            return;
        }
        
        // 최신순으로 정렬 (항상 최신 답변이 위로)
        stats.recommendations.slice().reverse().forEach(record => {
            const item = document.createElement('div');
            item.className = 'record-item'; // CSS 클래스 적용
            
            let htmlContent = '';

            // 1. 추천 아티스트 (있을 경우)
            if (record.artist && record.artist.trim() !== '') {
                htmlContent += `
                    <p>
                        <strong>🎤 추천 아티스트: ${escapeHTML(record.artist)}</strong>
                        <em>${escapeHTML(record.artistReason)}</em>
                    </p>
                `;
            }
            
            // 2. 추천 노래 (있을 경우)
            if (record.song && record.song.trim() !== '') {
                // 아티스트와 노래 사이에 구분을 위한 <hr> 추가 (둘 다 있을 경우)
                if (htmlContent !== '') {
                    htmlContent += '<hr style="margin: 10px 0; border-top: 1px solid #eee;">';
                }
                
                htmlContent += `
                    <p>
                        <strong>🎶 추천 곡: ${escapeHTML(record.song)}</strong>
                        <em>${escapeHTML(record.songReason)}</em>
                    </p>
                `;
            }

            // 3. 노래 듣는 이유 (참고용 - 이 항목은 별도 섹션으로 이동됨)
            // if (record.reason && record.reason.trim() !== '') {
            //     htmlContent += `
            //         <p>
            //             <strong>🎵 노래를 듣는 이유:</strong> 
            //             <em>${escapeHTML(record.reason)}</em>
            //         </p>
            //     `;
            // }

            item.innerHTML = htmlContent;
            
            // 내용이 있는 경우에만 화면에 추가
            if (htmlContent.trim() !== '') {
                container.appendChild(item);
            }
        });
    }

    // --- 3. 폼 제출(Submit) 이벤트 처리 ---
// --- 3. 폼 제출(Submit) 이벤트 처리 ---

const form = document.getElementById('music-form');
form.addEventListener('submit', function(event) {
    event.preventDefault(); // 폼의 기본 제출 동작(새로고침) 방지

    // ★★★★★ 여기!!! ★★★★★
    //
    //      기존에 사용하시던 Google Sheet 링크(URL)를
    //      아래 "YOUR_GOOGLE_SHEET_LINK_HERE" 부분에 정확히 붙여넣으세요.
    //
    const googleSheetURL = "https://script.google.com/macros/s/AKfycby2oIsq2wHOntv7A8YImHb-MOiU04JTE3cIxOvsOYRbX7qVveUe0XseZj4X8pVXpy9ItA/exec";
    // 예: const googleSheetURL = "https://script.google.com/macros/s/......";
    // ★★★★★★★★★★★★★★★★★

    if (googleSheetURL === "https://script.google.com/macros/s/AKfycby2oIsq2wHOntv7A8YImHb-MOiU04JTE3cIxOvsOYRbX7qVveUe0XseZj4X8pVXpy9ItA/exec") {
        alert("script.js 파일에서 googleSheetURL 변수를 설정해야 합니다!");
        return;
    }

    // 제출 버튼 비활성화 (중복 제출 방지)
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = "제출 중...";

    // 1. 폼 데이터 가져오기
    const formData = new FormData(form);
    
    // 2. (중요) Google Sheet로 데이터 전송 및 저장
    fetch(googleSheetURL, {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            // 서버에서 에러 응답을 보낸 경우 (예: Apps Script 오류)
            throw new Error('Google Sheet 저장에 실패했습니다.');
        }
        return response; // 성공 응답
    })
    .then(data => {
        // --- 저장이 성공했을 때만 아래 코드 실행 ---
        
        console.log("데이터가 Google Sheet에 성공적으로 저장되었습니다.");

        // 3. (클라이언트) 데이터 집계 (차트 즉시 업데이트용)
        
        // (1) 노래 청취 빈도 (Radio)
        const frequency = formData.get('frequency');
        if (frequency) {
            stats.frequency[frequency] = (stats.frequency[frequency] || 0) + 1;
        }

        // (2) 선호 장르 (Checkbox - 복수 선택 처리)
        const genres = formData.getAll('genre');
        genres.forEach(genre => {
            stats.genre[genre] = (stats.genre[genre] || 0) + 1;
        });
        
        // (3) 기타 장르 (Text)
        const otherGenre = formData.get('genre_other').trim();
        if (otherGenre) {
            stats.genre[otherGenre] = (stats.genre[otherGenre] || 0) + 1;
        }

        // (4) 노래 듣는 이유
        const listenReason = formData.get('listen_reason').trim();
        if (listenReason) {
            stats.listenReasons.push(listenReason);
        }

        // (5) 추천 아티스트/노래
        const recArtist = formData.get('rec_artist').trim();
        const recArtistReason = formData.get('rec_artist_reason').trim();
        const recSong = formData.get('rec_song').trim();
        const recSongReason = formData.get('rec_song_reason').trim();
        
        if (recArtist || recSong) {
            stats.recommendations.push({
                artist: recArtist,
                artistReason: recArtistReason,
                song: recSong,
                songReason: recSongReason,
            });
        }
        
        // 4. 차트 및 목록 새로고침
        updateAllStats();
        
        // 5. 폼 초기화
        form.reset(); // 폼 입력 내용 지우기
        alert('답변이 성공적으로 제출되었습니다!');

    })
    .catch(error => {
        // --- 저장에 실패했을 때 ---
        console.error("오류 발생:", error);
        alert('오류가 발생하여 답변을 제출하지 못했습니다. 다시 시도해주세요.');
        
    })
    .finally(() => {
        // --- 성공하든 실패하든 항상 실행 ---
        // 버튼을 다시 활성화
        submitBtn.disabled = false;
        submitBtn.textContent = "답변 제출하기";
    });
});

    // --- 4. 유틸리티 함수 ---
    
    // (보안) HTML 특수문자를 변환 (XSS 방지)
    // 사용자가 <script> 같은 태그를 입력해도 텍스트로 보이게 함
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // --- 5. 전체 업데이트 및 초기 실행 ---
    
    // 모든 통계 UI를 새로고침하는 함수
    function updateAllStats() {
        createFrequencyChart();
        createGenreChart();
        updateListenReasons();    // (추가)
        updateRecommendations();  // (수정)
    }
    
    // (가상) 초기 데이터 로드
    // 실제로는 서버에서 기존 데이터를 fetch로 불러와야 합니다.
    // 여기서는 예시 데이터를 넣어 차트가 비어있지 않게 합니다.
    function loadInitialData() {
        // (예시) 청취 빈도 초기 데이터
        stats.frequency = {
            "4매우자주들음": 5,
            "3자주듣는편": 8,
            "2보통": 3,
        };
        
        // (예시) 선호 장르 초기 데이터
        stats.genre = {
            "발라드": 7,
            "K-POP": 5,
            "힙합": 3,
            "인디": 4,
            "POP": 3
        };
        
        // (예시) 노래 듣는 이유 초기 데이터
        stats.listenReasons = [
            "노래를 들으면 힘이나요.",
            "출퇴근길이 심심해서",
            "집중할 때 도움이 됩니다."
        ];

        // (예시) 추천 목록 초기 데이터
        stats.recommendations = [
            {
                artist: "아이유",
                artistReason: "목소리가 너무 좋아요.",
                song: "잔나비 / 뜨거운 여름밤은 가고 남은 건 볼품없지만",
                songReason: "밤에 산책하면서 듣기 좋아요."
            },
            {
                artist: "검정치마",
                artistReason: "독특한 감성이 좋습니다.",
                song: "",
                songReason: ""
            }
        ];
        
        // (실행) 불러온 데이터로 UI 업데이트
        updateAllStats();
    }
    
    // 페이지 로드 시 초기 데이터 로드 실행
    loadInitialData();

});
