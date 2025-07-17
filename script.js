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

let appData = {
    sleepRecords: [],
    dailyConditions: [],
    diaryEntries: []
};

function loadData() {
    console.log("Loading data from localStorage..."); // デバッグ
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        const parsedData = JSON.parse(storedData);
        appData.sleepRecords = (parsedData.sleepRecords || []).map(data => SleepRecord.fromSerializable(data));
        appData.dailyConditions = (parsedData.dailyConditions || []).map(data => DailyCondition.fromSerializable(data));
        appData.diaryEntries = (parsedData.diaryEntries || []).map(data => PreSleepDiaryEntry.fromSerializable(data));
        console.log("Data loaded:", appData); // デバッグ
    } else {
        console.log("No data found in localStorage."); // デバッグ
    }
}

function saveData() {
    console.log("Saving data to localStorage..."); // デバッグ
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sleepRecords: appData.sleepRecords.map(rec => rec.toSerializable()),
        dailyConditions: appData.dailyConditions.map(cond => cond.toSerializable()),
        diaryEntries: appData.diaryEntries.map(entry => entry.toSerializable())
    }));
    console.log("Data saved."); // デバッグ
}

// --- サービスとロジック ---

const sleepTrackingService = {
    recordSleep: function(date, durationHours) {
        console.log(`Recording sleep: ${date.toDateString()}, ${durationHours} hours`); // デバッグ
        const record = new SleepRecord(date, durationHours);
        const existingIndex = appData.sleepRecords.findIndex(r => r.date.toDateString() === date.toDateString());
        if (existingIndex !== -1) {
            appData.sleepRecords[existingIndex] = record;
            console.log("Existing sleep record updated."); // デバッグ
        } else {
            appData.sleepRecords.push(record);
            console.log("New sleep record added."); // デバッグ
        }
        saveData();
        return "睡眠時間を記録しました！";
    },
    getSleepRecordByDate: function(date) {
        const record = appData.sleepRecords.find(r => r.date.toDateString() === date.toDateString());
        console.log(`Getting sleep record for ${date.toDateString()}:`, record); // デバッグ
        return record;
    },
    getSleepRecords: function(startDate, endDate) {
        const records = appData.sleepRecords.filter(record => {
            const recordDate = new Date(record.date.getFullYear(), record.date.getMonth(), record.date.getDate());
            return recordDate >= startDate && recordDate <= endDate;
        }).sort((a, b) => a.date.getTime() - b.date.getTime());
        console.log(`Getting sleep records from ${startDate.toDateString()} to ${endDate.toDateString()}:`, records); // デバッグ
        return records;
    },
    getAllSleepRecordsSorted: function() {
        const records = [...appData.sleepRecords].sort((a, b) => b.date.getTime() - a.date.getTime());
        console.log("Getting all sleep records (sorted):", records); // デバッグ
        return records;
    }
};

const dailyConditionService = {
    recordDailyCondition: function(date, feeling, energyLevel) {
        console.log(`Recording condition: ${date.toDateString()}, Feeling: ${feeling}, Energy: ${energyLevel}`); // デバッグ
        const condition = new DailyCondition(date, feeling, energyLevel);
        const existingIndex = appData.dailyConditions.findIndex(c => c.date.toDateString() === date.toDateString());
        if (existingIndex !== -1) {
            appData.dailyConditions[existingIndex] = condition;
            console.log("Existing condition record updated."); // デバッグ
        } else {
            appData.dailyConditions.push(condition);
            console.log("New condition record added."); // デバッグ
        }
        saveData();
        return "体調を記録しました！";
    },
    getDailyConditionByDate: function(date) {
        const condition = appData.dailyConditions.find(c => c.date.toDateString() === date.toDateString());
        console.log(`Getting condition record for ${date.toDateString()}:`, condition); // デバッグ
        return condition;
    },
    getAllDailyConditionsSorted: function() {
        const conditions = [...appData.dailyConditions].sort((a, b) => b.date.getTime() - a.date.getTime());
        console.log("Getting all condition records (sorted):", conditions); // デバッグ
        return conditions;
    }
};

