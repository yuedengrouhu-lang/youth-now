"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT_DIR, MIME_TYPES } = require("./config");
const { sendError, securityHeaders } = require("./utils");

/* Local static asset delivery. */
async function serveStatic(
    res,
    pathname
) {

    let decoded;


    try {

        decoded =
            decodeURIComponent(
                pathname
            );

    } catch {

        sendError(
            res,
            400,
            "URLが不正です。"
        );

        return;
    }


    if (
        decoded ===
        "/"
    ) {

        decoded =
            "/index.html";
    }


    if (
        decoded.includes(
            ".."
        )
    ) {

        sendError(
            res,
            403,
            "アクセスが拒否されました。"
        );

        return;
    }

    const publicFiles = new Set([
        "/index.html",
        "/manifest.webmanifest",
        "/sw.js",
        "/icons/pwa-192.png",
        "/icons/pwa-512.png",
        "/icons/apple-touch-icon.png",
        "/scripts/config.js",
        "/scripts/state.js",
        "/scripts/helpers.js",
        "/scripts/dom.js",
        "/scripts/storage.js",
        "/scripts/read-later.js",
        "/scripts/dashboard-customizer.js",
        "/scripts/accessibility.js",
        "/scripts/theme.js",
        "/scripts/navigation.js",
        "/scripts/news-data.js",
        "/scripts/news.js",
        "/scripts/command-palette.js",
        "/scripts/topic-following.js",
        "/scripts/weather.js",
        "/scripts/weather-view.js",
        "/scripts/weather-location.js",
        "/scripts/music.js",
        "/scripts/disaster.js",
        "/scripts/disaster-view.js",
        "/scripts/map.js",
        "/scripts/intelligence.js",
        "/scripts/pwa.js",
        "/scripts/ai.js",
        "/scripts/settings.js",
        "/scripts/quiz.js",
        "/scripts/app.js",
        "/style.css",
        "/features.css",
        "/styles/01-foundation.css",
        "/styles/02-dashboard-sections.css",
        "/styles/03-news-pages.css",
        "/styles/04-content-components.css",
        "/styles/05-footer-responsive-theme.css",
        "/styles/06-editorial-system.css",
        "/styles/07-motion-overrides.css",
        "/styles/08-signature-refresh.css",
        "/styles/09-disaster-center.css",
        "/styles/10-live-widgets.css",
        "/styles/11-field-notes.css",
        "/styles/12-motion-design.css",
        "/favicon.ico"
    ]);

    if (!publicFiles.has(decoded)) {
        sendError(res, 404, "ファイルが見つかりません。");
        return;
    }


    const relative =
        decoded.replace(
            /^\/+/,
            ""
        );


    const filePath =
        path.resolve(
            ROOT_DIR,
            relative
        );


    const rootPath =
        path.resolve(
            ROOT_DIR
        );


    if (
        filePath !==
            rootPath &&
        !filePath.startsWith(
            rootPath +
            path.sep
        )
    ) {

        sendError(
            res,
            403,
            "アクセスが拒否されました。"
        );

        return;
    }


    try {

        const stats =
            await fs.promises.stat(
                filePath
            );


        if (
            !stats.isFile()
        ) {

            throw new Error(
                "NOT_FILE"
            );
        }


        const ext =
            path.extname(
                filePath
            ).toLowerCase();


        res.writeHead(
            200,
            {

                "Content-Type":
                    MIME_TYPES[ext] ||
                    "application/octet-stream",

        "Cache-Control":
                    "no-cache",

                ...securityHeaders()
            }
        );


        fs.createReadStream(
            filePath
        )

            .on(
                "error",
                error => {

                    console.error(
                        "[YOUTH NOW] 静的ファイル送信失敗:",
                        error.message
                    );


                    if (
                        !res.headersSent
                    ) {

                        sendError(
                            res,
                            500,
                            "ファイル送信に失敗しました。"
                        );

                    } else {

                        res.destroy();
                    }
                }
            )

            .pipe(
                res
            );

    } catch {

        sendError(
            res,
            404,
            "ファイルが見つかりません。"
        );
    }
}
module.exports = { serveStatic };