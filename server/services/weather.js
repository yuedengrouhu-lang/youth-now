"use strict";

const { CACHE, CACHE_TTL, NEWS_CATEGORIES, PREVIEW_HOSTS, MAX_PREVIEW_BYTES, GoogleDecoder } = require("../config");
const { nowISO, safeString, safeNumber, setBoundedCache, fetchJSON } = require("../utils");
let lastGeocodeRequestAt = 0;

/* ============================================================
   15. WEATHER
============================================================ */

async function loadWeather(
    latitude,
    longitude,
    name
) {

    const lat =
        safeNumber(
            latitude
        );


    const lon =
        safeNumber(
            longitude
        );


    if (
        lat === null ||
        lon === null
    ) {

        throw new Error(
            "緯度または経度が不正です。"
        );
    }


    const cleanName =
        safeString(
            name,
            "現在地"
        );


    const cacheKey =
        `${lat.toFixed(
            4
        )},${lon.toFixed(
            4
        )}`;


    const cached =
        CACHE.weather.get(
            cacheKey
        );


    if (
        cached &&
        Date.now() -
            cached.time <
            CACHE_TTL.weather
    ) {

        return cached.data;
    }


    const url =
        "https://api.open-meteo.com/v1/forecast" +

        `?latitude=${encodeURIComponent(
            lat
        )}` +

        `&longitude=${encodeURIComponent(
            lon
        )}` +

        "&current=" +
        [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "weather_code",
            "wind_speed_10m"
        ].join(
            ","
        ) +

        "&daily=" +
        [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "sunrise",
            "sunset"
        ].join(
            ","
        ) +

        "&hourly=" +
        [
            "temperature_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m"
        ].join(
            ","
        ) +

        "&timezone=auto";


    const data =
        await fetchJSON(
            url,
            {
                timeout:
                    15000
            }
        );


    const normalized = {

        name:
            cleanName,

        latitude:
            lat,

        longitude:
            lon,

        timezone:
            safeString(
                data?.timezone,
                ""
            ),

        current:
            data?.current ||
            {},

        daily:
            data?.daily ||
            {},

        hourly:
            data?.hourly ||
            {},

        fetchedAt:
            nowISO()
    };


    setBoundedCache(
        CACHE.weather,
        cacheKey,
        {

            data:
                normalized,

            time:
                Date.now()
        }
    );


    return normalized;
}


/* ============================================================
   16. GEOCODE
   Open-Meteo Geocoding APIを使用
============================================================ */

async function respectGeocodeRateLimit() {

    const elapsed =
        Date.now() -
        lastGeocodeRequestAt;


    if (
        elapsed <
        1000
    ) {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1000 -
                    elapsed
                )
        );
    }


    lastGeocodeRequestAt =
        Date.now();
}


async function searchGeocode(
    query
) {

    const keyword =
        safeString(
            query
        );


    if (
        !keyword
    ) {

        return [];
    }


    const cacheKey =
        keyword.toLowerCase();


    const cached =
        CACHE.geocode.get(
            cacheKey
        );


    if (
        cached &&
        Date.now() -
            cached.time <
            CACHE_TTL.geocode
    ) {

        return cached.data;
    }


    await respectGeocodeRateLimit();


    const url =
        "https://geocoding-api.open-meteo.com/v1/search" +

        `?name=${encodeURIComponent(
            keyword
        )}` +

        "&count=8" +

        "&language=ja" +

        "&format=json";


    const data =
        await fetchJSON(
            url,
            {
                timeout:
                    15000
            }
        );


    const results =
        Array.isArray(
            data?.results
        )
            ? data.results
            : [];


    const normalized =
        results
            .map(
                item => ({

                    name:
                        safeString(
                            item?.name,
                            keyword
                        ),

                    display_name:
                        safeString(
                            [
                                item?.name,
                                item?.admin1,
                                item?.country
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    ", "
                                ),
                            keyword
                        ),

                    latitude:
                        safeNumber(
                            item?.latitude
                        ),

                    longitude:
                        safeNumber(
                            item?.longitude
                        ),

                    prefecture:
                        safeString(
                            item?.admin1
                        ),

                    city:
                        safeString(
                            item?.name
                        ),

                    country:
                        safeString(
                            item?.country
                        )
                })
            )
            .filter(
                item =>
                    item.latitude !==
                        null &&
                    item.longitude !==
                        null
            );


    setBoundedCache(
        CACHE.geocode,
        cacheKey,
        {

            data:
                normalized,

            time:
                Date.now()
        }
    );


    return normalized;
}




module.exports = { loadWeather, searchGeocode };
