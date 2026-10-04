"use strict";

const net = require("node:net");
const { URL } = require("node:url");
const { MAX_UPSTREAM_BYTES } = require("./config");

function nowISO() {

    return new Date()
        .toISOString();
}


function safeString(
    value,
    fallback = ""
) {

    if (
        value ===
        undefined ||
        value ===
        null
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


function isValidHttpUrl(
    value
) {

    try {

        const parsed =
            new URL(
                value
            );


        return (
            parsed.protocol ===
                "http:" ||
            parsed.protocol ===
                "https:"
        );

    } catch {

        return false;
    }
}


function isSafeExternalURL(value) {
    try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) return false;
        if (url.username || url.password) return false;

        const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
        if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return false;

        if (net.isIP(hostname) === 4) {
            const parts = hostname.split(".").map(Number);
            if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224) return false;
            if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return false;
            if (parts[0] === 169 && parts[1] === 254) return false;
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
            if (parts[0] === 192 && parts[1] === 168) return false;
            if (parts[0] === 192 && parts[1] === 0 && (parts[2] === 0 || parts[2] === 2)) return false;
            if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19 || parts[1] === 51 && parts[2] === 100)) return false;
            if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return false;
        }

        if (net.isIP(hostname) === 6 && (hostname === "::" || hostname === "::1" || /^::ffff:(?:127\.|10\.|192\.168\.|169\.254\.)/i.test(hostname) || /^f[cd]/i.test(hostname) || /^fe[89ab]/i.test(hostname) || /^ff/i.test(hostname))) return false;
        return true;
    } catch {
        return false;
    }
}


function securityHeaders() {
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    };
}


function setBoundedCache(cache, key, value, maxEntries = 100) {
    if (cache.has(key)) cache.delete(key);
    while (cache.size >= maxEntries) {
        cache.delete(cache.keys().next().value);
    }
    cache.set(key, value);
}


/* ============================================================
   09. JSONレスポンス
============================================================ */

function sendJSON(
    res,
    statusCode,
    data
) {

    const body =
        JSON.stringify(
            data,
            null,
            2
        );


    res.writeHead(
        statusCode,
        {

            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store",
            ...securityHeaders()
        }
    );


    res.end(
        body
    );
}


function sendError(
    res,
    statusCode,
    message
) {

    sendJSON(
        res,
        statusCode,
        {
            error:
                safeString(
                    message,
                    "エラーが発生しました。"
                )
        }
    );
}


/* ============================================================
   10. 外部取得
============================================================ */

async function fetchText(
    targetURL,
    options = {}
) {

    if (
        !isValidHttpUrl(
            targetURL
        )
    ) {

        throw new Error(
            "URLが不正です。"
        );
    }


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => {
                controller.abort();
            },
            options.timeout ||
                15000
        );


    try {
        let currentURL = new URL(targetURL);
        let response;

        for (let redirects = 0; redirects <= 3; redirects += 1) {
            if (!isSafeExternalURL(currentURL.href)) {
                throw new Error("外部URLの転送先が許可されていません。");
            }

            response = await fetch(currentURL, {
                method: options.method || "GET",
                headers: {
                    "User-Agent": "YOUTH-NOW/8.0",
                    "Accept": options.accept || "*/*",
                    ...(options.headers || {})
                },
                redirect: "manual",
                signal: controller.signal
            });

            if (![301, 302, 303, 307, 308].includes(response.status)) break;
            await response.body?.cancel();
            const location = response.headers.get("location");
            if (!location || redirects === 3) throw new Error("外部サーバーの転送回数が上限を超えました。");
            const nextURL = new URL(location, currentURL);
            if (!isSafeExternalURL(nextURL.href)) throw new Error("外部URLの転送先が許可されていません。");
            currentURL = nextURL;
        }

        if (!response?.ok) throw new Error(`HTTP ${response?.status || 502}`);

        const declaredLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > (options.maxBytes || MAX_UPSTREAM_BYTES)) {
            await response.body?.cancel();
            throw new Error("外部レスポンスがサイズ上限を超えました。");
        }

        if (!response.body) return "";
        const reader = response.body.getReader();
        const chunks = [];
        let totalBytes = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > (options.maxBytes || MAX_UPSTREAM_BYTES)) {
                await reader.cancel();
                throw new Error("外部レスポンスがサイズ上限を超えました。");
            }
            chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks, totalBytes).toString("utf8");

    } finally {

        clearTimeout(
            timeout
        );
    }
}


async function fetchJSON(
    targetURL,
    options = {}
) {

    const text =
        await fetchText(
            targetURL,
            options
        );


    try {

        return JSON.parse(
            text
        );

    } catch {

        throw new Error(
            "JSONの解析に失敗しました。"
        );
    }
}



module.exports = {
  nowISO, safeString, safeNumber, isValidHttpUrl, isSafeExternalURL,
  securityHeaders, setBoundedCache, sendJSON, sendError, fetchText, fetchJSON
};
