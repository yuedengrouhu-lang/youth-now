"use strict";

/*
============================================================
YOUTH NOW - browser configuration
HTML / CSS 完全対応版
============================================================
*/


/* ============================================================
   01. 基本設定
============================================================ */

const APP_CONFIG = {

    version:
        "8.0.0",

    newsRefreshMs:
        5 * 60 * 1000,

    weatherRefreshMs:
        10 * 60 * 1000,

    disasterRefreshMs:
        60 * 1000,

    trafficRefreshMs:
        5 * 60 * 1000,

    musicRefreshMs:
        10 * 60 * 1000,

    favoriteStorageKey:
        "youthNowFavorites",

    musicFavoriteStorageKey:
        "youthNowMusicFavorites",

    weatherStorageKey:
        "youthNowWeatherLocation",

    regionStorageKey:
        "youthNowRegionLocation",

    savedLocationsStorageKey:
        "youthNowSavedLocations",

    notificationSettingsStorageKey:
        "youthNowNotificationSettings",

    themeStorageKey:
        "youthNowTheme",

    lastPageStorageKey:
        "youthNowLastPage",

    api: {
        news:
            "/api/news",

        music:
            "/api/music",

        weather:
            "/api/weather",

        geocode:
            "/api/geocode",

        disaster:
            "/api/disaster",

        traffic:
            "/api/traffic",

        quiz:
            "/api/quiz",

        ai:
            "/api/ai/chat"
    },

    defaultWeather: {
        name:
            "東京",

        latitude:
            35.6762,

        longitude:
            139.6503
    }
};


