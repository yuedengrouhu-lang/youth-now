/* ============================================================
   03. 共通ヘルパー
============================================================ */

function $(
    selector
) {
    return document.querySelector(
        selector
    );
}


function $all(
    selector
) {
    return Array.from(
        document.querySelectorAll(
            selector
        )
    );
}


function addEvent(
    element,
    eventName,
    handler,
    options
) {
    if (!element) {
        return;
    }

    element.addEventListener(
        eventName,
        handler,
        options
    );
}


function setText(
    element,
    value
) {
    if (!element) {
        return;
    }

    element.textContent =
        value == null
            ? ""
            : String(
                value
            );
}


function setHTML(
    element,
    html
) {
    if (!element) {
        return;
    }

    element.innerHTML =
        html == null
            ? ""
            : String(
                html
            );
}


function setValue(
    element,
    value
) {
    if (!element) {
        return;
    }

    element.value =
        value == null
            ? ""
            : String(
                value
            );
}


function getValue(
    element
) {
    if (!element) {
        return "";
    }

    return String(
        element.value || ""
    );
}


function setDisabled(
    element,
    disabled
) {
    if (!element) {
        return;
    }

    element.disabled =
        Boolean(
            disabled
        );
}


function safeString(
    value,
    fallback = ""
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    const text =
        String(
            value
        ).trim();

    return text ||
        fallback;
}


function safeNumber(
    value,
    fallback = null
) {
    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}


function safeExternalURL(
    value,
    allowedProtocols = ["http:", "https:"]
) {
    try {
        const url = new URL(String(value ?? ""), window.location.href);
        return allowedProtocols.includes(url.protocol)
            ? url.href
            : "";
    } catch {
        return "";
    }
}


function parseJSON(
    value,
    fallback
) {
    try {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return fallback;
        }

        return JSON.parse(
            value
        );

    } catch {

        return fallback;
    }
}


function escapeHTML(
    value
) {
    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function sleep(
    ms
) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


function announce(
    message
) {
    let liveRegion =
        document.querySelector(
            "#youth-now-live-region"
        );

    if (
        !liveRegion
    ) {
        liveRegion =
            document.createElement(
                "div"
            );

        liveRegion.id =
            "youth-now-live-region";

        liveRegion.setAttribute(
            "aria-live",
            "polite"
        );

        liveRegion.style.position =
            "absolute";

        liveRegion.style.width =
            "1px";

        liveRegion.style.height =
            "1px";

        liveRegion.style.overflow =
            "hidden";

        liveRegion.style.clip =
            "rect(0,0,0,0)";

        document.body.appendChild(
            liveRegion
        );
    }

    liveRegion.textContent =
        safeString(
            message
        );
}


function formatDateTime(
    value
) {
    if (!value) {
        return "日時不明";
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "日時不明";
    }

    return date.toLocaleString(
        "ja-JP",
        {
            month:
                "numeric",

            day:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}


function formatFullDate(
    value
) {
    const date =
        value
            ? new Date(
                value
            )
            : new Date();

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toLocaleDateString(
        "ja-JP",
        {
            year:
                "numeric",

            month:
                "long",

            day:
                "numeric",

            weekday:
                "short"
        }
    );
}


function formatTime(
    value
) {
    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "--:--";
    }

    return date.toLocaleTimeString(
        "ja-JP",
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}


/* ============================================================
   04. API
============================================================ */

async function requestJSON(
    url,
    options = {}
) {
      const response =
          await fetch(
            url,
            {
                cache:
                    "no-store",

                ...options
              }
          );

      try {
          const path = new URL(response.url, window.location.href).pathname;
          apiResponseMeta[path] = {
              cached: response.headers.get("X-PWA-Cached") === "true",
              offline: response.headers.get("X-PWA-Offline") === "true",
              receivedAt: Date.now()
          };
      } catch {}

    const text =
        await response.text();

    let data =
        null;

    try {

        data =
            text
                ? JSON.parse(
                    text
                )
                : null;

    } catch {

        throw new Error(
            "JSONを読み込めませんでした。"
        );
    }


    if (
        !response.ok
    ) {
        throw new Error(
            data?.error ||
            `HTTP ${response.status}`
        );
    }


    return data;
}


