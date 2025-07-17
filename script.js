// --- データモデルの定義（クラス）---
class SleepRecord {
    constructor(date, durationHours) {
        this.date = date; // Dateオブジェクト
        this.durationHours = parseFloat(durationHours);
    }
    toSerializable() {
        return {
            date: this.date.toISOString().split('T')[0], // YYYY-MM-DD形式
            durationHours: this.durationHours
        };
    }
    static fromSerializable(data) {
        return new SleepRecord(new Date(data.date), data.durationHours);
    }
}

class DailyCondition {
    constructor(date, feeling, energyLevel) {
        this.date = date; // Dateオブジェクト
        this.feeling = feeling;
        this.energyLevel = energyLevel;
    }
    toSerializable() {
        return {
            date: this.date.toISOString().split('T')[0],
            feeling: this.feeling,
            energyLevel: this.energyLevel
        };
    }
    static fromSerializable(data) {
        return new DailyCondition(new Date(data.date), data.feeling, data.energyLevel);
    }
}

class PreSleepDiaryEntry {
    constructor(date, entryText) {
        this.date = date; // Dateオブジェクト
        this.entryText = entryText;
    }
    toSerializable() {
        return {
            date: this.date.toISOString().split('T')[0],
            entryText: this.entryText
        };
    }
    static fromSerializable(data) {
        return new PreSleepDiaryEntry(new Date(data.date), data.entryText);
    }
}

// --- データストレージ（localStorage） ---
const STORAGE_KEY = 'minminDiaryData';
const NICKNAME_KEY = 'minminNickname';

let appData = {
    sleepRecords: [],
    dailyConditions: [],
    diaryEntries: []
};
let userNickname = '';

function loadData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        const parsedData = JSON.parse(storedData);
        appData.sleepRecords = (parsedData.sleepRecords || []).map(data => SleepRecord.fromSerializable(data));
        appData.dailyConditions = (parsedData.dailyConditions || []).map(data => DailyCondition.fromSerializable(data));
        appData.diaryEntries = (parsedData.diaryEntries || []).map(data => PreSleepDiaryEntry.fromSerializable(data));
    }
    userNickname = localStorage.getItem(NICKNAME_KEY) || '';
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sleepRecords: appData.sleepRecords.map(rec => rec.toSerializable()),
        dailyConditions: appData.dailyConditions.map(cond => cond.toSerializable()),
        diaryEntries: appData.diaryEntries.map(entry => entry.toSerializable())
    }));
    localStorage.setItem(NICKNAME_KEY, userNickname);
}

function clearAllData() {
    if (confirm("全ての記録データを消去します。この操作は元に戻せません。本当に実行しますか？")) {
        localStorage.removeItem(STORAGE_KEY);
        appData = { sleepRecords: [], dailyConditions: [], diaryEntries: [] };
        
        // UIをリフレッシュ
        updateFormsAndHistoryDisplay();
        renderAllCharts();
        minminCharacterService.updateCharacterDisplay(
            sleepTrackingService.getUniqueRecordDatesCount(),
            preSleepDiaryService.getContinuousDiaryDays()
        );
        showMessage(document.getElementById('clearDataMessage'), "全てのデータを消去しました。", "success");
    }
}


// --- サービスとロジック ---
const sleepTrackingService = {
    recordSleep: function(date, durationHours) {
        const record = new SleepRecord(date, durationHours);
        const existingIndex = appData.sleepRecords.findIndex(r => r.date.toDateString() === date.toDateString());
        if (existingIndex !== -1) {
            appData.sleepRecords[existingIndex] = record;
        } else {
            appData.sleepRecords.push(record);
        }
        saveData();
        return "睡眠時間を記録しました！";
    },
    getSleepRecordByDate: function(date) {
        return appData.sleepRecords.find(r => r.date.toDateString() === date.toDateString());
    },
    getAllSleepRecordsSortedOldestFirst: function() {
        return [...appData.sleepRecords].sort((a, b) => a.date.getTime() - b.date.getTime()); // 古い順 (グラフ用)
    },
    getUniqueRecordDatesCount: function() {
        const uniqueDates = new Set(appData.sleepRecords.map(record => record.date.toDateString()));
        return uniqueDates.size;
    }
};

