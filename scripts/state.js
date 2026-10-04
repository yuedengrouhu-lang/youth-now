/* Shared mutable application state. Load after config.js and before feature scripts. */

/* ============================================================
   02. 状態
============================================================ */

let currentPage =
    "home";

let currentCategory =
    "TOP";

let searchWord =
    "";

let newsData =
    [];

let musicData =
    [];

let musicSearchWord =
    "J-POP";

let favoriteLinks =
    [];

let musicFavorites =
    [];

let weatherLocation =
    null;

let regionLocation =
    null;

let latestWeatherData =
    null;

let disasterData = {
    alerts: [],
    earthquakes: [],
    tsunamis: [],
    typhoons: [],
    sources: {
        alerts: false,
        earthquakes: false,
        tsunamis: false
    },
    updatedAt: ""
};

let newsLoading =
    false;

let musicLoading =
    false;

let weatherLoading =
    false;

let disasterLoading =
    false;

let disasterRequestFailed =
    false;

let trafficData = {
    items: [],
    areas: [],
    provider: "",
    disclaimer: "",
    fetchedAt: ""
};

let trafficLoading = false;
let trafficRequestFailed = false;
let lastTrafficLoadTime = 0;

let weatherRequestFailed =
    false;

let newsRequestFailed =
    false;

let appInitialized =
    false;

let lastNewsLoadTime =
    0;

let lastMusicLoadTime =
    0;

let lastWeatherLoadTime =
    0;

let lastDisasterLoadTime =
    0;

let apiResponseMeta = {};

let quizIndex =
    0;

let quizAnswered =
    false;

let quizQuestions = [];
let quizCurrent = null;
let quizLoading = false;
let quizSeenPrefectures = new Set();
let autoRefreshTimers = {
    news:
        null,

    weather:
        null,

    disaster:
        null,

    music:
        null
};