const preSleepDiaryService = {
    addDiaryEntry: function(date, entryText) {
        console.log(`Recording diary: ${date.toDateString()}, Text: ${entryText.substring(0, 30)}...`); // デバッグ
        const entry = new PreSleepDiaryEntry(date, entryText);
        const existingIndex = appData.diaryEntries.findIndex(e => e.date.toDateString() === date.toDateString());
        if (existingIndex !== -1) {
            appData.diaryEntries[existingIndex] = entry; // 同じ日の日記は更新
            console.log("Existing diary entry updated."); // デバッグ
        } else {
            appData.diaryEntries.push(entry);
            console.log("New diary entry added."); // デバッグ
        }
        saveData();
        return "日記を記録しました！";
    },
    getDiaryEntryByDate: function(date) {
        const entry = appData.diaryEntries.find(e => e.date.toDateString() === date.toDateString());
        console.log(`Getting diary entry for ${date.toDateString()}:`, entry); // デバッグ
        return entry;
    },
    getAllDiaryEntriesSorted: function() {
        const entries = [...appData.diaryEntries].sort((a, b) => b.date.getTime() - a.date.getTime());
        console.log("Getting all diary entries (sorted):", entries); // デバッグ
        return entries;
    }
};

const sleepRecommendationEngine = {
    BASE_OPTIMAL_SLEEP_HOURS: 8.0,

    suggestOptimalSleepTime: function() {
        console.log("Suggesting optimal sleep time..."); // デバッグ
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);

        const recordsLastWeek = sleepTrackingService.getSleepRecords(startOfLastWeek, today);

        if (recordsLastWeek.length === 0) {
            console.log("No sleep records for recommendation."); // デバッグ
            return {
                time: this.BASE_OPTIMAL_SLEEP_HOURS,
                message: `記録がありません。まずは毎日睡眠時間を記録しましょう。<br>基本の**${this.BASE_OPTIMAL_SLEEP_HOURS}時間**を推奨します。`
            };
        }

        const totalSleepLastWeek = recordsLastWeek.reduce((sum, record) => sum + record.durationHours, 0);
        const averageSleepLastWeek = totalSleepLastWeek / recordsLastWeek.length;
        console.log(`Average sleep last week: ${averageSleepLastWeek.toFixed(1)} hours`); // デバッグ

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
        console.log(`Recommended sleep time: ${recommendedTime.toFixed(1)} hours`); // デバッグ
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

function getEnergyEmoji(energyLevel) {
    switch (energyLevel) {
        case '高い': return '🚀';
        case '普通': return '🚶‍♂️';
        case '低い': return '🔋';
        case '非常に低い': return '😴';
        default: return '';
    }
}

function showMessage(element, text, type) {
    element.textContent = text;
    element.style.color = (type === "success") ? "#28a745" : "red";
    console.log(`Displaying message (${type}): ${text}`); // デバッグ
    setTimeout(() => {
        element.textContent = '';
        console.log("Message cleared."); // デバッグ
    }, 3000);
}

let sleepChart = null; // Chart.jsインスタンスを保持する変数

function renderSleepChart(data) {
    console.log("Rendering sleep chart with data:", data); // デバッグ
    const ctx = document.getElementById('sleepDurationChart').getContext('2d');

    const labels = data.map(record => record.date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }));
    const sleepDurations = data.map(record => record.durationHours);

    if (sleepChart) {
        console.log("Updating existing chart."); // デバッグ
        // 既存のChartインスタンスがあればデータを更新
        sleepChart.data.labels = labels;
        sleepChart.data.datasets[0].data = sleepDurations;
        sleepChart.update(); // グラフを更新
    } else {
        console.log("Creating new chart instance."); // デバッグ
        // 新しいChartインスタンスを作成
        sleepChart = new Chart(ctx, {
            type: 'bar', // 棒グラフ
            data: {
                labels: labels,
                datasets: [{
                    label: '睡眠時間 (時間)',
                    data: sleepDurations,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', // 棒の色
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
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
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y + '時間';
                                }
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: '過去の睡眠時間グラフ'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}


// --- DOM操作とイベントリスナー ---
console.log("Adding DOMContentLoaded listener."); // デバッグ
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded fired."); // デバッグ
    loadData(); // ページ読み込み時にデータをロード

    // 各要素の取得
    const selectedDateInput = document.getElementById('selectedDate'); // 共通日付入力
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

    const showAllHistoryButton = document.getElementById('showAllHistoryButton');
    const allHistoryModal = document.getElementById('allHistoryModal');
    const closeModalButton = allHistoryModal.querySelector('.close-button');
    const allConditionHistoryList = document.getElementById('allConditionHistoryList');
    const allDiaryHistoryList = document.getElementById('allDiaryHistoryList');

    // 履歴表示部分（日付選択時の表示）
    const displaySleepDuration = document.getElementById('displaySleepDuration');
    const displayFeeling = document.getElementById('displayFeeling');
    const displayEnergyLevel = document.getElementById('displayEnergyLevel');
    const displayDiaryText = document.getElementById('displayDiaryText');

    // --- 初期設定 ---
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    selectedDateInput.value = todayISO;
    console.log("Initial selected date set to:", todayISO); // デバッグ
    updateFormsAndHistoryDisplay(); // 初期表示時に過去データがあれば反映

    // --- 関数 ---

    // 日付が変更されたときに各フォームの入力フィールドを更新し、履歴表示を更新する
    function updateFormsAndHistoryDisplay() {
        console.log("Updating forms and history display..."); // デバッグ
        const selectedDate = new Date(selectedDateInput.value);
        selectedDate.setHours(0, 0, 0, 0); // 時刻情報をクリアして日付のみにする
        console.log("Selected date for update:", selectedDate.toDateString()); // デバッグ

        // 睡眠記録を更新
        const sleepRecord = sleepTrackingService.getSleepRecordByDate(selectedDate);
        if (sleepRecord) {
            sleepDurationInput.value = sleepRecord.durationHours;
            displaySleepDuration.innerHTML = `**${sleepRecord.durationHours}時間**`;
            console.log("Sleep record found and updated."); // デバッグ
        } else {
            sleepDurationInput.value = '';
            displaySleepDuration.textContent = '未記録';
            console.log("No sleep record for this date."); // デバッグ
        }

        // 体調記録を更新
        const dailyCondition = dailyConditionService.getDailyConditionByDate(selectedDate);
        if (dailyCondition) {
            feelingSelect.value = dailyCondition.feeling;
            energyLevelSelect.value = dailyCondition.energyLevel;
            displayFeeling.innerHTML = `${getFeelingEmoji(dailyCondition.feeling)} 気分: **${dailyCondition.feeling}**`;
            displayEnergyLevel.innerHTML = `${getEnergyEmoji(dailyCondition.energyLevel)} エネルギー: **${dailyCondition.energyLevel}**`;
            console.log("Condition record found and updated."); // デバッグ
        } else {
            feelingSelect.value = '普通'; // デフォルト値
            energyLevelSelect.value = '普通'; // デフォルト値
            displayFeeling.textContent = '未記録';
            displayEnergyLevel.textContent = '';
            console.log("No condition record for this date."); // デバッグ
        }

        // 日記を更新
        const diaryEntry = preSleepDiaryService.getDiaryEntryByDate(selectedDate);
        if (diaryEntry) {
            diaryTextInput.value = diaryEntry.entryText;
            displayDiaryText.textContent = diaryEntry.entryText;
            console.log("Diary entry found and updated."); // デバッグ
        } else {
            diaryTextInput.value = '';
            displayDiaryText.textContent = '未記録';
            console.log("No diary entry for this date."); // デバッグ
        }
    }

    // --- イベントリスナー ---

    // 共通日付入力が変更されたときのイベント
    selectedDateInput.addEventListener('change', function() {
        console.log("Date input changed."); // デバッグ
        updateFormsAndHistoryDisplay();
    });

    // フォーム送信イベント（共通化）
    function handleFormSubmit(event, service, messageElement, inputElements, successMessage) {
        event.preventDefault();
        console.log("Form submitted. Service:", service.constructor.name); // デバッグ

        const date = new Date(selectedDateInput.value);
        date.setHours(0,0,0,0); // 時間をリセットして日付のみを保持

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
            updateFormsAndHistoryDisplay(); // 記録後に履歴表示を更新
        }
    }

    sleepRecordForm.addEventListener('submit', (e) => handleFormSubmit(e, sleepTrackingService, sleepRecordMessage, { sleepDuration: sleepDurationInput }));
    conditionForm.addEventListener('submit', (e) => handleFormSubmit(e, dailyConditionService, conditionMessage, { feeling: feelingSelect, energyLevel: energyLevelSelect }));
    diaryForm.addEventListener('submit', (e) => handleFormSubmit(e, preSleepDiaryService, diaryMessage, { diaryText: diaryTextInput }));

    // 最適な睡眠時間提案ボタンのクリックイベント
    suggestSleepButton.addEventListener('click', function() {
        console.log("Suggest sleep button clicked."); // デバッグ
        const result = sleepRecommendationEngine.suggestOptimalSleepTime();
        recommendedSleepTimeDisplay.innerHTML = result.message;
    });

    // 全記録表示ボタンのクリックイベント（モーダルを開く）
    showAllHistoryButton.addEventListener('click', function() {
        console.log("Show All History Button clicked. Attempting to open modal."); // デバッグ
        // 各リストをクリア
        allConditionHistoryList.innerHTML = '';
        allDiaryHistoryList.innerHTML = '';

        // 睡眠記録をグラフで表示
        const allSleepRecords = sleepTrackingService.getAllSleepRecordsSorted().reverse(); // グラフは古い順が自然なのでreverse
        if (allSleepRecords.length > 0) {
            renderSleepChart(allSleepRecords); // データがある場合のみグラフを描画/更新
            console.log("Sleep records found. Rendering chart."); // デバッグ
        } else {
            // データがない場合、既存のグラフがあれば破棄し、メッセージを表示
            if (sleepChart) {
                sleepChart.destroy();
                sleepChart = null; // Chartインスタンスをクリア
                console.log("No sleep records. Destroying existing chart."); // デバッグ
            }
            // 例えば、グラフのコンテナにメッセージを表示するなどの処理
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = '<p style="text-align: center; color: #777;">まだ睡眠時間の記録がありません。</p>';
                console.log("No sleep records. Displaying no-data message."); // デバッグ
            }
        }

        // 体調記録を顔文字付きで表示
        appData.dailyConditions.sort((a,b) => b.date - a.date).forEach(condition => { // 最新順
            const li = document.createElement('li');
            li.innerHTML = `<span>${condition.date.toLocaleDateString('ja-JP')}</span>：` +
                           `<span>${getFeelingEmoji(condition.feeling)} 気分: ${condition.feeling}</span>、` +
                           `<span>${getEnergyEmoji(condition.energyLevel)} エネルギー: ${condition.energyLevel}</span>`;
            allConditionHistoryList.appendChild(li);
        });
        if (appData.dailyConditions.length === 0) {
            allConditionHistoryList.innerHTML = '<li>まだ体調の記録がありません。</li>';
            console.log("No condition records."); // デバッグ
        }


        // 日記エントリを表示
        appData.diaryEntries.sort((a,b) => b.date - a.date).forEach(entry => { // 最新順
            const li = document.createElement('li');
            li.textContent = `${entry.date.toLocaleDateString('ja-JP')}：${entry.entryText.substring(0, 80)}${entry.entryText.length > 80 ? '...' : ''}`;
            allDiaryHistoryList.appendChild(li);
        });
        if (appData.diaryEntries.length === 0) {
            allDiaryHistoryList.innerHTML = '<li>まだ日記の記録がありません。</li>';
            console.log("No diary records."); // デバッグ
        }

        allHistoryModal.style.display = 'flex'; // モーダルを表示
        console.log("Modal display set to 'flex'."); // デバッグ
    });

    // モーダルを閉じるボタン
    closeModalButton.addEventListener('click', function() {
        console.log("Close button clicked. Setting modal display to 'none'."); // デバッグ
        allHistoryModal.style.display = 'none'; // モーダルを非表示
    });

    // モーダルの外側をクリックで閉じる
    window.addEventListener('click', function(event) {
        // クリックされた要素がモーダルの背景自体である場合にのみ閉じる
        if (event.target == allHistoryModal) {
            console.log("Clicked directly on modal background. Closing modal."); // デバッグ
            allHistoryModal.style.display = 'none';
        } else {
            console.log("Clicked on:", event.target, " (Not modal background, so not closing from this handler)."); // デバッグ
        }
    });
});

console.log("Script loaded and DOMContentLoaded listener configured."); // デバッグ