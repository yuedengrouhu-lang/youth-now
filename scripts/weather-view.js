/* Weather rendering, hourly timeline, forecasts, and dashboard summary. */

function renderWeather() {

    if (
        !DOM.weatherMain
    ) {
        return;
    }


    const target =
        getWeatherTarget();


    if (
        DOM.weatherLocationName
    ) {
        setText(
            DOM.weatherLocationName,
            target.name
        );
    }


    if (
        DOM.weatherUpdated
    ) {

        setText(
            DOM.weatherUpdated,
            latestWeatherData
                ? `更新 ${formatDateTime(
                    lastWeatherLoadTime
                )}`
                : "--"
        );
    }


    if (
        !latestWeatherData
    ) {

        setText(
            DOM.weatherIcon,
            "🌤️"
        );

        setText(
            DOM.weatherTemperature,
            "--℃"
        );

        setText(
            DOM.weatherCondition,
            "読み込み中"
        );

        setText(
            DOM.weatherApparent,
            "--℃"
        );

        setText(
            DOM.weatherHumidity,
            "--%"
        );

        setText(
            DOM.weatherWind,
            "-- km/h"
        );


        if (
            DOM.weatherForecast
        ) {

            setHTML(
                DOM.weatherForecast,
                `
                <div class="forecast-loading">
                    天気予報を読み込んでいます…
                </div>
                `
            );
        }


        return;
    }


    const current =
        latestWeatherData.current;


    setText(
        DOM.weatherIcon,
        weatherCodeIcon(
            current.weatherCode
        )
    );


    setText(
        DOM.weatherTemperature,
        current.temperature !== null
            ? `${Math.round(
                current.temperature
            )}℃`
            : "--℃"
    );


    setText(
        DOM.weatherCondition,
        weatherCodeText(
            current.weatherCode
        )
    );


    setText(
        DOM.weatherApparent,
        current.apparentTemperature !== null
            ? `${Math.round(
                current.apparentTemperature
            )}℃`
            : "--℃"
    );


    setText(
        DOM.weatherHumidity,
        current.humidity !== null
            ? `${Math.round(
                current.humidity
            )}%`
            : "--%"
    );


    setText(
        DOM.weatherWind,
        current.windSpeed !== null
            ? `${Math.round(
                current.windSpeed
            )} km/h`
            : "-- km/h"
    );


    renderWeatherForecast();
    renderWeatherTimeline();
}

function renderWeatherTimeline() {
    const track = document.querySelector("#weather-timeline");
    const note = document.querySelector("#weather-rain-note");
    const hourly = latestWeatherData?.hourly;
    if (!track || !hourly?.time?.length) {
        if (track) track.innerHTML = '<p class="timeline-empty">時間別予報を取得できません。</p>';
        if (note) setText(note, "時間別の雨予報はありません。");
        return;
    }

    const currentTime = latestWeatherData.current.time;
    let start = currentTime ? hourly.time.findIndex(time => time >= currentTime) : 0;
    if (start < 0) start = 0;
    const entries = hourly.time.slice(start, start + 18).map((time, offset) => ({
        time,
        index: start + offset,
        temperature: safeNumber(hourly.temperature[start + offset]),
        probability: safeNumber(hourly.precipitationProbability[start + offset]),
        precipitation: safeNumber(hourly.precipitation[start + offset]),
        code: safeNumber(hourly.weatherCode[start + offset]),
        wind: safeNumber(hourly.windSpeed[start + offset])
    }));

    track.innerHTML = entries.map((item, index) => {
        const hour = item.time.match(/T(\d{2}):/)?.[1] ?? "--";
        const rainy = (item.probability ?? 0) >= 50 || (item.precipitation ?? 0) >= 0.2;
        return `<article class="weather-hour-card${rainy ? " is-rainy" : ""}"${index === 0 ? ' aria-current="time"' : ""}>
            <time datetime="${escapeHTML(item.time)}">${hour}時</time>
            <span class="hour-weather-icon" aria-hidden="true">${weatherCodeIcon(item.code)}</span>
            <strong>${item.temperature === null ? "--" : `${Math.round(item.temperature)}°`}</strong>
            <span>☔ ${item.probability === null ? "—" : `${Math.round(item.probability)}%`}</span>
            <span>💨 ${item.wind === null ? "—" : `${Math.round(item.wind)} km/h`}</span>
            <small>${escapeHTML(weatherCodeText(item.code))}</small>
        </article>`;
    }).join("");

    const approaching = entries.slice(0, 4).find(item => (item.probability ?? 0) >= 50 || (item.precipitation ?? 0) >= 0.2);
    if (note) {
        note.classList.toggle("is-rain-approaching", Boolean(approaching));
        setText(note, approaching
            ? `${approaching.time.match(/T(\d{2}):/)?.[1] ?? "まもなく"}時ごろ雨の可能性があります。傘の準備を。`
            : "直近の時間別予報では、雨が近づくサインはありません。");
    }
    if (typeof updateDashboardMood === "function") updateDashboardMood();
}