const dailyConditionService = {
    recordDailyCondition: function(date, feeling, energyLevel) {
        const condition = new DailyCondition(date, feeling, energyLevel);
        const existingIndex = appData.dailyConditions.findIndex(c => c.date.toDateString() === date.toDateString());
        if (existingIndex !== -1) {
            appData.dailyConditions[existingIndex] = condition;
        } else {
            appData.dailyConditions.push(condition);
        }
        saveData();
        return "体調を記録しました！";
    },
    getDailyConditionByDate: function(date) {
        return appData.dailyConditions.find(c => c.date.toDateString() === date.toDateString());
    }
};

const preSleepDiaryService = {
    addDiaryEntry: function(date, entryText) {
        const entry = new PreSleepDiaryEntry(date, entryText);
        const existingIndex = appData.diaryEntries.findIndex(e => e.date.toDateString() === date.toDateString());
        if (existingIndex !== -1) {
            appData.diaryEntries[existingIndex] = entry; // 同じ日の日記は更新
        } else {
            appData.diaryEntries.push(entry);
        }
        saveData();
        return "日記を記録しました！";
    },
    getDiaryEntryByDate: function(date) {
        return appData.diaryEntries.find(e => e.date.toDateString() === date.toDateString());
    },
    getContinuousDiaryDays: function() {
        if (appData.diaryEntries.length === 0) {
            return 0;
        }

        // 日記を日付の昇順にソート
        const sortedDiaries = [...appData.diaryEntries].sort((a, b) => a.date.getTime() - b.date.getTime());
        let continuousCount = 0;
        let lastDate = null;

        // 今日の日付を取得（時刻情報なし）
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 最新の日記エントリが今日の日付かを確認
        const latestEntry = sortedDiaries[sortedDiaries.length - 1];
        const latestDiaryDate = new Date(latestEntry.date);
        latestDiaryDate.setHours(0, 0, 0, 0);

        const oneDay = 24 * 60 * 60 * 1000;

        // 最新の日記が今日の日付か、昨日から連続しているかチェック
        // 今日が最新の日記なら今日から数え始める
        if (latestDiaryDate.getTime() === today.getTime()) {
            continuousCount = 1;
            lastDate = today;
        } else if (latestDiaryDate.getTime() === (today.getTime() - oneDay)) {
            // 最新の日記が昨日の日付なら、昨日から連続としてカウント開始
            continuousCount = 1;
            lastDate = latestDiaryDate;
        } else {
            // 最新の日記が今日でも昨日でもない場合、連続は0
            return 0;
        }

        // 逆順に辿って連続性を確認
        for (let i = sortedDiaries.length - 2; i >= 0; i--) {
            const prevDate = new Date(sortedDiaries[i].date);
            prevDate.setHours(0, 0, 0, 0);

            // 1日前の日付か確認
            if (prevDate.getTime() === (lastDate.getTime() - oneDay)) {
                continuousCount++;
                lastDate = prevDate;
            } else {
                // 連続が途切れた
                break;
            }
        }
        return continuousCount;
    }
};


