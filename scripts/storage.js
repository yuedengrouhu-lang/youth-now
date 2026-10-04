/* ============================================================
   06. LocalStorage
============================================================ */

function safeStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn("[YOUTH NOW] Local storage is unavailable", error);
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn("[YOUTH NOW] Could not save local state", error);
    }
}
function loadStoredState() {

    const storedFavorites =
        parseJSON(
            safeStorageGet(
                APP_CONFIG.favoriteStorageKey
            ),
            []
        );


    favoriteLinks =
        Array.isArray(
            storedFavorites
        )
            ? storedFavorites.filter(
                item =>
                    typeof item ===
                    "string"
            )
            : [];


    const storedMusicFavorites =
        parseJSON(
            safeStorageGet(
                APP_CONFIG.musicFavoriteStorageKey
            ),
            []
        );


    musicFavorites =
        Array.isArray(
            storedMusicFavorites
        )
            ? storedMusicFavorites
            : [];


    const storedWeather =
        parseJSON(
            safeStorageGet(
                APP_CONFIG.weatherStorageKey
            ),
            null
        );


    if (
        storedWeather &&
        Number.isFinite(
            Number(
                storedWeather.latitude
            )
        ) &&
        Number.isFinite(
            Number(
                storedWeather.longitude
            )
        )
    ) {

        weatherLocation = {
            name:
                safeString(
                    storedWeather.name,
                    "地域"
                ),

            latitude:
                Number(
                    storedWeather.latitude
                ),

            longitude:
                Number(
                    storedWeather.longitude
                )
        };
    }


    const storedRegion =
        parseJSON(
            safeStorageGet(
                APP_CONFIG.regionStorageKey
            ),
            null
        );


    if (
        storedRegion &&
        Number.isFinite(
            Number(
                storedRegion.latitude
            )
        ) &&
        Number.isFinite(
            Number(
                storedRegion.longitude
            )
        )
    ) {

        regionLocation = {
            ...storedRegion,

            name:
                safeString(
                    storedRegion.name,
                    "地域"
                ),

            latitude:
                Number(
                    storedRegion.latitude
                ),

            longitude:
                Number(
                    storedRegion.longitude
                )
        };
    }


    const savedPage =
        safeString(
            safeStorageGet(
                APP_CONFIG.lastPageStorageKey
            ),
            "home"
        );


    const validPages = new Set([
        "home",
        "news",
        "music",
        "weather",
        "disaster",
        "ai",
        "settings"
    ]);


    if (
        validPages.has(
            savedPage
        )
    ) {
        currentPage =
            savedPage;
    }
}


function saveFavorites() {
    safeStorageSet(
        APP_CONFIG.favoriteStorageKey,
        JSON.stringify(
            favoriteLinks
        )
    );
}


function saveMusicFavorites() {
    safeStorageSet(
        APP_CONFIG.musicFavoriteStorageKey,
        JSON.stringify(
            musicFavorites
        )
    );
}


function saveWeatherLocation(
    location
) {
    if (
        !location
    ) {
        return false;
    }


    const latitude =
        safeNumber(
            location.latitude
        );

    const longitude =
        safeNumber(
            location.longitude
        );


    if (
        latitude === null ||
        longitude === null
    ) {
        return false;
    }


    weatherLocation = {

        name:
            safeString(
                location.name,
                "地域"
            ),

        latitude,

        longitude
    };


    safeStorageSet(
        APP_CONFIG.weatherStorageKey,
        JSON.stringify(
            weatherLocation
        )
    );


    updateHomeRegionDisplay();

    updateSettingsView();

    return true;
}


function saveRegionLocation(
    location
) {
    if (
        !location
    ) {
        return false;
    }


    const latitude =
        safeNumber(
            location.latitude
        );

    const longitude =
        safeNumber(
            location.longitude
        );


    if (
        latitude === null ||
        longitude === null
    ) {
        return false;
    }


    regionLocation = {

        ...location,

        name:
            safeString(
                location.name,
                "地域"
            ),

        latitude,

        longitude
    };


    safeStorageSet(
        APP_CONFIG.regionStorageKey,
        JSON.stringify(
            regionLocation
        )
    );


    updateSettingsView();

    return true;
}