function formatWeatherDay(
    dateString,
    index
) {

    if (
        index === 0
    ) {
        return "今日";
    }


    if (
        index === 1
    ) {
        return "明日";
    }


    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return dateString;
    }


    return date.toLocaleDateString(
        "ja-JP",
        {
            month:
                "numeric",

            day:
                "numeric",

            weekday:
                "short"
        }
    );
}


function renderWeatherForecast() {

    if (
        !DOM.weatherForecast ||
        !latestWeatherData
    ) {
        return;
    }


    const daily =
        latestWeatherData.daily;


    const count =
        Math.min(
            daily.time.length,
            7
        );


    if (
        !count
    ) {

        setHTML(
            DOM.weatherForecast,
            `
            <div class="forecast-loading">
                予報データがありません。
            </div>
            `
        );

        return;
    }


    let html =
        "";


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const date =
            daily.time[i];

        const code =
            daily.weatherCode[i];

        const max =
            safeNumber(
                daily.temperatureMax[i]
            );

        const min =
            safeNumber(
                daily.temperatureMin[i]
            );

        const rain =
            safeNumber(
                daily.precipitation[i]
            );


        html += `
            <div class="forecast-item">

                <span class="forecast-day">
                    ${escapeHTML(
                        formatWeatherDay(
                            date,
                            i
                        )
                    )}
                </span>

                <span
                    class="forecast-icon"
                    aria-hidden="true"
                >
                    ${weatherCodeIcon(
                        code
                    )}
                </span>

                <span class="forecast-condition">
                    ${escapeHTML(
                        weatherCodeText(
                            code
                        )
                    )}
                    ${
                        rain !== null
                            ? ` · 降水 ${Math.round(
                                rain
                              )}%`
                            : ""
                    }
                </span>

                <span class="forecast-temp">

                    ${
                        max !== null
                            ? `${Math.round(
                                max
                              )}℃`
                            : "--"
                    }

                    /

                    ${
                        min !== null
                            ? `${Math.round(
                                min
                              )}℃`
                            : "--"
                    }

                </span>

            </div>
        `;
    }


    setHTML(
        DOM.weatherForecast,
        html
    );
}


function updateHomeWeather() {

    if (
        !DOM.homeWeatherTemp
    ) {
        return;
    }


    const target =
        getWeatherTarget();


    setText(
        DOM.homeWeatherLocation,
        target.name
    );


    if (
        !latestWeatherData
    ) {

        setText(
            DOM.homeWeatherIcon,
            "🌤️"
        );

        setText(
            DOM.homeWeatherTemp,
            "--℃"
        );

        setText(
            DOM.homeWeatherCondition,
            "読み込み中"
        );

        setText(
            DOM.homeWeatherExtra,
            ""
        );

        return;
    }


    const current =
        latestWeatherData.current;


    setText(
        DOM.homeWeatherIcon,
        weatherCodeIcon(
            current.weatherCode
        )
    );


    setText(
        DOM.homeWeatherTemp,
        current.temperature !== null
            ? `${Math.round(
                current.temperature
            )}℃`
            : "--℃"
    );


    setText(
        DOM.homeWeatherCondition,
        weatherCodeText(
            current.weatherCode
        )
    );


    const extras = [];


    if (
        current.windSpeed !== null
    ) {

        extras.push(
            `💨 ${Math.round(
                current.windSpeed
            )} km/h`
        );
    }


    if (
        current.humidity !== null
    ) {

        extras.push(
            `💧 ${Math.round(
                current.humidity
            )}%`
        );
    }


    setText(
        DOM.homeWeatherExtra,
        extras.join(
            "　"
        )
    );
}