const sleepRecommendationEngine = {
    BASE_OPTIMAL_SLEEP_HOURS: 8.0,

    suggestOptimalSleepTime: function() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);

        // getSleepRecordsByDateRangeという関数がないので、getAllSleepRecordsSortedOldestFirstからフィルタリング
        const recordsLastWeek = sleepTrackingService.getAllSleepRecordsSortedOldestFirst().filter(record => {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate >= startOfLastWeek && recordDate <= today;
        });

        if (recordsLastWeek.length === 0) {
            return {
                time: this.BASE_OPTIMAL_SLEEP_HOURS,
                message: `記録がありません。まずは毎日睡眠時間を記録しましょう。<br>基本の**${this.BASE_OPTIMAL_SLEEP_HOURS}時間**を推奨します。`
            };
        }

        const totalSleepLastWeek = recordsLastWeek.reduce((sum, record) => sum + record.durationHours, 0);
        const averageSleepLastWeek = totalSleepLastWeek / recordsLastWeek.length;

        let recommendedTime = this.BASE_OPTIMAL_SLEEP_HOURS;
        let message = `過去1週間の平均睡眠時間: **${averageSleepLastWeek.toFixed(1)} 時間**<br>`;

        if (averageSleepLastWeek < this.BASE_OPTIMAL_SLEEP_HOURS - 1.0) {
            recommendedTime = this.BASE_OPTIMAL_SLEEP_HOURS + 1.5;
            message += `かなり睡眠が不足しているようです。<br>今回は**${recommendedTime.toFixed(1)}時間**の睡眠を強くおすすめします。`;
        } else if (averageSleepLastWeek < this.BASE_OPTIMAL_SLEEP_HOURS - 0.5) {
             recommendedTime = this.BASE_OPTIMAL_SLEEP_HOURS + 1.0;
             message += `平均睡眠時間がやや不足しています。<br>今回は**${recommendedTime.toFixed(1)}時間**の睡眠をおすすめします。`;
        } else if (averageSleepLastWeek < this.BASE_OPTIMAL_SLEEP_HOURS) {
             recommendedTime = this.BASE_OPTIMAL_SLEEP_HOURS + 0.5;
             message += `もう少し寝た方が良さそうです。<br>今回は**${recommendedTime.toFixed(1)}時間**の睡眠をおすすめします。`;
        } else {
            message += `十分に睡眠が取れています！<br>今回は**${recommendedTime.toFixed(1)}時間**の睡眠をおすすめします。`;
        }
        return { time: recommendedTime, message: message };
    }
};

// --- ヘルパー関数 ---
function getFeelingEmoji(feeling) {
    switch (feeling) {
        case 'とても良い': return '😄';
        case '良い': return '🙂';
        case '普通': return '😐';
        case '悪い': return '😔';
        case 'とても悪い': return '😫';
        default: return '';
    }
}

function showMessage(element, text, type) {
    element.textContent = text;
    element.style.color = (type === "success") ? "#28a745" : "red";
    setTimeout(() => {
        element.textContent = '';
    }, 3000);
}

// --- みんみんキャラクター成長・花ロジック ---
const minminCharacterService = {
    // キャラクターの成長段階
    characterStages: [
        { days: 0, image: 'icons/minmin_egg.png', status: 'まだ生まれたばかりです。' }, // 卵
        { days: 3, image: 'icons/minmin_baby.png', status: 'すくすく成長中！' },     // 赤ちゃん
        { days: 7, image: 'icons/minmin_child.png', status: '元気に育っています。' },     // 子供
        { days: 14, image: 'icons/minmin_teen.png', status: 'りっぱな大人に近づいています！' }, // ティーン
        { days: 30, image: 'icons/minmin_adult.png', status: '立派なみんみんになりました！' }  // 大人
    ],
    // 花の成長段階 (連続日記日数)
    flowerStages: [
        { days: 0, image: 'icons/flower_0.png', status: 'まだ花は咲いていません。' },
        { days: 1, image: 'icons/flower_1.png', status: '小さな芽が出ました！' },
        { days: 2, image: 'icons/flower_2.png', status: 'つぼみが膨らんでいます！' },
        { days: 3, image: 'icons/flower_3.png', status: '花びらが開き始めました！' },
        { days: 4, image: 'icons/flower_4.png', status: '少しずつ花が咲いてきました！' },
        { days: 5, image: 'icons/flower_5.png', status: 'もう少しで満開です！' },
        { days: 6, image: 'icons/flower_6.png', status: 'ほぼ満開です！' },
        { days: 7, image: 'icons/flower_7.png', status: '満開になりました！おめでとう！' }
    ],

    updateCharacterDisplay: function(totalRecordDays, continuousDiaryDays) {
        const minminImage = document.getElementById('minminCharacter');
        const minminFlower = document.getElementById('minminFlower'); // 花の画像要素
        const minminStatus = document.getElementById('minminStatus');
        const recordDaysCountSpan = document.getElementById('recordDaysCount');
        const continuousDiaryDaysSpan = document.getElementById('continuousDiaryDays');

        recordDaysCountSpan.textContent = totalRecordDays;
        continuousDiaryDaysSpan.textContent = continuousDiaryDays;

        // キャラクターの更新
        let currentCharacterStage = this.characterStages[0];
        for (let i = 0; i < this.characterStages.length; i++) {
            if (totalRecordDays >= this.characterStages[i].days) {
                currentCharacterStage = this.characterStages[i];
            } else {
                break;
            }
        }
        // 画像が変更される時だけアニメーションを再トリガー
        if (minminImage.src !== new URL(currentCharacterStage.image, window.location.href).href) {
            minminImage.classList.remove('grown');
            void minminImage.offsetWidth; // 強制的にリフロー
            minminImage.src = currentCharacterStage.image;
            minminImage.classList.add('grown');
        }

        // 花の更新
        let currentFlowerStage = this.flowerStages[0];
        for (let i = 0; i < this.flowerStages.length; i++) {
            if (continuousDiaryDays >= this.flowerStages[i].days) {
                currentFlowerStage = this.flowerStages[i];
            } else {
                break;
            }
        }
        // 花の画像が変更される時だけアニメーションを再トリガー（必要であれば）
        if (minminFlower.src !== new URL(currentFlowerStage.image, window.location.href).href) {
            minminFlower.src = currentFlowerStage.image;
            // 花にもアニメーションを付けたい場合はここにクラス追加などを記述
        }

        // ステータスはキャラクターと花の状況を組み合わせるか、代表的なものを選ぶ
        let statusText = currentCharacterStage.status;
        if (currentFlowerStage.days > 0) {
            // 花のステータスがキャラクターのステータスと重複しないように調整
            if (currentFlowerStage.status !== this.flowerStages[0].status) { // 「まだ花は咲いていません」以外の場合
                 statusText += ` ${currentFlowerStage.status}`; // キャラクターのステータスに追加
            }
        }
        minminStatus.textContent = statusText;
    }
};


