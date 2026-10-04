"use strict";

const { CACHE, CACHE_TTL, NEWS_CATEGORIES, PREVIEW_HOSTS, MAX_PREVIEW_BYTES, GoogleDecoder } = require("../config");
const { nowISO, safeString, safeNumber, isValidHttpUrl, isSafeExternalURL, setBoundedCache, sendError, fetchText, fetchJSON, securityHeaders } = require("../utils");

/* ============================================================
   11. XMLヘルパー
============================================================ */

function decodeEntities(
    value
) {

    return safeString(
        value
    )

        .replace(
            /<!\[CDATA\[([\s\S]*?)\]\]>/g,
            "$1"
        )

        .replace(
            /&amp;/g,
            "&"
        )

        .replace(
            /&lt;/g,
            "<"
        )

        .replace(
            /&gt;/g,
            ">"
        )

        .replace(
            /&quot;/g,
            '"'
        )

        .replace(
            /&#39;/g,
            "'"
        )

        .replace(
            /&#x27;/gi,
            "'"
        )

        .replace(
            /&#(\d+);/g,
            (
                _,
                code
            ) =>
                String.fromCharCode(
                    Number(
                        code
                    )
                )
        )

        .replace(
            /&#x([0-9a-f]+);/gi,
            (
                _,
                code
            ) =>
                String.fromCharCode(
                    parseInt(
                        code,
                        16
                    )
                )
        );
}


