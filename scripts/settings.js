/* ============================================================
   19. SETTINGS
============================================================ */

function getCurrentLocationName() {

    return safeString(
        regionLocation?.name ||
        weatherLocation?.name,
        "未設定"
    );
}


function updateHomeRegionDisplay() {

    if (
        DOM.homeWeatherLocation
    ) {

        setText(
            DOM.homeWeatherLocation,
            getWeatherTarget().name
        );
    }
}


function updateSettingsView() {

    if (
        DOM.settingsLocationName
    ) {

        setText(
            DOM.settingsLocationName,
            getCurrentLocationName()
        );
    }


    updateThemeButton();
}


async function searchSettingsLocation() {

    const keyword =
        getValue(
            DOM.settingsLocationInput
        ).trim();


    if (
        !keyword
    ) {

        setText(
            DOM.settingsLocationMessage,
            "地域名を入力してください。"
        );

        setHTML(
            DOM.settingsLocationResults,
            ""
        );

        return;
    }


    try {

        setText(
            DOM.settingsLocationMessage,
            "地域を検索しています…"
        );


        setHTML(
            DOM.settingsLocationResults,
            ""
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
                DOM.settingsLocationMessage,
                "地域が見つかりませんでした。"
            );

            return;
        }


        setText(
            DOM.settingsLocationMessage,
            `${results.length}件の候補が見つかりました。`
        );


        renderSettingsLocationResults(
            results
        );

    } catch (error) {

        console.error(
            "[YOUTH NOW] 設定地域検索失敗",
            error
        );


        setText(
            DOM.settingsLocationMessage,
            "地域を検索できませんでした。"
        );
    }
}


function renderSettingsLocationResults(
    results
) {

    if (
        !DOM.settingsLocationResults
    ) {
        return;
    }


    const items =
        results.slice(
            0,
            8
        );


    setHTML(
        DOM.settingsLocationResults,
        items
            .map(
                (
                    item,
                    index
                ) =>
                    `
                    <button
                        type="button"
                        class="location-result"
                        data-settings-location-index="${index}"
                    >

                        <span class="location-result-main">

                            <span class="location-result-name">
                                ${escapeHTML(
                                    item.name ||
                                    item.display_name ||
                                    "地域"
                                )}
                            </span>

                            <span class="location-result-address">
                                ${escapeHTML(
                                    item.display_name ||
                                    ""
                                )}
                            </span>

                        </span>

                        <span class="location-result-arrow">
                            →
                        </span>

                    </button>
                    `
            )
            .join(
                ""
            )
    );


    $all(
        "[data-settings-location-index]"
    ).forEach(
        button => {

            addEvent(
                button,
                "click",
                event => {

                    event.preventDefault();


                    const index =
                        Number(
                            button.dataset
                                .settingsLocationIndex
                        );


                    const item =
                        items[
                            index
                        ];


                    if (
                        !item
                    ) {
                        return;
                    }


                    const location = {

                        name:
                            safeString(
                                item.name ||
                                item.city ||
                                item.town ||
                                item.display_name,
                                "地域"
                            ),

                        display_name:
                            safeString(
                                item.display_name
                            ),

                        prefecture:
                            safeString(
                                item.prefecture ||
                                item.state
                            ),

                        city:
                            safeString(
                                item.city
                            ),

                        town:
                            safeString(
                                item.town
                            ),

                        village:
                            safeString(
                                item.village
                            ),

                        latitude:
                            safeNumber(
                                item.latitude ??
                                item.lat
                            ),

                        longitude:
                            safeNumber(
                                item.longitude ??
                                item.lon
                            )
                    };


                    const weatherSaved =
                        saveWeatherLocation(
                            location
                        );


                    const regionSaved =
                        saveRegionLocation(
                            location
                        );


                    if (
                        weatherSaved ||
                        regionSaved
                    ) {

                        setText(
                            DOM.settingsLocationMessage,
                            `${location.name}を地域に設定しました。`
                        );


                        setHTML(
                            DOM.settingsLocationResults,
                            ""
                        );


                        if (
                            DOM.settingsLocationInput
                        ) {

                            setValue(
                                DOM.settingsLocationInput,
                                location.name
                            );
                        }


                        if (
                            DOM.locationInput
                        ) {

                            setValue(
                                DOM.locationInput,
                                location.name
                            );
                        }


                        updateSettingsView();

                        updateHomeRegionDisplay();

                        loadWeather();

                        loadDisaster();

                        announce(
                            `${location.name}を設定しました`
                        );
                    }
                }
            );
        }
    );
}


function useCurrentSettingsLocation() {

    if (
        !navigator.geolocation
    ) {

        setText(
            DOM.settingsLocationMessage,
            "このブラウザでは現在地を取得できません。"
        );

        return;
    }


    setText(
        DOM.settingsLocationMessage,
        "現在地を取得しています…"
    );


    navigator.geolocation.getCurrentPosition(

        async position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            let location = {

                name:
                    "現在地",

                latitude,

                longitude
            };


            try {

                const data =
                    await requestJSON(
                        `${APP_CONFIG.api.geocode}?latitude=${encodeURIComponent(
                            latitude
                        )}&longitude=${encodeURIComponent(
                            longitude
                        )}`
                    );


                const result =
                    data?.result ||
                    data;


                if (
                    result &&
                    typeof result ===
                        "object"
                ) {

                    location = {

                        name:
                            safeString(
                                result.name ||
                                result.city ||
                                result.town,
                                "現在地"
                            ),

                        display_name:
                            safeString(
                                result.display_name
                            ),

                        prefecture:
                            safeString(
                                result.prefecture
                            ),

                        city:
                            safeString(
                                result.city
                            ),

                        town:
                            safeString(
                                result.town
                            ),

                        village:
                            safeString(
                                result.village
                            ),

                        latitude,

                        longitude
                    };
                }

            } catch (error) {

                console.warn(
                    "[YOUTH NOW] 逆ジオコード失敗",
                    error
                );
            }


            saveWeatherLocation(
                location
            );


            saveRegionLocation(
                location
            );


            setText(
                DOM.settingsLocationMessage,
                `${location.name}を設定しました。`
            );


            updateSettingsView();

            updateHomeRegionDisplay();

            loadWeather();

            loadDisaster();

            announce(
                `${location.name}を設定しました`
            );
        },

        error => {

            console.error(
                "[YOUTH NOW] 現在地取得失敗",
                error
            );


            setText(
                DOM.settingsLocationMessage,
                error.code === 1
                    ? "位置情報の使用が許可されていません。"
                    : "現在地を取得できませんでした。"
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


function bindSettings() {

    addEvent(
        DOM.settingsThemeButton,
        "click",
        event => {

            event.preventDefault();

            toggleTheme();
        }
    );


    addEvent(
        DOM.settingsLocationSearchButton,
        "click",
        event => {

            event.preventDefault();

            searchSettingsLocation();
        }
    );


    addEvent(
        DOM.settingsLocationInput,
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchSettingsLocation();
            }
        }
    );


    addEvent(
        DOM.settingsCurrentLocationButton,
        "click",
        event => {

            event.preventDefault();

            useCurrentSettingsLocation();
        }
    );
}