let sleepChart = null; // Chart.jsインスタンスを保持する変数
let diaryTooltip = null; // 日記ツールチップ要素

// Chart.jsプラグイン: グラフ上の体調顔文字描画
const conditionEmojiPlugin = {
    id: 'conditionEmojiPlugin',
    afterDraw: (chart, args, options) => {
        const { ctx, chartArea: { left, right, top, bottom, width, height }, scales: { x, y } } = chart;
        ctx.save();

        const allRecords = sleepTrackingService.getAllSleepRecordsSortedOldestFirst(); // グラフは古い順

        allRecords.forEach((record, index) => {
            const dateStr = record.date.toISOString().split('T')[0];
            const condition = dailyConditionService.getDailyConditionByDate(new Date(dateStr));

            if (condition) {
                // Chart.js 4.xでは、getDatasetMeta(0).data[index] が棒要素
                const barElement = chart.getDatasetMeta(0).data[index];
                if (barElement) {
                    const xPos = barElement.x;
                    const yPos = barElement.y - 10; // 棒の上部に表示 (調整可能)

                    ctx.font = '22px Arial Unicode MS'; // 絵文字表示用のフォント
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(getFeelingEmoji(condition.feeling), xPos, yPos);
                }
            }
        });
        ctx.restore();
    }
};


