"use strict";

const { CACHE, CACHE_TTL, NEWS_CATEGORIES, PREVIEW_HOSTS, MAX_PREVIEW_BYTES, GoogleDecoder } = require("../config");
const { nowISO, safeString, safeNumber, isValidHttpUrl, isSafeExternalURL, setBoundedCache, sendError, fetchText, fetchJSON, securityHeaders } = require("../utils");
const { URL } = require("node:url");
const { Readable, Transform } = require("node:stream");

/* ============================================================
   13. MUSIC
============================================================ */

function normalizeMusicItem(
    item
) {

    if (
        !item ||
        typeof item !==
            "object"
    ) {

        return null;
    }


    let artwork =
        safeString(
            item.artworkUrl100 ||
            item.artwork ||
            item.image
        );


    if (
        artwork
    ) {

        artwork =
            artwork.replace(
                /100x100/gi,
                "600x600"
            );
    }


    return {

        id:
            String(
                item.trackId ||
                item.collectionId ||
                Math.random()
                    .toString(36)
                    .slice(2)
            ),

        title:
            safeString(
                item.trackName ||
                item.title,
                "曲名不明"
            ),

        artist:
            safeString(
                item.artistName ||
                item.artist,
                "アーティスト不明"
            ),

        album:
            safeString(
                item.collectionName ||
                item.album,
                ""
            ),

        genre:
            safeString(
                item.primaryGenreName ||
                item.genre,
                "音楽"
            ),

        artwork,

        previewUrl:
            safeString(
                item.previewUrl ||
                item.preview,
                ""
            ),

        trackViewUrl:
            safeString(
                item.trackViewUrl ||
                item.url,
                ""
            ),

        releaseDate:
            safeString(
                item.releaseDate,
                ""
            ),

        durationMs:
            safeNumber(
                item.trackTimeMillis ||
                item.durationMs
            )
    };
}


async function loadMusic(
    query
) {

    const cleanQuery =
        safeString(
            query,
            "J-POP"
        );


    const cacheKey =
        cleanQuery.toLowerCase();


    const cached =
        CACHE.music.get(
            cacheKey
        );


    if (
        cached &&
        Date.now() -
            cached.time <
            CACHE_TTL.music
    ) {

        return cached.data;
    }


    const url =
        "https://itunes.apple.com/search" +

        `?term=${encodeURIComponent(
            cleanQuery
        )}` +

        "&country=JP" +

        "&media=music" +

        "&entity=song" +

        "&limit=30";


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


    const items =
        results
            .map(
                normalizeMusicItem
            )
            .filter(
                Boolean
            );


    setBoundedCache(
        CACHE.music,
        cacheKey,
        {

            data:
                items,

            time:
                Date.now()
        }
    );


    return items;
}


/* ============================================================
   14. MUSIC PREVIEW
============================================================ */

function isAllowedPreviewHost(
    hostname
) {

    const host =
        safeString(
            hostname
        ).toLowerCase();


    return PREVIEW_HOSTS.has(host) ||
        host === "itunes.apple.com" ||
        host.endsWith(".itunes.apple.com") ||
        host === "mzstatic.com" ||
        host.endsWith(".mzstatic.com");
}


async function streamMusicPreview(
    targetURL,
    req,
    res
) {

    let parsed;


    try {

        parsed =
            new URL(
                targetURL
            );

    } catch {

        sendError(
            res,
            400,
            "試聴URLが不正です。"
        );

        return;
    }


    if (
        parsed.protocol !==
            "https:" ||
        !isAllowedPreviewHost(
            parsed.hostname
        )
    ) {

        sendError(
            res,
            403,
            "この試聴音源は利用できません。"
        );

        return;
    }


    const headers = {

        "User-Agent":
            "YOUTH-NOW/8.0",

        "Accept":
            "audio/*,*/*"
    };


    if (
        req.headers.range
    ) {

        if (
            req.headers.range.length > 100 ||
            !/^bytes=\d*-\d*(?:,\d*-\d*)?$/.test(req.headers.range)
        ) {
            sendError(res, 416, "音声の範囲指定が不正です。");
            return;
        }

        headers.Range =
            req.headers.range;
    }


    let previewController;
    let previewTimeout;

    try {
        previewController = new AbortController();
        previewTimeout = setTimeout(() => previewController.abort(), 20000);
        res.once("close", () => {
            clearTimeout(previewTimeout);
            if (!res.writableEnded) previewController.abort();
        });

        let response;
        let currentURL = parsed;
        try {
            for (let redirects = 0; redirects <= 3; redirects += 1) {
                if (currentURL.protocol !== "https:" || !isAllowedPreviewHost(currentURL.hostname)) {
                    throw new Error("音声の転送先が許可されていません。");
                }
                response = await fetch(currentURL, { headers, redirect: "manual", signal: previewController.signal });
                if (![301, 302, 303, 307, 308].includes(response.status)) break;
                await response.body?.cancel();
                const location = response.headers.get("location");
                if (!location || redirects === 3) throw new Error("音声の転送回数が上限を超えました。");
                currentURL = new URL(location, currentURL);
            }
        } catch (error) {
            clearTimeout(previewTimeout);
            throw error;
        }


        if (
            !response.ok &&
            response.status !==
                206
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const contentType = response.headers.get("content-type") || "audio/mp4";
        const previewLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(previewLength) && previewLength > MAX_PREVIEW_BYTES) {
            await response.body?.cancel();
            throw new Error("Preview response exceeds the size limit.");
        }
        if (!/^audio\//i.test(contentType) && contentType !== "application/octet-stream") {
            await response.body?.cancel();
            throw new Error("音声ファイルではない応答を受信しました。");
        }

        const responseHeaders = {

            "Content-Type":
                contentType,

            "Cache-Control":
                "public, max-age=3600",

            "Accept-Ranges":
                "bytes",

            ...securityHeaders()
        };


        const contentLength =
            response.headers.get(
                "content-length"
            );


        const contentRange =
            response.headers.get(
                "content-range"
            );


        if (
            contentLength
        ) {

            responseHeaders[
                "Content-Length"
            ] =
                contentLength;
        }


        if (
            contentRange
        ) {

            responseHeaders[
                "Content-Range"
            ] =
                contentRange;
        }


        res.writeHead(
            response.status ===
                206
                ? 206
                : 200,
            responseHeaders
        );


        if (
            !response.body
        ) {

            const buffer =
                Buffer.from(
                    await response.arrayBuffer()
                );


            res.end(
                buffer
            );

            clearTimeout(previewTimeout);


            return;
        }


        let previewBytes = 0;
        const sizeLimit = new Transform({
            transform(chunk, encoding, callback) {
                previewBytes += chunk.length;
                if (previewBytes > MAX_PREVIEW_BYTES) {
                    callback(new Error("Preview response exceeds the size limit."));
                    return;
                }
                callback(null, chunk);
            }
        });

        sizeLimit
            .on("error", error => {
                clearTimeout(previewTimeout);
                console.error("[YOUTH NOW] 音楽プレビュー転送失敗:", error.message);
                res.destroy(error);
            });

        Readable.fromWeb(response.body).pipe(sizeLimit).pipe(res);

        res.once("finish", () => clearTimeout(previewTimeout));

    } catch (error) {

        clearTimeout(previewTimeout);

        console.error(
            "[YOUTH NOW] 音楽試聴失敗:",
            error.message
        );


        if (
            !res.headersSent
        ) {

            sendError(
                res,
                502,
                "試聴音源を取得できませんでした。"
            );

        } else {

            res.destroy();
        }
    }
}




module.exports = { loadMusic, streamMusicPreview };