function stripHTML(
    value
) {

    return decodeEntities(
        value
    )

        .replace(
            /<br\s*\/?>/gi,
            "\n"
        )

        .replace(
            /<[^>]*>/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();
}


function xmlTag(
    block,
    tag
) {

    const regex =
        new RegExp(
            `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
            "i"
        );


    const match =
        String(
            block ||
            ""
        ).match(
            regex
        );


    return match
        ? decodeEntities(
            match[1]
        ).trim()
        : "";
}


function xmlAttribute(
    block,
    tag,
    attribute
) {

    const regex =
        new RegExp(
            `<${tag}[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`,
            "i"
        );


    const match =
        String(
            block ||
            ""
        ).match(
            regex
        );


    return match
        ? decodeEntities(
            match[1]
        ).trim()
        : "";
}


/* ============================================================
   12. NEWS
============================================================ */

function normalizeNewsCategory(
    category
) {

    const value =
        safeString(
            category,
            "TOP"
        ).toUpperCase();


    if (
        value ===
            "AI-TECH" ||
        value ===
            "AI TECH"
    ) {

        return "AI・TECH";
    }


    if (
        NEWS_CATEGORIES[
            value
        ]
    ) {

        return value;
    }


    return "TOP";
}


function parseNewsRSS(
    xml,
    category
) {

    const items =
        [];


    const blocks =
        String(
            xml ||
            ""
        ).match(
            /<item\b[\s\S]*?<\/item>/gi
        ) ||
        [];


    const normalizedCategory =
        normalizeNewsCategory(
            category
        );


    blocks.forEach(
        (
            block,
            index
        ) => {

            const title =
                stripHTML(
                    xmlTag(
                        block,
                        "title"
                    )
                );


            const link =
                safeString(
                    xmlTag(
                        block,
                        "link"
                    )
                );


            const description =
                stripHTML(
                    xmlTag(
                        block,
                        "description"
                    )
                );


            const source =
                stripHTML(
                    xmlTag(
                        block,
                        "source"
                    )
                );


            const publishedAt =
                safeString(
                    xmlTag(
                        block,
                        "pubDate"
                    )
                );


            const image =
                xmlAttribute(
                    block,
                    "media:content",
                    "url"
                ) ||

                xmlAttribute(
                    block,
                    "media:thumbnail",
                    "url"
                ) ||

                xmlAttribute(
                    block,
                    "enclosure",
                    "url"
                );


            if (
                !title
            ) {

                return;
            }


            items.push({

                id:
                    `${normalizedCategory}-${Date.now()}-${index}`,

                title,

                text:
                    description,

                category:
                    normalizedCategory ===
                        "TOP"
                        ? "NEWS"
                        : normalizedCategory,

                source:
                    source ||
                    "Google News",

                url:
                    link,

                link,

                image,

                publishedAt,

                pubDate:
                    publishedAt
            });
        }
    );


    return uniqueNews(
        items
    );
}


function uniqueNews(
    items
) {

    const map =
        new Map();


    for (
        const item of
        Array.isArray(
            items
        )
            ? items
            : []
    ) {

        const key =
            safeString(
                item.url ||
                item.link ||
                item.title
            );


        if (
            key &&
            !map.has(
                key
            )
        ) {

            map.set(
                key,
                item
            );
        }
    }


    return [
        ...map.values()
    ];
}


async function loadNews(
    category,
    query = ""
) {

    const normalizedCategory =
        normalizeNewsCategory(
            category
        );


    const cleanQuery =
        safeString(
            query
        );


    const cacheKey =
        `${normalizedCategory}|${cleanQuery.toLowerCase()}`;


    const cached =
        CACHE.news.get(
            cacheKey
        );


    if (
        cached &&
        Date.now() -
            cached.time <
            CACHE_TTL.news
    ) {

        return cached.data;
    }


    const feedURL =
        cleanQuery

            ? (
                "https://news.google.com/rss/search" +
                `?q=${encodeURIComponent(
                    cleanQuery
                )}` +
                "&hl=ja" +
                "&gl=JP" +
                "&ceid=JP:ja"
            )

            : NEWS_CATEGORIES[
                normalizedCategory
            ].feed;


    const xml =
        await fetchText(
            feedURL,
            {

                accept:
                    "application/rss+xml, application/xml, text/xml, */*",

                timeout:
                    15000
            }
        );


    let items =
        parseNewsRSS(
            xml,
            normalizedCategory
        )
            .slice(
                0,
                60
            );


    if (
        cleanQuery
    ) {

        const words =
            cleanQuery
                .toLowerCase()
                .split(
                    /\s+/
                )
                .filter(
                    Boolean
                );


        items =
            items.filter(
                item => {

                    const haystack =
                        [
                            item.title,
                            item.text,
                            item.source
                        ]
                            .join(
                                " "
                            )
                            .toLowerCase();


                    return words.every(
                        word =>
                            haystack.includes(
                                word
                            )
                    );
                }
            );
    }


    setBoundedCache(
        CACHE.news,
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




async function loadTraffic(areas = []) {
    const cleanAreas = [...new Set((Array.isArray(areas) ? areas : [])
        .map(area => safeString(area).replace(/["'()]/g, "").slice(0, 48))
        .filter(Boolean))].slice(0, 3);
    const scope = cleanAreas.length
        ? `(${cleanAreas.map(area => `"${area}"`).join(" OR ")})`
        : "(日本 OR 全国)";
    const query = `${scope} (運行情報 OR 遅延 OR 運休 OR 運転見合わせ OR 通行止め OR 渋滞 OR ダイヤ乱れ OR 運転再開)`;
    const cacheKey = `TRAFFIC|${cleanAreas.join("|").toLowerCase() || "national"}`;
    const cached = CACHE.news.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL.news) return cached.data;

    const feedURL = "https://news.google.com/rss/search" +
        `?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`;
    const xml = await fetchText(feedURL, {
        accept: "application/rss+xml, application/xml, text/xml, */*",
        timeout: 15000
    });
    const items = parseNewsRSS(xml, "TOP")
        .filter(item => /運行情報|遅延|運休|運転見合わせ|通行止め|渋滞|ダイヤ乱れ|運転再開/.test(`${item.title} ${item.text}`))
        .slice(0, 12);
    const data = {
        provider: "Google News RSS検索",
        areas: cleanAreas,
        fetchedAt: nowISO(),
        items,
        disclaimer: "交通に関する記事の検索結果です。リアルタイムの運行状態を保証しません。利用前に交通事業者の公式情報をご確認ください。"
    };
    setBoundedCache(CACHE.news, cacheKey, { data, time: Date.now() });
    return data;
}

module.exports = { normalizeNewsCategory, loadNews, loadTraffic, stripHTML, xmlTag };
