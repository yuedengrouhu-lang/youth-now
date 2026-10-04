/* Disaster alert, earthquake, tsunami, and home-card rendering. */

function renderDisasterItem(
    item,
    type
) {

    let extra = "";


    if (
        type ===
        "earthquake"
    ) {

        extra +=
            item.magnitude !== null
                ? `M${item.magnitude} `
                : "";


        if (
            item.intensity
        ) {

            extra +=
                `最大震度 ${escapeHTML(
                    item.intensity
                )}`;
        }


        if (
            item.depth !== null
        ) {

            extra +=
                ` · 深さ ${Math.round(
                    item.depth
                )}km`;
        }
    }


    if (
        type ===
        "alert"
    ) {

        extra =
            safeString(
                item.level,
                "情報"
            );
    }


    if (
        type ===
        "tsunami"
    ) {

        extra =
            "津波情報";
    }


    if (
        type ===
        "typhoon"
    ) {

        extra =
            "台風情報";
    }


    let dangerClass =
        "";


    const text =
        [
            item.title,
            item.text,
            item.level
        ]
            .join(
                " "
            );


    if (/特別警報|大津波警報/.test(text)) {
        dangerClass = "danger";
    } else if (/警報|注意報/.test(text)) {
        dangerClass = "alert";
    } else {
        dangerClass = "info";
    }
    return `
        <article
            class="disaster-item ${dangerClass}"
        >

            <div class="disaster-item-header">

                <h3 class="disaster-item-title">
                    ${escapeHTML(
                        item.title
                    )}
                </h3>

                <span class="disaster-item-time">
                    ${escapeHTML(
                        formatDateTime(
                            item.time
                        )
                    )}
                </span>

            </div>


            ${
                item.area
                    ? `
                        <div class="disaster-item-text">
                            📍 ${escapeHTML(
                                item.area
                            )}
                        </div>
                      `
                    : ""
            }


            ${
                item.text
                    ? `
                        <div class="disaster-item-text">
                            ${escapeHTML(
                                item.text
                            )}
                        </div>
                      `
                    : ""
            }


            ${
                extra
                    ? `
                        <div class="disaster-item-meta">
                            <span class="disaster-meta-tag">
                                ${extra}
                            </span>
                        </div>
                      `
                    : ""
            }

        </article>
    `;
}


function renderDisasterList(
    element,
    items,
    type,
    emptyMessage,
    sourceAvailable = true
) {

    if (
        !element
    ) {
        return;
    }


    if (
        !items.length
    ) {

        const message = sourceAvailable === true || type === "typhoon"
            ? emptyMessage
            : sourceAvailable === null
                ? "この情報源の取得状況は確認できません。最新情報は公式発表をご確認ください。"
                : "この情報源からデータを取得できません。公式情報もご確認ください。";

        setHTML(
            element,
            `
            <div class="empty-card">
                ${escapeHTML(
                    message
                )}
            </div>
            `
        );

        return;
    }


    setHTML(
        element,
        items
            .slice(
                0,
                30
            )
            .map(
                item =>
                    renderDisasterItem(
                        item,
                        type
                    )
            )
            .join(
                ""
            )
    );
}


