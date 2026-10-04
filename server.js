"use strict";

const http = require("node:http");
const { URL } = require("node:url");
const { HOST, PORT } = require("./server/config");
const { sendError, securityHeaders } = require("./server/utils");
const { serveStatic, handleAPI, handleGo } = require("./server/routes");

const server =
    http.createServer(
        async (
            req,
            res
        ) => {

            try {

                const requestURL =
                    new URL(
                        req.url,
                        `http://${HOST}:${PORT}`
                    );

                /*
                 * OPTIONS
                 */

                if (
                    req.method ===
                    "OPTIONS"
                ) {

                    res.writeHead(
                        204,
                        {
                            "Allow": requestURL.pathname === "/api/ai/chat"
                                ? "POST, OPTIONS"
                                : "GET, OPTIONS",
                            ...securityHeaders()
                        }
                    );


                    res.end();

                    return;
                }


                /*
                 * GET and AI POST only
                 */

                if (
                    req.method !== "GET" &&
                    !(req.method === "POST" && requestURL.pathname === "/api/ai/chat")
                ) {

                    sendError(
                        res,
                        405,
                        "このリクエスト方法には対応していません。"
                    );

                    return;
                }


                /*
                 * API
                 */

                if (
                    requestURL.pathname.startsWith(
                        "/api/"
                    )
                ) {

                    const handled =
                        await handleAPI(
                            req,
                            res,
                            requestURL
                        );


                    if (
                        !handled
                    ) {

                        sendError(
                            res,
                            404,
                            "APIが見つかりません。"
                        );
                    }


                    return;
                }


                /*
                 * /go
                 */

                if (
                    await handleGo(
                        req,
                        res,
                        requestURL
                    )
                ) {

                    return;
                }


                /*
                 * static
                 */

                await serveStatic(
                    res,
                    requestURL.pathname
                );

            } catch (error) {

                console.error(
                    "[YOUTH NOW] サーバー内部エラー:",
                    error
                );


                if (
                    !res.headersSent
                ) {

                    sendError(
                        res,
                        500,
                        "サーバー内部でエラーが発生しました。"
                    );

                } else {

                    res.destroy();
                }
            }
        }
    );


/* ============================================================
   25. SERVER ERROR
============================================================ */

server.on(
    "error",
    error => {

        if (
            error.code ===
            "EADDRINUSE"
        ) {

            console.error(
                `ポート ${PORT} はすでに使用されています。`
            );


            console.error(
                "別の node server.js が起動していないか確認してください。"
            );


            process.exit(
                1
            );


            return;
        }


        console.error(
            "[YOUTH NOW] サーバーエラー:",
            error
        );


        process.exit(
            1
        );
    }
);


/* ============================================================
   26. START
============================================================ */

server.listen(
    PORT,
    HOST,
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "YOUTH NOW サーバー起動成功！"
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "ニュースカテゴリー対応"
        );

        console.log(
            "ニュース検索対応"
        );

        console.log(
            "音楽検索・試聴対応"
        );

        console.log(
            "天気・地域検索対応"
        );

        console.log(
            "防災情報対応"
        );

        console.log(
            "========================================"
        );
    }
);


/* ============================================================
   27. SHUTDOWN
============================================================ */

function shutdown(
    signal
) {

    console.log(
        `\n[YOUTH NOW] ${signal} を受信しました。`
    );


    server.close(
        error => {

            if (
                error
            ) {

                console.error(
                    "[YOUTH NOW] 終了時エラー:",
                    error.message
                );


                process.exit(
                    1
                );


                return;
            }


            console.log(
                "[YOUTH NOW] サーバー終了"
            );


            process.exit(
                0
            );
        }
    );
}


process.on(
    "SIGINT",
    () => {
        shutdown(
            "SIGINT"
        );
    }
);


process.on(
    "SIGTERM",
    () => {
        shutdown(
            "SIGTERM"
        );
    }
);
