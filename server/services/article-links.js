"use strict";

const { GoogleDecoder } = require("../config");
const { isValidHttpUrl } = require("../utils");

/* ============================================================
   20. Google News URL解除
============================================================ */

async function decodeArticleURL(
    targetURL
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


    const parsed =
        new URL(
            targetURL
        );


    const host =
        parsed.hostname
            .toLowerCase();


    const isGoogleNews =
        host ===
            "news.google.com" ||
        host.endsWith(
            ".news.google.com"
        );


    if (
        !isGoogleNews ||
        !GoogleDecoder
    ) {

        return targetURL;
    }


    try {

        const decoder =
            new GoogleDecoder();


        const result =
            await decoder.decode(
                targetURL
            );


        if (
            result?.status &&
            isValidHttpUrl(
                result.decoded_url
            )
        ) {

            return result.decoded_url;
        }

    } catch (error) {

        console.warn(
            "[YOUTH NOW] Google News URL解除失敗:",
            error.message
        );
    }


    return targetURL;
}





module.exports = { decodeArticleURL };