function updateDisasterOverview() {

    const sources = disasterData.sources || {};
    const sourceStates = [sources.alerts, sources.earthquakes, sources.tsunamis];
    const availableCount = sourceStates.filter(Boolean).length;
    const knownSourceCount = sourceStates.filter(value => typeof value === "boolean").length;
    const unknownSourceCount = sourceStates.length - knownSourceCount;
    const sourcesUnknown = knownSourceCount !== sourceStates.length;
    const allUnavailable = availableCount === 0;
    const partial = availableCount > 0 && availableCount < sourceStates.length;
    const alertCount = disasterData.alerts.length;
    const alertText = disasterData.alerts
        .map(item => [item.title, item.level, item.text].join(" "))
        .join(" ");
    const severe = /特別警報|大津波警報/.test(alertText);
    const hasWarning = /警報|注意報/.test(alertText);
    const availableNames = [
        sources.alerts ? "警報" : "",
        sources.earthquakes ? "地震" : "",
        sources.tsunamis ? "津波" : ""
    ].filter(Boolean);
    let state = "clear";
    let status = "配信情報内に警報なし";
    let title = "確認できる速報情報を表示しています";
    let message = "この表示は全国速報の範囲です。避難判断は自治体の発表と現地の状況も合わせてご確認ください。";

    if (disasterRequestFailed && disasterData.updatedAt) {
        state = severe ? "danger" : "partial";
        status = severe
            ? "更新失敗 · 前回情報に特別警報等"
            : "更新に失敗 · 前回データを表示中";
        title = "表示中の情報は前回取得時点のものです";
        message = severe
            ? "前回データに重大な警報が含まれています。最新情報を再取得できていないため、ただちに公式発表をご確認ください。"
            : "最新情報を再取得できませんでした。下の公式リンクで現在の発表をご確認ください。";
    } else if (allUnavailable && !sourcesUnknown) {
        state = "error";
        status = "情報を取得できません";
        title = "公式情報を直接ご確認ください";
        message = "気象庁データに接続できませんでした。下の公式リンクから最新の発表をご確認ください。";
    } else if (severe) {
        state = "danger";
        status = "特別警報等の発表あり";
        title = "公式発表と自治体の避難情報を確認";
        message = "重大な警報に該当する発表を受信しています。該当地域・対象災害を確認し、自治体の指示に従ってください。";
    } else if (hasWarning || alertCount > 0) {
        state = "warning";
        status = "警報・注意報の発表あり";
        title = "発表内容と対象地域を確認";
        message = "警報・注意報を受信しています。対象地域と自治体からの避難情報を確認してください。";
    } else if (sourcesUnknown && availableCount > 0) {
        state = "partial";
        status = `${availableNames.join("・")}速報を受信`;
        title = "受信できた速報情報を表示中です";
        message = "地震情報など受信できたデータを表示しています。状態を確認できない情報源もあるため、警報・津波情報は公式発表をご確認ください。";
    } else if (sourcesUnknown) {
        state = "partial";
        status = "取得元の接続状態が不明です";
        title = "情報源の状態を確認できません";
        message = "サーバーが情報源ごとの取得状況を返していません。サーバーを再起動するか、下の公式情報をご確認ください。";
    } else if (partial) {
        state = "partial";
        status = "一部の情報を取得できません";
        title = "情報源の一部が未接続です";
        message = "表示中の情報が一部欠けている可能性があります。公式情報で最新状況をご確認ください。";
    }

    if (DOM.disasterOverview) {
        DOM.disasterOverview.dataset.state = state;
    }

    if (DOM.disasterOverallStatus) {
        DOM.disasterOverallStatus.className = `disaster-overall-status is-${state}`;
        setText(DOM.disasterOverallStatus, status);
    }

    setText(DOM.disasterOverviewTitle, title);
    setText(DOM.disasterOverviewMessage, message);
    setText(
        DOM.disasterDataStatus,
        disasterRequestFailed && disasterData.updatedAt
            ? "再取得失敗 · 前回接続時の情報"
            : allUnavailable && !sourcesUnknown
                ? "気象庁データに接続できません"
                : sourcesUnknown
                    ? availableCount > 0
                        ? `${availableCount}件受信 · ${unknownSourceCount}件の取得状態は未確認`
                        : "取得状況を確認できません"
                    : `情報源 ${availableCount} / ${sourceStates.length} 件 接続`
    );

    setText(DOM.disasterAlertCount, sources.alerts ? String(disasterData.alerts.length) : "—");
    setText(DOM.disasterEarthquakeCount, sources.earthquakes ? String(disasterData.earthquakes.length) : "—");
    setText(DOM.disasterTsunamiCount, sources.tsunamis ? String(disasterData.tsunamis.length) : "—");

    if (DOM.disasterUpdatedAt) {
        const date = disasterData.updatedAt ? new Date(disasterData.updatedAt) : null;
        setText(
            DOM.disasterUpdatedAt,
            date && !Number.isNaN(date.getTime())
                ? formatDateTime(date)
                : "未取得"
        );
        if (date && !Number.isNaN(date.getTime())) {
            DOM.disasterUpdatedAt.dateTime = date.toISOString();
        } else {
            DOM.disasterUpdatedAt.removeAttribute("datetime");
        }
    }
}


