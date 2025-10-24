// ------------------------------------
//  Client-side (Browser)
//  MUSIC SURVEY (음악 설문) - v2
// ------------------------------------

// ★★★★★ 여기!!! ★★★★★
//
//      (1. Apps Script 수정)에서 "새 배포"로 받은
//      "웹 앱(Web App) URL"을 여기에 정확히 붙여넣으세요.
//
const googleSheetURL = "https://script.google.com/macros/s/AKfycbwv9FDieLhdT7K-__WHG_hN4P6LPya3mloVIK1FQJN95KBVV_ldZ3gRl8q8yQ_TwZFNTg/exec";
// ★★★★★★★★★★★★★★★★★

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. 전역 변수 및 차트 초기화 ---
    let frequencyChart = null;
    let genreChart = null;

    // 통계 데이터를 저장할 객체 (이제 비어있음)
    const stats = {
        frequency: {},
        genre: {},
        listenReasons: [],
        recommendations: []
    };

    const chartColors = [
        '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#E0F2FE',
        '#10B981', '#6EE7B7', '#A7F3D0'
    ];
    
    const form = document.getElementById('music-form');
    const submitBtn = document.getElementById('submit-btn');

    // --- 2. 차트 생성 함수 (이전과 동일) ---

    function createFrequencyChart() {
        const ctx = document.getElementById('frequency-chart').getContext('2d');
        const labels = Object.keys(stats.frequency);
        const data = Object.values(stats.frequency);
        
        if (frequencyChart) frequencyChart.destroy();
        
        frequencyChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels.map(label => label.substring(1)),
                datasets: [{
                    label: '청취 빈도',
                    data: data,
                    backgroundColor: chartColors.slice(0, labels.length),
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.parsed || 0;
                                let total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                if (total === 0) total = 1; // 0으로 나누기 방지
                                let percentage = ((value / total) * 100).toFixed(1) + '%';
                                return ` ${label}: ${value}명 (${percentage})`;
                            }
                        }
                    }
                }
            }
        });
    }

    function createGenreChart() {
        const ctx = document.getElementById('genre-chart').getContext('2d');
        const labels = Object.keys(stats.genre);
        const data = Object.values(stats.genre);

        if (genreChart) genreChart.destroy();

        genreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '선택 수 (명)',
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function updateListenReasons() {
        const container = document.getElementById('listen-reasons-container');
        container.innerHTML = ''; 
        if (stats.listenReasons.length === 0) {
            container.innerHTML = '<p class="loading-message">아직 등록된 의견이 없습니다.</p>';
            return;
        }
        // 최신순 (reverse)
        stats.listenReasons.slice().reverse().forEach(reason => {
            if (reason.trim() === '') return;
            const reasonElement = document.createElement('div');
            reasonElement.className = 'record-item-small';
            reasonElement.textContent = `💬 "${escapeHTML(reason)}"`;
            container.appendChild(reasonElement);
        });
    }

    function updateRecommendations() {
        const container = document.getElementById('records-container');
        container.innerHTML = '';
        if (stats.recommendations.length === 0) {
            container.innerHTML = '<p class="loading-message">아직 등록된 추천이 없습니다.</p>';
            return;
        }
        // 최신순 (reverse)
        stats.recommendations.slice().reverse().forEach(record => {
            const item = document.createElement('div');
            item.className = 'record-item';
            
            let htmlContent = '';
            if (record.artist && record.artist.trim() !== '') {
                htmlContent += `<p><strong>🎤 추천 아티스트: ${escapeHTML(record.artist)}</strong><em>${escapeHTML(record.artistReason)}</em></p>`;
            }
            if (record.song && record.song.trim() !== '') {
                if (htmlContent !== '') {
                    htmlContent += '<hr style="margin: 10px 0; border-top: 1px solid #eee;">';
                }
                htmlContent += `<p><strong>🎶 추천 곡: ${escapeHTML(record.song)}</strong><em>${escapeHTML(record.songReason)}</em></p>`;
            }
            item.innerHTML = htmlContent;
            if (htmlContent.trim() !== '') {
                container.appendChild(item);
            }
        });
    }
    
    // (★ 수정됨) 모든 통계 UI 새로고침
    function updateAllStats() {
        createFrequencyChart();
        createGenreChart();
        updateListenReasons();
        updateRecommendations();
    }
    
    // (★ 수정됨) 폼 제출 로직 (데이터 추가)
    function addDataToStats(formData) {
        // (1) 노래 청취 빈도
        const frequency = formData.get('frequency');
        if (frequency) {
            stats.frequency[frequency] = (stats.frequency[frequency] || 0) + 1;
        }

        // (2) 선호 장르 (복수)
        const genres = formData.getAll('genre');
        genres.forEach(genre => {
            stats.genre[genre] = (stats.genre[genre] || 0) + 1;
        });
        
        // (3) 기타 장르
        const otherGenre = formData.get('genre_other').trim();
        if (otherGenre) {
            stats.genre[otherGenre] = (stats.genre[otherGenre] || 0) + 1;
        }

        // (4) 노래 듣는 이유
        const listenReason = formData.get('listen_reason').trim();
        if (listenReason) {
            stats.listenReasons.push(listenReason);
        }

        // (5) 추천
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
    }

    // --- 3. 폼 제출(Submit) 이벤트 처리 ---
    form.addEventListener('submit', function(event) {
        event.preventDefault(); 

      
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "제출 중...";

        const formData = new FormData(form);
        
        // (1) Google Sheet로 데이터 전송 및 저장 (POST)
        fetch(googleSheetURL, {
            method: "POST",
            body: formData
        })
        .then(response => response.json()) // 응답을 JSON으로 파싱
        .then(data => {
            if (data.status !== 'success') {
                // Apps Script에서 보낸 에러
                throw new Error(data.message || 'Google Sheet 저장에 실패했습니다.');
            }
            
            console.log("데이터가 Google Sheet에 성공적으로 저장되었습니다.");

            // (2) (성공 시) 로컬 통계(stats)에 즉시 반영
            addDataToStats(formData);
            
            // (3) 차트 및 목록 새로고침
            updateAllStats();
            
            // (4) 폼 초기화
            form.reset();
            alert('답변이 성공적으로 제출되었습니다!');
        })
        .catch(error => {
            console.error("오류 발생:", error);
            alert('오류가 발생하여 답변을 제출하지 못했습니다. 다시 시도해주세요.');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "답변 제출하기";
        });
    });

    // --- 4. (★ 새로 추가됨) 페이지 로드 시 데이터 불러오기 ---
    
    function loadDataFromSheet() {
        console.log("Google Sheet에서 데이터를 불러오는 중...");
        
        if (googleSheetURL === "여기에_새로_배포한_웹_앱_URL을_붙여넣으세요") {
             // URL이 없으면 예시 데이터로 차트를 그림 (이전 방식)
             console.warn("googleSheetURL이 설정되지 않았습니다. 예시 데이터로 차트를 그립니다.");
             // 대신 비어있는 차트를 그림
             updateAllStats();
             return;
        }

        // '로딩 메시지' 표시
        const recordsContainer = document.getElementById('records-container');
        recordsContainer.innerHTML = '<p class="loading-message">통계 데이터를 불러오는 중입니다...</p>';
        
        // (GET 요청) Apps Script의 doGet 함수 호출
        fetch(googleSheetURL)
            .then(response => response.json())
            .then(result => {
                
                if (result.error) {
                    throw new Error(result.error);
                }

                // (1) 데이터 파싱 및 stats 객체 채우기
                // result.data는 [ {frequency: "4매우...", genres: ["발라드", "힙합"] ...}, {...} ]
                const allData = result.data || [];
                
                allData.forEach(row => {
                    // (1) 청취 빈도
                    const freq = row.frequency;
                    if (freq) {
                        stats.frequency[freq] = (stats.frequency[freq] || 0) + 1;
                    }

                    // (2) 선호 장르 (배열)
                    const genres = row.genres || [];
                    genres.forEach(genre => {
                        stats.genre[genre] = (stats.genre[genre] || 0) + 1;
                    });
                    
                    // (3) 기타 장르
                    const otherGenre = row.genre_other;
                    if (otherGenre) {
                        stats.genre[otherGenre] = (stats.genre[otherGenre] || 0) + 1;
                    }

                    // (4) 노래 듣는 이유
                    const reason = row.listen_reason;
                    if (reason) {
                        stats.listenReasons.push(reason);
                    }

                    // (5) 추천
                    const artist = row.rec_artist;
                    const song = row.rec_song;
                    if (artist || song) {
                        stats.recommendations.push({
                            artist: artist || "",
                            artistReason: row.rec_artist_reason || "",
                            song: song || "",
                            songReason: row.rec_song_reason || ""
                        });
                    }
                });

                console.log("데이터 로드 및 통계 집계 완료:", stats);
                
                // (2) 데이터 로드가 완료되면 전체 차트 및 목록 업데이트
                updateAllStats();
                
            })
            .catch(error => {
                console.error("데이터 로드 중 오류 발생:", error);
                recordsContainer.innerHTML = '<p class="loading-message" style="color: red;">데이터를 불러오는 데 실패했습니다.</p>';
                // (실패 시) 비어있는 차트라도 그림
                updateAllStats();
            });
    }

    // --- 5. 유틸리티 함수 ---
    function escapeHTML(str) {
        if (!str) return "";
        return str.replace(/[&<>"']/g, function(match) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
        });
    }
    
    // --- 6. 초기 실행 ---
    // (수정) 예시 데이터 대신 구글 시트에서 데이터 로드
    loadDataFromSheet();

});