function renderSleepChart(data) {
    const ctx = document.getElementById('sleepDurationChart').getContext('2d');
    
    // グラフがない場合に表示するメッセージ要素を削除
    const chartContainer = ctx.canvas.parentNode;
    const noDataMessage = chartContainer.querySelector('.no-data-message');
    if (noDataMessage) {
        noDataMessage.remove();
    }
    // canvasを再表示
    ctx.canvas.style.display = 'block';

    const labels = data.map(record => record.date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }));
    const sleepDurations = data.map(record => record.durationHours);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: '睡眠時間 (時間)'
                },
                max: 12
            },
            x: {
                title: {
                    display: true,
                    text: '日付'
                },
                barPercentage: 0.9,
                categoryPercentage: 0.8,
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 10,
                    maxRotation: 45,
                    minRotation: 0,
                    font: {
                        size: 10
                    }
                }
            }
        },
        plugins: {
            tooltip: {
                enabled: false // Chart.jsのデフォルトツールチップを無効化
            },
            title: {
                display: true,
                text: '過去の睡眠時間グラフ'
            },
            legend: {
                display: false
            },
            conditionEmojiPlugin: {}
        },
        onHover: (event, elements, chart) => {
            if (!diaryTooltip) {
                diaryTooltip = document.getElementById('diaryTooltip');
            }

            if (elements.length > 0) {
                const index = elements[0].index;
                const recordDate = data[index].date; 
                const diaryEntry = preSleepDiaryService.getDiaryEntryByDate(recordDate);

                if (diaryEntry && diaryEntry.entryText.trim() !== '') {
                    const canvasRect = chart.canvas.getBoundingClientRect();
                    let xPos = event.clientX - canvasRect.left + 10;
                    let yPos = event.clientY - canvasRect.top + 10;

                    // ツールチップが画面からはみ出さないように調整
                    if (xPos + diaryTooltip.offsetWidth > canvasRect.width) {
                        xPos = event.clientX - canvasRect.left - diaryTooltip.offsetWidth - 10;
                    }
                    if (yPos + diaryTooltip.offsetHeight > canvasRect.height) {
                        yPos = event.clientY - canvasRect.top - diaryTooltip.offsetHeight - 10;
                    }

                    diaryTooltip.style.left = `${xPos}px`;
                    diaryTooltip.style.top = `${yPos}px`;
                    diaryTooltip.textContent = diaryEntry.entryText;
                    diaryTooltip.classList.add('active');
                } else {
                    diaryTooltip.classList.remove('active');
                }
            } else {
                diaryTooltip.classList.remove('active');
            }
        }
    };

    if (sleepChart) {
        sleepChart.data.labels = labels;
        sleepChart.data.datasets[0].data = sleepDurations;
        sleepChart.update();
    } else {
        sleepChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '睡眠時間 (時間)',
                    data: sleepDurations,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: chartOptions,
            plugins: [conditionEmojiPlugin]
        });
    }
}

// グラフがない場合のメッセージ表示
function displayNoChartDataMessage() {
    const chartContainer = document.querySelector('.chart-container');
    const canvas = document.getElementById('sleepDurationChart');
    if (sleepChart) { // 既存のチャートがあれば破棄
        sleepChart.destroy();
        sleepChart = null;
    }
    if (canvas) canvas.style.display = 'none'; // canvasを非表示に

    let noDataMessage = chartContainer.querySelector('.no-data-message');
    if (!noDataMessage) {
        noDataMessage = document.createElement('p');
        noDataMessage.className = 'no-data-message';
        noDataMessage.style.textAlign = 'center';
        noDataMessage.style.color = '#777';
        noDataMessage.style.margin = 'auto'; // 中央寄せ
        noDataMessage.textContent = 'まだ睡眠時間の記録がありません。';
        chartContainer.appendChild(noDataMessage);
    }
}

// 全てのチャートを再レンダリングする関数
function renderAllCharts() {
    const allSleepRecordsForChart = sleepTrackingService.getAllSleepRecordsSortedOldestFirst();
    if (allSleepRecordsForChart.length > 0) {
        renderSleepChart(allSleepRecordsForChart);
    } else {
        displayNoChartDataMessage();
    }
}


