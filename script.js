// ❗️❗️❗️ Apps Script 웹 앱 URL을 여기에 붙여넣으세요 ❗️❗️❗️
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcTaBf0J6qAcCBJREYovpRJLHzWPRhigdxgb6Ml1FscLLVhB4zAtEsmYhzaMPqaWnZ/exec"; // <== 본인 URL 확인!

let frequencyChart, genreChart;

// JSONP 요청을 위한 헬퍼 함수
function jsonpRequest(url, callback) {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        callback(data);
    };

    const script = document.createElement('script');
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    document.body.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    loadInitialData();

    const form = document.getElementById('music-form');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = '제출하는 중...';

        const formData = new FormData(form);
        const record = {};

        record.frequency = formData.get('frequency');
        let genres = formData.getAll('genre');
        const otherGenre = formData.get('genre_other').trim();
        if (otherGenre) genres.push(`기타: ${otherGenre}`);
        record.genres = genres.join(', '); // GET 요청을 위해 텍스트로 미리 변환

        record.listen_reason = formData.get('listen_reason').trim();
        record.rec_artist = formData.get('rec_artist').trim();
        record.rec_artist_reason = formData.get('rec_artist_reason').trim();
        record.rec_song = formData.get('rec_song').trim();
        record.rec_song_reason = formData.get('rec_song_reason').trim();

        if (!record.frequency || record.genres.length === 0) {
            alert('1번(청취 빈도)과 2번(선호 장르)은 필수 응답 항목입니다.');
            submitBtn.disabled = false;
            submitBtn.textContent = '제출하고 결과보기';
            return;
        }

        let queryString = "action=submit";
        for (let key in record) {
            queryString += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(record[key]);
        }

        jsonpRequest(SCRIPT_URL + "?" + queryString, (data) => {
            if (data.result === 'success') {
                form.reset();
                alert('소중한 의견이 등록되었습니다!');
                loadInitialData(); // 제출 후 데이터 새로고침
            } else {
                alert('오류가 발생했습니다: ' + (data.message || '서버 응답 오류'));
            }

            submitBtn.disabled = false;
            submitBtn.textContent = '제출하고 결과보기';
        });
    });
});

// GET(JSONP) 방식으로 데이터 불러오기
function loadInitialData() {
    jsonpRequest(SCRIPT_URL, (records) => {
        updateUI(records);
    });
}

function updateUI(records) {
    if (!records || records.length === 0) {
        document.querySelector('.loading-message').textContent = '아직 등록된 응답이 없습니다. 첫 번째 주인공이 되어주세요!';
        return;
    }
    updateCharts(records);
    renderTextRecords(records);
}

function initializeCharts() {
    const freqCtx = document.getElementById('frequency-chart').getContext('2d');
    frequencyChart = new Chart(freqCtx, { type: 'pie', options: { responsive: true } });

    const genreCtx = document.getElementById('genre-chart').getContext('2d');
    genreChart = new Chart(genreCtx, {
        type: 'bar',
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

function updateCharts(records) {
    const freqCounts = records.reduce((acc, r) => {
        acc[r.frequency] = (acc[r.frequency] || 0) + 1;
        return acc;
    }, {});
    frequencyChart.data = {
        labels: Object.keys(freqCounts),
        datasets: [{ data: Object.values(freqCounts), backgroundColor: ['#3b82f6', '#65b2e3', '#93c5fd', '#bfdbfe', '#e0f2fe'] }]
    };
    frequencyChart.update();

    const genreCounts = records.flatMap(r => r.genres).reduce((acc, g) => {
        acc[g] = (acc[g] || 0) + 1;
        return acc;
    }, {});
    const sortedGenres = Object.entries(genreCounts).sort(([,a],[,b]) => b-a);
    genreChart.data = {
        labels: sortedGenres.map(item => item[0]),
        datasets: [{ label: '선택 수', data: sortedGenres.map(item => item[1]), backgroundColor: '#65b2e3' }]
    };
    genreChart.update();
}

function renderTextRecords(records) {
    const container = document.getElementById('records-container');
    container.innerHTML = '';

    [...records].reverse().forEach(record => {
        let content = '';
        if (record.listen_reason) content += `<p><strong>🎵 노래를 듣는 이유:</strong> ${record.listen_reason}</p>`;
        if (record.rec_artist && record.rec_artist_reason) content += `<p><strong>🎤 아티스트 추천:</strong> ${record.rec_artist} <br> <em>↳ 이유: ${record.rec_artist_reason}</em></p>`;
        if (record.rec_song && record.rec_song_reason) content += `<p><strong>🎧 노래 추천:</strong> ${record.rec_song} <br> <em>↳ 이유: ${record.rec_song_reason}</em></p>`;

        if (content) {
            const recordDiv = document.createElement('div');
            recordDiv.className = 'record-item';
            recordDiv.innerHTML = content;
            container.appendChild(recordDiv);
        }
    });
}



