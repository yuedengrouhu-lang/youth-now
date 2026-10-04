/* Weather location search, geolocation, and related event bindings. */

/* ============================================================
   15. WEATHER 地域検索
============================================================ */

async function searchWeatherLocation() {

    const keyword =
        getValue(
            DOM.locationInput
        ).trim();


    if (
        !keyword
    ) {

        setText(
            DOM.weatherMessage,
            "地域名を入力してください。"
        );

        return;
    }


    try {

        setText(
            DOM.weatherMessage,
            "地域を検索しています…"
        );


        const data =
            await requestJSON(
                `${APP_CONFIG.api.geocode}?q=${encodeURIComponent(
                    keyword
                )}`
            );


        const results =
            Array.isArray(
                data
            )
                ? data
                : Array.isArray(
                    data?.results
                )
                    ? data.results
                    : [];


        if (
            !results.length
        ) {

            setText(
                DOM.weatherMessage,
                "地域が見つかりませんでした。"
            );

            return;
        }


        const first =
            results[0];


        const location = {
            name:
                safeString(
                    first.name ||
                    first.display_name,
                    keyword
                ),

            latitude:
                safeNumber(
                    first.latitude ??
                    first.lat
                ),

            longitude:
                safeNumber(
                    first.longitude ??
                    first.lon
                )
        };


        if (
            saveWeatherLocation(
                location
            )
        ) {

            setText(
                DOM.weatherMessage,
                `${location.name}に変更しました。`
            );


            loadWeather();
        }

    } catch (error) {

        console.error(
            "[YOUTH NOW] 地域検索失敗",
            error
        );


        setText(
            DOM.weatherMessage,
            "地域を検索できませんでした。"
        );
    }
}


function useCurrentWeatherLocation() {

    if (
        !navigator.geolocation
    ) {

        setText(
            DOM.weatherMessage,
            "このブラウザでは現在地を取得できません。"
        );

        return;
    }


    setText(
        DOM.weatherMessage,
        "現在地を取得しています…"
    );


    navigator.geolocation.getCurrentPosition(

        position => {

            const location = {

                name:
                    "現在地",

                latitude:
                    position.coords.latitude,

                longitude:
                    position.coords.longitude
            };


            saveWeatherLocation(
                location
            );


            saveRegionLocation(
                location
            );


            setText(
                DOM.weatherMessage,
                "現在地を設定しました。"
            );


            loadWeather();

            loadDisaster();

        },

        error => {

            console.error(
                "[YOUTH NOW] 位置情報取得失敗",
                error
            );


            let message =
                "現在地を取得できませんでした。";


            if (
                error.code ===
                1
            ) {

                message =
                    "位置情報の使用が許可されていません。ブラウザの設定を確認してください。";
            }


            setText(
                DOM.weatherMessage,
                message
            );
        },

        {
            enableHighAccuracy:
                false,

            timeout:
                10000,

            maximumAge:
                300000
        }
    );
}


function bindWeather() {

    addEvent(
        DOM.weatherRefreshButton,
        "click",
        event => {

            event.preventDefault();

            loadWeather();
        }
    );


    addEvent(
        DOM.locationSearchButton,
        "click",
        event => {

            event.preventDefault();

            searchWeatherLocation();
        }
    );


    addEvent(
        DOM.locationInput,
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchWeatherLocation();
            }
        }
    );


    addEvent(
        DOM.currentLocationButton,
        "click",
        event => {

            event.preventDefault();

            useCurrentWeatherLocation();
        }
    );
}