// --- DOM操作とイベントリスナー ---
document.addEventListener('DOMContentLoaded', function() {
    loadData(); // ページ読み込み時にデータをロード

    // --- 要素の取得 ---
    const appContainer = document.getElementById('app-container');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const initialNicknameModal = document.getElementById('initialNicknameModal');
    const initialNicknameForm = document.getElementById('initialNicknameForm');
    const initialNicknameInput = document.getElementById('initialNicknameInput');
    const initialNicknameMessage = document.getElementById('initialNicknameMessage');

    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const settingsCloseButton = settingsModal.querySelector('.close-button');
    const nicknameForm = settingsModal.querySelector('#nicknameForm'); // 設定画面内のフォーム
    const nicknameInput = settingsModal.querySelector('#nicknameInput'); // 設定画面内のインプット
    const nicknameMessage = settingsModal.querySelector('#nicknameMessage');
    const clearAllDataButton = document.getElementById('clearAllDataButton');
    const clearDataMessage = document.getElementById('clearDataMessage');

    const navButtons = document.querySelectorAll('.nav-button');
    const pages = document.querySelectorAll('.page');

    const selectedDateInput = document.getElementById('selectedDate');
    const sleepDurationInput = document.getElementById('sleepDuration');
    const feelingSelect = document.getElementById('feeling');
    const energyLevelSelect = document.getElementById('energyLevel');
    const diaryTextInput = document.getElementById('diaryText');

    const sleepRecordForm = document.getElementById('sleepRecordForm');
    const sleepRecordMessage = document.getElementById('sleepRecordMessage');
    const conditionForm = document.getElementById('conditionForm');
    const conditionMessage = document.getElementById('conditionMessage');
    const diaryForm = document.getElementById('diaryForm');
    const diaryMessage = document.getElementById('diaryMessage');

    const suggestSleepButton = document.getElementById('suggestSleepButton');
    const recommendedSleepTimeDisplay = document.getElementById('recommendedSleepTime');

    const recordDaysCountSpan = document.getElementById('recordDaysCount');
    const continuousDiaryDaysSpan = document.getElementById('continuousDiaryDays');

    // --- 初期化処理 ---
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    selectedDateInput.value = todayISO;
    selectedDateInput.max = todayISO; // 未来の日付を選択できないようにする

    // 初回ログイン処理
    if (!userNickname) {
        initialNicknameModal.style.display = 'flex';
        appContainer.style.display = 'none'; // メインアプリを非表示
    } else {
        updateWelcomeMessage();
        appContainer.style.display = 'flex'; // メインアプリを表示
    }

    updateFormsAndHistoryDisplay(); // 初期表示時に過去データがあれば反映
    renderAllCharts(); // グラフを常に表示
    updateMinminCharacter(); // みんみんを初期表示

    // --- 関数 ---

    // 歓迎メッセージの更新
    function updateWelcomeMessage() {
        if (userNickname) {
            welcomeMessage.textContent = `おかえりなさい、${userNickname}さん！今日も頑張りましょう！`;
        } else {
            welcomeMessage.textContent = 'あなたの心地よい眠りをサポートします';
        }
    }

    // みんみんキャラクターの更新をラップ
    function updateMinminCharacter() {
        minminCharacterService.updateCharacterDisplay(
            sleepTrackingService.getUniqueRecordDatesCount(),
            preSleepDiaryService.getContinuousDiaryDays()
        );
    }

    // 日付が変更されたときに各フォームの入力フィールドを更新し、履歴表示を更新する
    function updateFormsAndHistoryDisplay() {
        const selectedDate = new Date(selectedDateInput.value);
        selectedDate.setHours(0, 0, 0, 0);

        // 睡眠記録を更新
        const sleepRecord = sleepTrackingService.getSleepRecordByDate(selectedDate);
        sleepDurationInput.value = sleepRecord ? sleepRecord.durationHours : '';

        // 体調記録を更新
        const dailyCondition = dailyConditionService.getDailyConditionByDate(selectedDate);
        feelingSelect.value = dailyCondition ? dailyCondition.feeling : '普通';
        energyLevelSelect.value = dailyCondition ? dailyCondition.energyLevel : '普通';

        // 日記を更新
        const diaryEntry = preSleepDiaryService.getDiaryEntryByDate(selectedDate);
        diaryTextInput.value = diaryEntry ? diaryEntry.entryText : '';
    }

    // ページ切り替え関数
    function showPage(pageId) {
        pages.forEach(page => {
            page.classList.remove('active-page');
        });
        document.getElementById(pageId).classList.add('active-page');

        navButtons.forEach(button => {
            if (button.dataset.page === pageId.replace('-page', '')) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // グラフページに切り替わったときにグラフを再描画（リサイズ対応）
        if (pageId === 'history-page') {
            renderAllCharts();
        }
        // 睡眠提案ページに切り替わったときに提案内容をクリア
        if (pageId === 'recommendation-page') {
            recommendedSleepTimeDisplay.innerHTML = '';
        }
    }

    // --- イベントリスナー ---

    // 初回ニックネーム登録フォームの送信
    initialNicknameForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newNickname = initialNicknameInput.value.trim();
        if (newNickname) {
            userNickname = newNickname;
            saveData();
            updateWelcomeMessage();
            updateMinminCharacter();
            initialNicknameModal.style.display = 'flex'; // Flexに戻す
            initialNicknameModal.style.display = 'none';
            appContainer.style.display = 'flex'; // メインアプリを表示
            showMessage(initialNicknameMessage, "ニックネームを登録しました！", "success");
            nicknameInput.value = userNickname; // 設定画面のニックネームも更新
        } else {
            showMessage(initialNicknameMessage, "ニックネームを入力してください。", "error");
        }
    });


    // 設定ボタンクリックでモーダル表示
    settingsButton.addEventListener('click', function() {
        nicknameInput.value = userNickname; // 現在のニックネームを設定フォームにセット
        settingsModal.style.display = 'flex';
    });

    // 設定モーダルを閉じるボタン
    settingsCloseButton.addEventListener('click', function() {
        settingsModal.style.display = 'none';
        nicknameMessage.textContent = ''; // メッセージをクリア
        clearDataMessage.textContent = ''; // メッセージをクリア
    });

    // 設定モーダル外側クリックで閉じる
    window.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
            nicknameMessage.textContent = '';
            clearDataMessage.textContent = '';
        }
    });

    // 設定画面内のニックネームフォームの送信
    nicknameForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newNickname = nicknameInput.value.trim();
        if (newNickname) {
            userNickname = newNickname;
            saveData();
            updateWelcomeMessage();
            showMessage(nicknameMessage, "ニックネームを更新しました！", "success");
        } else {
            userNickname = ''; // ニックネームを空にする
            saveData();
            updateWelcomeMessage();
            showMessage(nicknameMessage, "ニックネームを削除しました。", "success");
        }
    });

    // 全データ消去ボタン
    clearAllDataButton.addEventListener('click', clearAllData);


    // 共通日付入力が変更されたときのイベント
    selectedDateInput.addEventListener('change', function() {
        updateFormsAndHistoryDisplay();
    });

    // フォーム送信イベント（共通化）
    function handleFormSubmit(event, service, messageElement, inputElements, successMessage) {
        event.preventDefault();

        const date = new Date(selectedDateInput.value);
        date.setHours(0,0,0,0);

        let resultMessage = '';
        let isValid = true;

        if (service === sleepTrackingService) {
            const duration = parseFloat(inputElements.sleepDuration.value);
            if (isNaN(duration) || duration <= 0 || duration > 24) {
                showMessage(messageElement, "有効な睡眠時間を入力してください (0～24時間)。", "error");
                isValid = false;
            } else {
                resultMessage = service.recordSleep(date, duration);
            }
        } else if (service === dailyConditionService) {
            const feeling = inputElements.feeling.value;
            const energy = inputElements.energyLevel.value;
            resultMessage = service.recordDailyCondition(date, feeling, energy);
        } else if (service === preSleepDiaryService) {
            const text = inputElements.diaryText.value.trim();
            if (text === "") {
                showMessage(messageElement, "日記内容を入力してください。", "error");
                isValid = false;
            } else {
                resultMessage = service.addDiaryEntry(date, text);
            }
        }

        if (isValid) {
            showMessage(messageElement, resultMessage || successMessage, "success");
            updateFormsAndHistoryDisplay(); // 記録後にフォームを更新
            renderAllCharts(); // 記録後にグラフを更新
            updateMinminCharacter(); // 記録後にキャラクターと花を更新
        }
    }

    sleepRecordForm.addEventListener('submit', (e) => handleFormSubmit(e, sleepTrackingService, sleepRecordMessage, { sleepDuration: sleepDurationInput }));
    conditionForm.addEventListener('submit', (e) => handleFormSubmit(e, dailyConditionService, conditionMessage, { feeling: feelingSelect, energyLevel: energyLevelSelect }));
    diaryForm.addEventListener('submit', (e) => handleFormSubmit(e, preSleepDiaryService, diaryMessage, { diaryText: diaryTextInput }));

    // 最適な睡眠時間提案ボタンのクリックイベント
    suggestSleepButton.addEventListener('click', function() {
        const result = sleepRecommendationEngine.suggestOptimalSleepTime();
        recommendedSleepTimeDisplay.innerHTML = result.message;
    });

    // ナビゲーションボタンのイベントリスナー
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const pageId = this.dataset.page + '-page';
            showPage(pageId);
        });
    });

    // 初期表示は「記録する」ページ
    showPage('record-page'); 
});