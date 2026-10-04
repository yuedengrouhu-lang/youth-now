/* ============================================================
   14. WEATHER
============================================================ */

function getWeatherTarget() {

    if (
        weatherLocation
    ) {
        return weatherLocation;
    }


    return APP_CONFIG.defaultWeather;
}


function weatherCodeText(code) {
    const value = safeNumber(code, -1);
    const map = {
        0: "晴れ", 1: "おおむね晴れ", 2: "晴れ時々くもり", 3: "くもり",
        45: "霧", 48: "着氷性の霧", 51: "弱い霧雨", 53: "霧雨", 55: "強い霧雨",
        56: "弱い着氷性の霧雨", 57: "強い着氷性の霧雨", 61: "弱い雨", 63: "雨", 65: "強い雨",
        66: "弱いみぞれ", 67: "強いみぞれ", 71: "弱い雪", 73: "雪", 75: "大雪", 77: "霧雪",
        80: "弱いにわか雨", 81: "にわか雨", 82: "激しいにわか雨", 85: "弱いにわか雪", 86: "強いにわか雪",
        95: "雷雨", 96: "ひょうを伴う雷雨", 99: "激しいひょうを伴う雷雨"
    };
    return map[value] || "天気情報なし";
}

function weatherCodeIcon(
    code
) {

    const value =
        safeNumber(
            code,
            -1
        );


    if (
        value === 0
    ) {
        return "☀️";
    }


    if (
        value === 1 ||
        value === 2
    ) {
        return "🌤️";
    }


    if (
        value === 3
    ) {
        return "☁️";
    }


    if (
        value === 45 ||
        value === 48
    ) {
        return "🌫️";
    }


    if (
        value >= 51 &&
        value <= 67
    ) {
        return "🌧️";
    }


    if (
        value >= 71 &&
        value <= 86
    ) {
        return "🌨️";
    }


    if (
        value >= 95
    ) {
        return "⛈️";
    }


    return "🌤️";
}


function normalizeWeatherData(
    data
) {

    if (
        !data ||
        typeof data !==
            "object"
    ) {
        return null;
    }


    const current =
        data.current ||
        {};


    const daily =
        data.daily ||
        {};

    const hourly = data.hourly || {};


    const temperature =
        safeNumber(
            current.temperature_2m ??
            current.temperature
        );


    const humidity =
        safeNumber(
            current.relative_humidity_2m ??
            current.humidity
        );


    const apparentTemperature =
        safeNumber(
            current.apparent_temperature ??
            current.apparentTemperature
        );


    const weatherCode =
        safeNumber(
            current.weather_code ??
            current.weatherCode
        );


    const windSpeed =
        safeNumber(
            current.wind_speed_10m ??
            current.windSpeed
        );


    return {

        name:
            safeString(
                data.name,
                getWeatherTarget().name
            ),

        current: {

            temperature,

            humidity,

            apparentTemperature,

            weatherCode,

            windSpeed,

            time: safeString(current.time, "")
        },

        daily: {

            time:
                Array.isArray(
                    daily.time
                )
                    ? daily.time
                    : [],

            weatherCode:
                Array.isArray(
                    daily.weather_code
                )
                    ? daily.weather_code
                    : Array.isArray(
                        daily.weatherCode
                    )
                        ? daily.weatherCode
                        : [],

            temperatureMax:
                Array.isArray(
                    daily.temperature_2m_max
                )
                    ? daily.temperature_2m_max
                    : Array.isArray(
                        daily.temperatureMax
                    )
                        ? daily.temperatureMax
                        : [],

            temperatureMin:
                Array.isArray(
                    daily.temperature_2m_min
                )
                    ? daily.temperature_2m_min
                    : Array.isArray(
                        daily.temperatureMin
                    )
                        ? daily.temperatureMin
                        : [],

            precipitation:
                Array.isArray(
                    daily.precipitation_probability_max
                )
                    ? daily.precipitation_probability_max
                    : Array.isArray(
                        daily.precipitation
                    )
                        ? daily.precipitation
                        : [],

            sunrise:
                Array.isArray(
                    daily.sunrise
                )
                    ? daily.sunrise
                    : [],

            sunset:
                Array.isArray(
                    daily.sunset
                )
                    ? daily.sunset
                    : []
        },

        hourly: {
            time: Array.isArray(hourly.time) ? hourly.time : [],
            temperature: Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [],
            precipitationProbability: Array.isArray(hourly.precipitation_probability) ? hourly.precipitation_probability : [],
            precipitation: Array.isArray(hourly.precipitation) ? hourly.precipitation : [],
            weatherCode: Array.isArray(hourly.weather_code) ? hourly.weather_code : [],
            windSpeed: Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m : []
        },

        latitude: safeNumber(data.latitude),
        longitude: safeNumber(data.longitude),

        timezone:
            safeString(
                data.timezone,
                ""
            ),

        fetchedAt:
            safeString(
                data.fetchedAt,
                new Date().toISOString()
            )
    };
}


async function loadWeatherDirectly(target) {
    const params = new URLSearchParams({
        latitude: String(target.latitude),
        longitude: String(target.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        hourly: "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
        timezone: "auto"
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    return response.json();
}


async function loadWeather() {

    if (
        weatherLoading
    ) {
        return;
    }


    weatherLoading =
        true;


    const target =
        getWeatherTarget();


    try {

        if (
            DOM.weatherMessage
        ) {

            setText(
                DOM.weatherMessage,
                `${target.name}の天気を取得しています…`
            );
        }


        const params =
            new URLSearchParams();


        params.set(
            "latitude",
            String(
                target.latitude
            )
        );


        params.set(
            "longitude",
            String(
                target.longitude
            )
        );


        params.set(
            "name",
            target.name
        );


        let data;
        try {
            data = await requestJSON(
                `${APP_CONFIG.api.weather}?${params.toString()}`
            );
        } catch (error) {
            console.warn("[YOUTH NOW] サーバー経由の天気取得に失敗したため、直接取得します。", error);
            data = await loadWeatherDirectly(target);
        }


        latestWeatherData =
            normalizeWeatherData(
                data
            );

        weatherRequestFailed = false;


        lastWeatherLoadTime =
            Date.now();


        renderWeather();

        renderWeatherTimeline();

        updateHomeWeather();

        updateTodaySummary();
        if (typeof updateDataFreshness === "function") updateDataFreshness();


        if (
            DOM.weatherMessage
        ) {
            setText(
                DOM.weatherMessage,
                ""
            );
        }


        announce(
            "天気を更新しました"
        );

    } catch (error) {

        weatherRequestFailed = true;

        console.error(
            "[YOUTH NOW] 天気取得失敗",
            error
        );


        if (
            DOM.weatherMessage
        ) {
            setText(
                DOM.weatherMessage,
                "天気を取得できませんでした。"
            );

        }

        if (typeof updateDataFreshness === "function") updateDataFreshness();

    } finally {

        weatherLoading =
            false;
        if (typeof updateDataFreshness === "function") updateDataFreshness();
    }
}


