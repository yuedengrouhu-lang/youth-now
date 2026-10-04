/* ============================================================
   20. QUIZ (Wikidata-backed)
============================================================ */

function shuffleQuizChoices(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

const QUIZ_STATS_STORAGE_KEY = "youthNowQuizStats";
let quizStats = { totalAnswers: 0, correctAnswers: 0, currentStreak: 0, bestStreak: 0, lastPlayedDate: "" };

function getQuizDateKey(date = new Date()) {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function normalizeQuizStats(value) {
    const safeCount = number => Number.isFinite(Number(number)) ? Math.max(0, Math.floor(Number(number))) : 0;
    return {
        totalAnswers: safeCount(value?.totalAnswers),
        correctAnswers: safeCount(value?.correctAnswers),
        currentStreak: safeCount(value?.currentStreak),
        bestStreak: safeCount(value?.bestStreak),
        lastPlayedDate: /^\d{4}-\d{2}-\d{2}$/.test(value?.lastPlayedDate || "") ? value.lastPlayedDate : ""
    };
}

function loadQuizStats() {
    quizStats = normalizeQuizStats(parseJSON(safeStorageGet(QUIZ_STATS_STORAGE_KEY), null));
    updateQuizStatsUI();
}

function updateQuizStatsUI() {
    const today = getQuizDateKey();
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const activeStreak = [today, yesterday].includes(quizStats.lastPlayedDate) ? quizStats.currentStreak : 0;
    setText(document.querySelector("#quiz-play-count"), String(quizStats.totalAnswers));
    setText(document.querySelector("#quiz-correct-count"), String(quizStats.correctAnswers));
    setText(document.querySelector("#quiz-streak-count"), String(activeStreak));
    setText(document.querySelector("#quiz-best-streak"), `最高 ${quizStats.bestStreak}日`);
}

function recordQuizAnswer(isCorrect) {
    const today = getQuizDateKey();
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    quizStats.totalAnswers += 1;
    if (isCorrect) quizStats.correctAnswers += 1;

    if (quizStats.lastPlayedDate !== today) {
        quizStats.currentStreak = quizStats.lastPlayedDate === yesterday ? quizStats.currentStreak + 1 : 1;
        quizStats.lastPlayedDate = today;
        quizStats.bestStreak = Math.max(quizStats.bestStreak, quizStats.currentStreak);
    }

    safeStorageSet(QUIZ_STATS_STORAGE_KEY, JSON.stringify(quizStats));
    updateQuizStatsUI();
}

function presentNextQuiz() {
    if (!quizQuestions.length) return false;

    let available = quizQuestions.filter(item => !quizSeenPrefectures.has(item.prefecture));
    if (!available.length) {
        quizSeenPrefectures.clear();
        available = quizQuestions;
    }

    const answer = available[Math.floor(Math.random() * available.length)];
    quizSeenPrefectures.add(answer.prefecture);

    const distractors = shuffleQuizChoices(
        quizQuestions.filter(item => item.prefecture !== answer.prefecture)
    ).slice(0, 3);
    const choices = shuffleQuizChoices([
        answer,
        ...distractors
    ]);

    quizCurrent = {
        question: `「${answer.capital}」を県庁所在地とする都道府県は？`,
        options: choices.map(item => item.prefecture),
        answer: choices.findIndex(item => item.prefecture === answer.prefecture)
    };
    quizAnswered = false;
    quizIndex += 1;

    setText(DOM.quizQuestion, quizCurrent.question);
    setHTML(DOM.quizOptions, quizCurrent.options.map((option, index) => `
        <button type="button" class="quiz-option" data-quiz-option="${index}">
            <span class="quiz-option-key">${String.fromCharCode(65 + index)}.</span>
            <span>${escapeHTML(option)}</span>
        </button>
    `).join(""));
    setText(DOM.quizResult, "");
    setText(DOM.quizNext, "次の問題");
    setDisabled(DOM.quizNext, true);
    return true;
}

async function loadQuizData() {
    if (quizLoading) return;

    quizLoading = true;
    setText(DOM.quizQuestion, "インターネットから問題を取得しています…");
    setHTML(DOM.quizOptions, "");
    setText(DOM.quizResult, "");
    setText(DOM.quizNext, "取得中…");
    setDisabled(DOM.quizNext, true);

    try {
        const data = await requestJSON(APP_CONFIG.api.quiz);
        const items = Array.isArray(data?.items)
            ? data.items.filter(item => item?.prefecture && item?.capital)
            : [];

        if (items.length < 4) {
            throw new Error("問題データが不足しています。");
        }

        quizQuestions = items;
        quizSeenPrefectures.clear();
        presentNextQuiz();
    } catch (error) {
        console.error("[YOUTH NOW] クイズ取得失敗:", error);
        quizCurrent = null;
        setText(DOM.quizQuestion, "クイズを取得できませんでした。ネット接続を確認して再取得してください。");
        setHTML(DOM.quizOptions, "");
        setText(DOM.quizNext, "再取得する");
        setDisabled(DOM.quizNext, false);
    } finally {
        quizLoading = false;
    }
}

function renderQuiz() {
    if (!DOM.quizQuestion || !DOM.quizOptions) return;
    loadQuizData();
}

function answerQuiz(answerIndex) {
    if (quizAnswered || !quizCurrent) return;
    quizAnswered = true;

    $all("[data-quiz-option]").forEach(button => {
        const index = Number(button.dataset.quizOption);
        button.disabled = true;
        if (index === quizCurrent.answer) button.classList.add("correct");
        if (index === answerIndex && index !== quizCurrent.answer) button.classList.add("wrong");
    });

    if (answerIndex === quizCurrent.answer) {
        setText(DOM.quizResult, "正解！ 🎉");
        announce("クイズ正解");
    } else {
        setText(DOM.quizResult, `不正解。正解は「${quizCurrent.options[quizCurrent.answer]}」です。`);
        announce("クイズ不正解");
    }

    recordQuizAnswer(answerIndex === quizCurrent.answer);

    setText(DOM.quizNext, "次の問題");
    setDisabled(DOM.quizNext, false);
}

function nextQuiz() {
    if (quizLoading) return;
    if (quizQuestions.length && presentNextQuiz()) return;
    loadQuizData();
}

function bindQuiz() {
    loadQuizStats();

    addEvent(DOM.quizOptions, "click", event => {
        const button = event.target.closest("[data-quiz-option]");
        if (!button || !DOM.quizOptions.contains(button)) return;
        event.preventDefault();
        answerQuiz(Number(button.dataset.quizOption));
    });

    addEvent(DOM.quizNext, "click", event => {
        event.preventDefault();
        nextQuiz();
    });
}
