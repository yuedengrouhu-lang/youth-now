/* ============================================================
   17. DISASTER
============================================================ */

function normalizeDisasterItem(
    item
) {

    if (
        !item ||
        typeof item !==
            "object"
    ) {
        return null;
    }


    return {

        id:
            safeString(
                item.id ||
                item.code ||
                item.eventId ||
                `${Math.random()}`
            ),

        title:
            safeString(
                item.title ||
                item.name ||
                item.headline,
                "防災情報"
            ),

        text:
            safeString(
                item.text ||
                item.description ||
                item.detail ||
                item.body,
                ""
            ),

        area:
            safeString(
                item.area ||
                item.region ||
                item.prefecture ||
                item.location,
                ""
            ),

        type:
            safeString(
                item.type ||
                item.category ||
                item.kind,
                ""
            ),

        level:
            safeString(
                item.level ||
                item.severity ||
                item.rank,
                ""
            ),

        status:
            safeString(
                item.status,
                ""
            ),

        time:
            safeString(
                item.time ||
                item.datetime ||
                item.dateTime ||
                item.updatedAt ||
                item.issuedAt,
                ""
            ),

        magnitude:
            safeNumber(
                item.magnitude ??
                item.mag
            ),

        latitude: safeNumber(item.latitude),

        longitude: safeNumber(item.longitude),

        depth:
            safeNumber(
                item.depth
            ),

        intensity:
            safeString(
                item.intensity ||
                item.maxIntensity,
                ""
            ),

        url:
            safeString(
                item.url ||
                item.link,
                ""
            )
    };
}


function normalizeDisasterData(
    data
) {

    return {

        alerts:
            Array.isArray(
                data?.alerts
            )
                ? data.alerts
                    .map(
                        normalizeDisasterItem
                    )
                    .filter(
                        Boolean
                    )
                : [],

        earthquakes:
            Array.isArray(
                data?.earthquakes
            )
                ? data.earthquakes
                    .map(
                        normalizeDisasterItem
                    )
                    .filter(
                        Boolean
                    )
                : [],

        tsunamis:
            Array.isArray(
                data?.tsunamis
            )
                ? data.tsunamis
                    .map(
                        normalizeDisasterItem
                    )
                    .filter(
                        Boolean
                    )
                : [],

        typhoons:
            Array.isArray(
                data?.typhoons
            )
                ? data.typhoons
                    .map(
                        normalizeDisasterItem
                    )
                    .filter(
                        Boolean
                    )
                : [],

        updatedAt:
            safeString(
                data?.updatedAt,
                ""
            ),

        sources: {
            alerts:
                typeof data?.sources?.alerts === "boolean"
                    ? data.sources.alerts
                    : Array.isArray(data?.alerts) && data.alerts.length > 0
                        ? true
                        : null,

            earthquakes:
                typeof data?.sources?.earthquakes === "boolean"
                    ? data.sources.earthquakes
                    : Array.isArray(data?.earthquakes) && data.earthquakes.length > 0
                        ? true
                        : null,

            tsunamis:
                typeof data?.sources?.tsunamis === "boolean"
                    ? data.sources.tsunamis
                    : Array.isArray(data?.tsunamis) && data.tsunamis.length > 0
                        ? true
                        : null
        }
    };
}


function getVisibleDisasterData() {
    return {
        ...disasterData,
        alerts: [...disasterData.alerts],
        earthquakes: [...disasterData.earthquakes],
        tsunamis: [...disasterData.tsunamis],
        typhoons: [...disasterData.typhoons]
    };
}


async function loadDisaster() {

    if (
        disasterLoading
    ) {
        return;
    }


    disasterLoading =
        true;

    setDisabled(DOM.disasterRefreshButton, true);
    DOM.disasterRefreshButton?.classList.add("is-loading");


    setText(
        DOM.disasterMessage,
        "防災情報を取得しています…"
    );


    try {

        const data =
            await requestJSON(
                APP_CONFIG.api.disaster
            );


        disasterData =
            normalizeDisasterData(
                data
            );

        disasterRequestFailed = false;


        lastDisasterLoadTime =
            Date.now();


        renderDisaster();

        updateDisasterOverview();

        updateHomeDisaster();

        updateTodaySummary();
        if (typeof updateDisasterIntelligence === "function") updateDisasterIntelligence();


        setText(
            DOM.disasterMessage,
            ""
        );


        announce(
            "防災情報を更新しました"
        );

    } catch (error) {

        disasterRequestFailed = true;
        lastDisasterLoadTime = Date.now();

        console.error(
            "[YOUTH NOW] 防災情報取得失敗",
            error
        );


        setText(
            DOM.disasterMessage,
            "防災情報を取得できませんでした。"
        );

        if (!disasterData.updatedAt) {
            disasterData.sources = {
                alerts: false,
                earthquakes: false,
                tsunamis: false
            };
        }

        renderDisaster();
        updateDisasterOverview();
        updateHomeDisaster();
        if (typeof updateDisasterIntelligence === "function") updateDisasterIntelligence();

    } finally {

        disasterLoading =
            false;

        if (typeof updateDataFreshness === "function") updateDataFreshness();

        setDisabled(DOM.disasterRefreshButton, false);
        DOM.disasterRefreshButton?.classList.remove("is-loading");
    }
}


function bindDisaster() {

    addEvent(DOM.disasterRefreshButton, "click", loadDisaster);

    const checklist = Array.from(
        document.querySelectorAll("[data-prep-check]")
    );
    const storageKey = "youthNowPreparednessChecklist";
    const saved = parseJSON(safeStorageGet(storageKey), {});

    const updateProgress = () => {
        const complete = checklist.filter(input => input.checked).length;
        const percent = checklist.length
            ? Math.round((complete / checklist.length) * 100)
            : 0;

        setText(
            document.querySelector("#prep-progress-count"),
            `${complete} / ${checklist.length}`
        );

        const bar = document.querySelector("#prep-progress-bar");
        if (bar) {
            bar.style.width = `${percent}%`;
        }

        checklist.forEach(input => {
            input.closest(".prep-check-item")?.classList.toggle("is-complete", input.checked);
        });
    };

    checklist.forEach(input => {
        input.checked = Boolean(saved?.[input.dataset.prepCheck]);
        input.addEventListener("change", () => {
            const state = Object.fromEntries(
                checklist.map(item => [item.dataset.prepCheck, item.checked])
            );
            safeStorageSet(storageKey, JSON.stringify(state));
            updateProgress();
            announce(`防災チェックを${input.checked ? "完了" : "未完了"}にしました`);
        });
    });

    updateProgress();
}


