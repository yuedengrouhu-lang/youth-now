/* ============================================================
   21. TODAY SUMMARY
============================================================ */

function updateTodaySummary() {
    if (DOM.todaySummaryTime) setText(DOM.todaySummaryTime, formatFullDate(new Date()));
    const newsText = newsData.length ? "ニュース" + newsData.length + "件を確認。地域に関係する話題を優先しています。" : "ニュースを取得しています。";
    if (DOM.todaySummaryMessage) setText(DOM.todaySummaryMessage, newsText);
    if (DOM.todayNewsSummary) {
        const p = DOM.todayNewsSummary.querySelector("p");
        if (p) setText(p, newsText);
    }
    if (DOM.todayWeatherSummary) {
        const p = DOM.todayWeatherSummary.querySelector("p");
        const current = latestWeatherData?.current;
        if (p) setText(p, current && current.temperature !== null
            ? latestWeatherData.name + "は" + Math.round(current.temperature) + "℃、" + weatherCodeText(current.weatherCode) + "。"
            : "天気情報を取得しています。");
    }
    if (DOM.todayDisasterSummary) {
        const p = DOM.todayDisasterSummary.querySelector("p");
        const visible = getVisibleDisasterData();
        const count = visible.alerts.length + visible.earthquakes.length + visible.tsunamis.length + visible.typhoons.length;
        if (p) setText(p, disasterRequestFailed ? "防災情報を取得できません。公式情報をご確認ください。" : count ? "全国で掲載中の情報 " + count + "件。周辺への影響を確認してください。" : "掲載中の情報はありません。");
    }
    if (DOM.todaySummaryBottom) {
        const parts = [];
        if (lastNewsLoadTime) parts.push("ニュース " + formatTime(lastNewsLoadTime));
        if (lastWeatherLoadTime) parts.push("天気 " + formatTime(lastWeatherLoadTime));
        if (lastDisasterLoadTime) parts.push("防災 " + formatTime(lastDisasterLoadTime));
        if (lastTrafficLoadTime) parts.push("交通" + (trafficRequestFailed ? "確認 " : "検索 ") + formatTime(lastTrafficLoadTime));
        setText(DOM.todaySummaryBottom, parts.length ? "最終取得： " + parts.join(" · ") : "情報を取得しています。");
    }
    if (typeof updateDailyCondition === "function") updateDailyCondition();
}
/* ============================================================
   22. 自動更新
============================================================ */

function clearAutoRefreshTimers() {

    Object.values(
        autoRefreshTimers
    ).forEach(
        timer => {

            if (
                timer
            ) {

                clearInterval(
                    timer
                );
            }
        }
    );


    autoRefreshTimers = {
        news:
            null,

        weather:
            null,

        disaster:
            null,

        traffic:
            null,

        music:
            null
    };
}


function startAutoRefresh() {

    clearAutoRefreshTimers();


    autoRefreshTimers.news =
        setInterval(
            () => {

                if (
                    !newsLoading &&
                    currentCategory !== "FAVORITES" &&
                    currentCategory !== "READ_LATER"
                ) {

                    loadNews(
                        currentCategory,
                        searchWord
                    );
                }

            },
            APP_CONFIG.newsRefreshMs
        );


    autoRefreshTimers.weather =
        setInterval(
            () => {

                if (
                    !weatherLoading
                ) {

                    loadWeather();
                }

            },
            APP_CONFIG.weatherRefreshMs
        );


    autoRefreshTimers.disaster =
        setInterval(
            () => {

                if (
                    !disasterLoading
                ) {

                    loadDisaster();
                }

            },
            APP_CONFIG.disasterRefreshMs
        );


    autoRefreshTimers.music =
        setInterval(
            () => {

                if (
                    !musicLoading &&
                    musicData.length
                ) {

                    loadMusic(
                        musicSearchWord
                    );
                }

            },
            APP_CONFIG.musicRefreshMs
        );

    autoRefreshTimers.traffic = setInterval(() => {
        if (!trafficLoading) loadTraffic();
    }, APP_CONFIG.trafficRefreshMs);

    if (typeof updateDashboardMood === "function") {
        autoRefreshTimers.mood = setInterval(updateDashboardMood, 60 * 1000);
    }
}


