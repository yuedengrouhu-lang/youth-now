"use strict";

const { MAX_QUERY_LENGTH } = require("./config");
const { nowISO, sendJSON, sendError, securityHeaders, safeString, safeNumber, isSafeExternalURL } = require("./utils");
const {
  normalizeNewsCategory, loadNews, loadTraffic, loadMusic, streamMusicPreview,
  loadWeather, searchGeocode, loadDisaster, decodeArticleURL, loadShelterTile,
  loadQuiz, generateAI
} = require("./services");
const { serveStatic } = require("./static");

/* ============================================================
   API route handlers
============================================================ */

async function handleAPI(
    req,
    res,
    url
) {

    if (url.pathname === "/api/ai/chat") {
        if (req.method !== "POST") {
            res.setHeader("Allow", "POST, OPTIONS");
            sendError(res, 405, "AI APIはPOSTで呼び出してください。");
            return true;
        }

        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        if (!contentType.includes("application/json")) {
            sendError(res, 415, "AI APIにはJSON形式で送信してください。");
            return true;
        }

        const maxBodyBytes = 48 * 1024;
        const contentLength = Number(req.headers["content-length"]);
        if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
            req.resume();
            sendError(res, 413, "AIへのリクエストが大きすぎます。");
            return true;
        }

        try {
            const chunks = [];
            let totalBytes = 0;
            for await (const chunk of req) {
                totalBytes += chunk.length;
                if (totalBytes > maxBodyBytes) {
                    req.resume();
                    sendError(res, 413, "AIへのリクエストが大きすぎます。");
                    return true;
                }
                chunks.push(chunk);
            }

            let body;
            try {
                body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
                sendError(res, 400, "AIへのリクエストを読み取れませんでした。");
                return true;
            }

            const answer = await generateAI(body?.messages);
            sendJSON(res, 200, { answer, model: "qwen/qwen3.8-27b via Groq" });
        } catch (error) {
            const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 502;
            if (statusCode >= 500 && statusCode !== 503 && statusCode !== 504) {
                console.error("[YOUTH NOW] AI回答生成失敗:", error.message);
            }
            sendError(res, statusCode, error.message || "AI回答を作成できませんでした。");
        }
        return true;
    }

    /*
     * NEWS
     */

    if (
        url.pathname ===
        "/api/news"
    ) {

        const category =
            normalizeNewsCategory(
                url.searchParams.get(
                    "category"
                )
            );


        const query =
            safeString(
                url.searchParams.get(
                    "q"
                )
            );

        if (query.length > MAX_QUERY_LENGTH) {
            sendError(res, 400, "検索語は120文字以内で入力してください。");
            return true;
        }


        try {

            const data =
                await loadNews(
                    category,
                    query
                );


            sendJSON(
                res,
                200,
                data
            );

        } catch (error) {

            console.error(
                "[YOUTH NOW] ニュース取得失敗:",
                error.message
            );


            sendError(
                res,
                502,
                "ニュースを取得できませんでした。"
            );
        }


        return true;
    }


    /*
     * MUSIC
     */

    if (
        url.pathname ===
        "/api/music"
    ) {

        const query =
            safeString(
                url.searchParams.get(
                    "q"
                ),
                "J-POP"
            );

        if (query.length > MAX_QUERY_LENGTH) {
            sendError(res, 400, "検索語は120文字以内で入力してください。");
            return true;
        }


        try {

            const data =
                await loadMusic(
                    query
                );


            sendJSON(
                res,
                200,
                data
            );

        } catch (error) {

            console.error(
                "[YOUTH NOW] 音楽取得失敗:",
                error.message
            );


            sendError(
                res,
                502,
                "音楽情報を取得できませんでした。"
            );
        }


        return true;
    }


    /*
     * MUSIC PREVIEW
     */

    if (
        url.pathname ===
        "/api/music-preview"
    ) {

        const previewURL =
            safeString(
                url.searchParams.get(
                    "url"
                )
            );


        if (previewURL.length > 2048) {
            sendError(res, 400, "Preview URL is too long.");
            return true;
        }

        if (
            !previewURL
        ) {

            sendError(
                res,
                400,
                "試聴URLがありません。"
            );

        } else {

            await streamMusicPreview(
                previewURL,
                req,
                res
            );
        }


        return true;
    }


    /*
     * WEATHER
     */

    if (
        url.pathname ===
        "/api/weather"
    ) {

        const latitude =
            url.searchParams.get(
                "latitude"
            );


        const longitude =
            url.searchParams.get(
                "longitude"
            );


        const name =
            safeString(
                url.searchParams.get(
                    "name"
                ),
                "現在地"
            );

        const lat = safeNumber(latitude);
        const lon = safeNumber(longitude);
        if (lat === null || lat < -90 || lat > 90 || lon === null || lon < -180 || lon > 180) {
            sendError(res, 400, "緯度または経度が不正です。");
            return true;
        }

        if (name.length > 80) {
            sendError(res, 400, "場所の名前が長すぎます。");
            return true;
        }


        try {

            const data =
                await loadWeather(
                    latitude,
                    longitude,
                    name
                );


            sendJSON(
                res,
                200,
                data
            );

        } catch (error) {

            console.error(
                "[YOUTH NOW] 天気取得失敗:",
                error.message
            );


            sendError(
                res,
                502,
                "天気情報を取得できませんでした。"
            );
        }


        return true;
    }


    /*
     * GEOCODE
     */

    if (
        url.pathname ===
        "/api/geocode"
    ) {

        const query =
            safeString(
                url.searchParams.get(
                    "q"
                )
            );

        if (query.length > MAX_QUERY_LENGTH) {
            sendError(res, 400, "検索語は120文字以内で入力してください。");
            return true;
        }


        try {

            const data =
                await searchGeocode(
                    query
                );


            sendJSON(
                res,
                200,
                data
            );

        } catch (error) {

            console.error(
                "[YOUTH NOW] 地域検索失敗:",
                error.message
            );


            sendError(
                res,
                502,
                "地域情報を取得できませんでした。"
            );
        }


        return true;
    }


    /*
     * DISASTER
     */

    if (
        url.pathname ===
        "/api/disaster"
    ) {

        try {

            const data =
                await loadDisaster();


            sendJSON(
                res,
                200,
                data
            );

        } catch (error) {

            console.error(
                "[YOUTH NOW] 防災取得失敗:",
                error.message
            );


            sendError(
                res,
                502,
                "防災情報を取得できませんでした。"
            );
        }


        return true;
    }

    if (url.pathname === "/api/traffic") {
        const areas = url.searchParams.getAll("area").slice(0, 3).map(value => safeString(value));
        if (areas.some(area => area.length > 60)) {
            sendError(res, 400, "地域名は60文字以内で指定してください。");
            return true;
        }
        try {
            const data = await loadTraffic(areas);
            sendJSON(res, 200, data);
        } catch (error) {
            console.error("[YOUTH NOW] 交通情報取得失敗:", error.message);
            sendError(res, 502, "交通関連情報を取得できませんでした。");
        }
        return true;
    }

    if (url.pathname === "/api/quiz") {
        try {
            sendJSON(res, 200, await loadQuiz());
        } catch (error) {
            console.error("[YOUTH NOW] クイズ取得失敗:", error.message);
            sendError(res, 502, "クイズデータを取得できませんでした。時間をおいて再度お試しください。");
        }
        return true;
    }

    if (url.pathname === "/api/map/shelters") {
        const kind = safeString(url.searchParams.get("kind"), "sih");
        const z = safeNumber(url.searchParams.get("z"));
        const x = safeNumber(url.searchParams.get("x"));
        const y = safeNumber(url.searchParams.get("y"));
        if (z !== 10 || x === null || y === null || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 1023 || y < 0 || y > 1023 || !["sih", "sfh", "skhb04", "skhb05"].includes(kind)) {
            sendError(res, 400, "地図タイルの指定が不正です。");
            return true;
        }
        try {
            sendJSON(res, 200, await loadShelterTile(kind, x, y));
        } catch (error) {
            console.error("[YOUTH NOW] 避難場所タイル取得失敗:", error.message);
            sendError(res, 502, "避難場所データを取得できませんでした。");
        }
        return true;
    }


    /*
     * HEALTH
     */

    if (
        url.pathname ===
        "/api/health"
    ) {

        sendJSON(
            res,
            200,
            {

                ok:
                    true,

                name:
                    "YOUTH NOW",

                version:
                    "8.0.0",

                time:
                    nowISO()
            }
        );


        return true;
    }


    return false;
}


/* ============================================================
   23. /go
============================================================ */

async function handleGo(
    req,
    res,
    url
) {

    if (
        url.pathname !==
        "/go"
    ) {

        return false;
    }


    const targetURL =
        safeString(
            url.searchParams.get(
                "url"
            )
        );


    if (
        !targetURL ||
        targetURL.length > 2048 ||
        !isSafeExternalURL(
            targetURL
        )
    ) {

        sendError(
            res,
            400,
            "記事URLが不正です。"
        );

        return true;
    }


    try {

        const finalURL =
            await decodeArticleURL(
                targetURL
            );

        if (!isSafeExternalURL(finalURL)) {
            sendError(res, 502, "記事リンクの転送先が許可されていません。");
            return true;
        }


        res.writeHead(
            302,
            {

                Location:
                    finalURL,

                "Cache-Control":
                    "no-store",

                ...securityHeaders()
            }
        );


        res.end();

    } catch (error) {

        console.error(
            "[YOUTH NOW] 記事リンク処理失敗:",
            error.message
        );


        sendError(
            res,
            502,
            "記事リンクを開けませんでした。"
        );
    }


    return true;
}



module.exports = { serveStatic, handleAPI, handleGo };