function renderDisaster() {

    const visible =
        getVisibleDisasterData();


    renderDisasterList(
        DOM.disasterAlertList,
        visible.alerts,
        "alert",
        "この配信データでは現在確認できる警報・注意報はありません。自治体の発表もご確認ください。",
        visible.sources.alerts
    );


    renderDisasterList(
        DOM.earthquakeList,
        visible.earthquakes,
        "earthquake",
        "この配信データに掲載中の地震情報はありません。",
        visible.sources.earthquakes
    );


    renderDisasterList(
        DOM.tsunamiList,
        visible.tsunamis,
        "tsunami",
        "この配信フィードに津波関連の報はありません。発表中の警報は気象庁でご確認ください。",
        visible.sources.tsunamis
    );


    renderDisasterList(
        DOM.typhoonList,
        visible.typhoons,
        "typhoon",
        "台風の実況データはこの画面では配信していません。気象庁の公式情報をご確認ください。",
        false
    );

    updateDisasterOverview();
}


function updateHomeDisaster() {

    if (
        !DOM.homeDisasterStatus
    ) {
        return;
    }


    const visible =
        getVisibleDisasterData();


    const alertCount =
        visible.alerts.length;


    const earthquakeCount =
        visible.earthquakes.length;


    const tsunamiCount =
        visible.tsunamis.length;


    const typhoonCount =
        visible.typhoons.length;


    const sources = disasterData.sources || {};
    const sourceStates = [sources.alerts, sources.earthquakes, sources.tsunamis];
    const sourcesUnknown = sourceStates.some(value => typeof value !== "boolean");
    const allUnavailable = !sourcesUnknown && sourceStates.every(value => !value);
    const dangerous =
        visible.alerts.some(
            item =>
                /特別警報|警報/.test(
                    [
                        item.title,
                        item.level,
                        item.text
                    ]
                        .join(
                            " "
                        )
                )
        );


    DOM.homeDisasterCard?.classList.toggle(
        "disaster-warning",
        dangerous
    );


    if (disasterRequestFailed && disasterData.updatedAt) {
        DOM.homeDisasterStatus.className = "status-badge status-warning";
        setText(DOM.homeDisasterStatus, "更新失敗・前回情報");
    } else if (allUnavailable) {
        DOM.homeDisasterStatus.className = "status-badge status-danger";
        setText(DOM.homeDisasterStatus, "情報を取得できません");
    } else if (dangerous) {

        DOM.homeDisasterStatus.className =
            "status-badge status-danger";


        setText(
            DOM.homeDisasterStatus,
            "注意が必要です"
        );

    } else if (
        alertCount
    ) {

        DOM.homeDisasterStatus.className =
            "status-badge status-warning";


        setText(
            DOM.homeDisasterStatus,
            "警報・注意報あり"
        );

    } else if (sourcesUnknown) {
        DOM.homeDisasterStatus.className = "status-badge status-warning";
        setText(DOM.homeDisasterStatus, "一部の情報源は未確認");

    } else {

        DOM.homeDisasterStatus.className =
            "status-badge status-safe";


        setText(
            DOM.homeDisasterStatus,
            "全国速報を確認"
        );
    }


    const parts = [];


    if (
        alertCount
    ) {
        parts.push(
            `警報・注意報 ${alertCount}件`
        );
    }


    if (
        earthquakeCount
    ) {
        parts.push(
            `地震 ${earthquakeCount}件`
        );
    }


    if (
        tsunamiCount
    ) {
        parts.push(
            `津波関連報 ${tsunamiCount}件`
        );
    }


    if (
        typhoonCount
    ) {
        parts.push(
            `台風 ${typhoonCount}件`
        );
    }


    const summary = parts.length
        ? parts.join("　")
        : allUnavailable
            ? "防災情報を取得できません。公式情報をご確認ください。"
            : sourcesUnknown
                ? "防災情報の取得状況を確認できません。サーバーを再起動してください。"
                : "全国速報に掲載中の情報はありません。自治体情報もご確認ください。";

    setText(
        DOM.homeDisasterSummary,
        disasterRequestFailed && disasterData.updatedAt
            ? `前回取得データ：${summary}`
            : summary
    );
}