/* ============================================================
   23. グローバルイベント
============================================================ */

function bindGlobalEvents() {

    addEvent(
        DOM.themeButton,
        "click",
        event => {

            event.preventDefault();

            toggleTheme();
        }
    );


    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                const now =
                    Date.now();


                if (
                    now -
                        lastNewsLoadTime >
                    APP_CONFIG.newsRefreshMs
                ) {

                    loadNews(
                        currentCategory
                    );
                }


                if (
                    now -
                        lastWeatherLoadTime >
                    APP_CONFIG.weatherRefreshMs
                ) {

                    loadWeather();
                }


                if (
                    now -
                        lastDisasterLoadTime >
                    APP_CONFIG.disasterRefreshMs
                ) {

                    loadDisaster();
                }

                if (now - lastTrafficLoadTime > APP_CONFIG.trafficRefreshMs) loadTraffic();
            }
        }
    );
}


/* ============================================================
   24. 初期データ
============================================================ */

async function loadInitialData() {

    await Promise.allSettled(
        [
            loadNews(
                "TOP"
            ),

            loadWeather(),

            loadDisaster(),

            loadTraffic(),

            loadMusic(
                "J-POP"
            )
        ]
    );


    renderHome();

    renderNews();

    renderMusic();

    renderWeather();

    renderDisaster();

    updateSettingsView();

    renderQuiz();
}


/* ============================================================
   25. 起動
============================================================ */

async function initYOUTHNOW() {

    if (
        appInitialized
    ) {
        return;
    }


    appInitialized =
        true;


    console.log(
        "[YOUTH NOW] 起動開始"
    );


    loadStoredState();

    if (typeof initPWA === "function") initPWA();
    if (typeof loadReadLaterNews === "function") loadReadLaterNews();
    if (typeof loadFollowedNewsTopics === "function") loadFollowedNewsTopics();
    if (typeof initDashboardCustomizer === "function") initDashboardCustomizer();
    if (typeof initAccessibilitySettings === "function") initAccessibilitySettings();

    loadTheme();

    bindNavigation();

    bindCommandPalette();

    bindNews();
    if (typeof bindTopicFollowing === "function") bindTopicFollowing();

    bindMusic();

    bindWeather();

    bindDisaster();

    if (typeof bindDashboardIntelligence === "function") bindDashboardIntelligence();

    bindSettings();

    bindAI();

    bindQuiz();

    bindGlobalEvents();


    updateCategoryButtons();

    updateHomeRegionDisplay();

    updateSettingsView();


    /*
     * 初期表示は必ずホーム
     */

    showPage(
        "home"
    );


    /*
     * 先に画面を表示してから
     * データを取得
     */

    renderHome();

    renderNews();

    renderMusic();

    renderWeather();

    renderDisaster();

    renderQuiz();


    await loadInitialData();


    startAutoRefresh();


    console.log(
        "[YOUTH NOW] 起動完了"
    );
}


/* ============================================================
   26. デバッグ
============================================================ */

window.YOUTHNOW = {

    reloadNews:
        () =>
            loadNews(
                currentCategory,
                searchWord
            ),

    reloadWeather:
        loadWeather,

    reloadDisaster:
        loadDisaster,

    reloadTraffic:
        loadTraffic,

    reloadMusic:
        () =>
            loadMusic(
                musicSearchWord
            ),

    renderNews,

    renderMusic,

    renderWeather,

    renderDisaster,

    renderHome,

    showPage,

    getState() {

        return {

            currentPage,

            currentCategory,

            searchWord,

            newsCount:
                newsData.length,

            musicCount:
                musicData.length,

            weatherLocation,

            regionLocation,

            latestWeatherData,

            disasterData,

            trafficData,

            aiProvider:
                "Groq API"
        };
    }
};


/* ============================================================
   27. DOMContentLoaded
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initYOUTHNOW
    );

} else {

    initYOUTHNOW();
}


console.log(
    "[YOUTH NOW] app.js 読み込み完了"
);
