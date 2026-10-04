"use strict";

const { CACHE, CACHE_TTL, NEWS_CATEGORIES, PREVIEW_HOSTS, MAX_PREVIEW_BYTES, GoogleDecoder } = require("../config");
const { nowISO, safeString, safeNumber, setBoundedCache, fetchText, fetchJSON } = require("../utils");
const { stripHTML, xmlTag } = require("./news");

/* ============================================================
   17. DISASTER - 地震
============================================================ */

function earthquakeFromJMA(
    item,
    index
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
                item.eid ||
                item.id ||
                item.cod ||
                `${Date.now()}-${index}`
            ),

        title:
            "地震",

        text:
            safeString(
                item.anm ||
                item.place ||
                item.location,
                "震源情報"
            ),

        area:
            safeString(
                item.anm ||
                item.place ||
                item.location
            ),

        type:
            "earthquake",

        time:
            safeString(
                item.at ||
                item.datetime ||
                item.dateTime
            ),

        magnitude:
            safeNumber(
                item.mag
            ),

        depth:
            safeNumber(
                item.dep ||
                item.depth
            ),

        intensity:
            safeString(
                item.maxi ||
                item.maxIntensity
            ),

        latitude: (() => {
            const coords = String(item.cod || "").match(/[+-]\d+(?:\.\d+)?/g) || [];
            return safeNumber(coords[0]);
        })(),

        longitude: (() => {
            const coords = String(item.cod || "").match(/[+-]\d+(?:\.\d+)?/g) || [];
            return safeNumber(coords[1]);
        })(),

        source:
            "気象庁"
    };
}


/* ============================================================
   18. DISASTER - 警報
============================================================ */

function collectWarningObjects(
    value,
    results = [],
    seen = new Set()
) {

    if (
        !value ||
        typeof value !==
            "object"
    ) {

        return results;
    }


    if (
        seen.has(
            value
        )
    ) {

        return results;
    }


    seen.add(
        value
    );


    if (
        Array.isArray(
            value
        )
    ) {

        for (
            const entry of
            value
        ) {

            collectWarningObjects(
                entry,
                results,
                seen
            );
        }


        return results;
    }


    const title =
        safeString(
            value.name ||
            value.kind ||
            value.kindName ||
            value.warning ||
            value.typeName ||
            value.title
        );


    const area =
        safeString(
            value.area_name ||
            value.areaName ||
            value.area ||
            value.prefecture ||
            value.city
        );


    const status =
        safeString(
            value.status ||
            value.statusName
        );


    const text =
        [
            title,
            area,
            status
        ]
            .filter(
                Boolean
            )
            .join(
                " "
            );


    if (
        /特別警報|警報|注意報/.test(
            text
        )
    ) {

        const id =
            `${area}|${title}|${status}`;


        if (
            !results.some(
                item =>
                    item.id ===
                    id
            )
        ) {

            results.push({

                id,

                title:
                    title ||
                    "警報・注意報",

                text:
                    [
                        status,
                        title
                    ]
                        .filter(
                            Boolean
                        )
                        .join(
                            " "
                        ),

                area,

                type:
                    "alert",

                level:
                    title ||
                    status,

                status,

                time:
                    safeString(
                        value.reportDateTime ||
                        value.datetime ||
                        value.updateTime
                    ),

                source:
                    "気象庁"
            });
        }
    }


    for (
        const child of
        Object.values(
            value
        )
    ) {

        if (
            child &&
            typeof child ===
                "object"
        ) {

            collectWarningObjects(
                child,
                results,
                seen
            );
        }
    }


    return results;
}


function extractXMLBlocks(xml, tag) {

    const escapedTag = String(tag).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return String(xml || "").match(
        new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}>`, "gi")
    ) || [];
}


function collectWarningsFromBulletin(xml, officeCode) {

    const results = [];
    const reportTime = xmlTag(xml, "ReportDateTime") || xmlTag(xml, "DateTime");
    const publishingOffice = xmlTag(xml, "PublishingOffice") || "気象庁";

    for (const section of extractXMLBlocks(xml, "Warning")) {
        const sectionTypeMatch = section.match(/<Warning\b[^>]*\btype=["']([^"']+)["'][^>]*>/i);
        const sectionType = sectionTypeMatch ? sectionTypeMatch[1] : "";

        // 市町村単位を優先し、府県・区域単位の重複計上を避ける。
        if (sectionType && !/市町村等/.test(sectionType)) continue;

        for (const item of extractXMLBlocks(section, "Item")) {
            const kind = stripHTML(xmlTag(item, "Name"));
            const status = stripHTML(xmlTag(item, "Status"));
            const area = xmlTag(item, "Area");
            const areaName = stripHTML(xmlTag(area, "Name"));

            if (!kind || !areaName || /なし|解除|取消/.test(status)) continue;

            results.push({
                id: `${officeCode}-${xmlTag(area, "Code")}-${kind}`,
                title: kind,
                text: status || "発表中",
                area: areaName,
                type: "alert",
                level: kind,
                status: status || "発表中",
                time: reportTime,
                source: publishingOffice
            });
        }
    }

    return results;
}


async function loadJmaWarnings() {

    const xml = await fetchText(
        "https://www.data.jma.go.jp/developer/xml/feed/extra.xml",
        { timeout: 15000, accept: "application/xml,text/xml,*/*" }
    );
    const entries = extractXMLBlocks(xml, "entry");
    const latestByOffice = new Map();

    for (const entry of entries) {
        const title = stripHTML(xmlTag(entry, "title"));
        if (!/気象警報・注意報|気象特別警報・警報・注意報/.test(title)) continue;

        const linkMatch = entry.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
        const link = linkMatch ? linkMatch[1] : "";
        // VPWW53 is the prefecture-wide warning bulletin; finer-grained updates
        // in the same feed would otherwise double-count the same warning.
        const match = link.match(/VPWW53_(\d{6})\.xml(?:$|\?)/i);
        if (!match) continue;

        const officeCode = match[1];
        if (!latestByOffice.has(officeCode)) {
            latestByOffice.set(officeCode, {
                link,
                updated: xmlTag(entry, "updated")
            });
        }
    }

    const bulletins = [...latestByOffice.entries()];
    const alerts = [];
    let cursor = 0;
    const workers = Array.from({ length: Math.min(8, bulletins.length) }, async () => {
        while (cursor < bulletins.length) {
            const [officeCode, bulletin] = bulletins[cursor++];
            const age = Date.now() - Date.parse(bulletin.updated);
            // Ignore old feed entries: these are announcements, not a live state snapshot.
            if (!Number.isFinite(age) || age > 24 * 60 * 60 * 1000) continue;

            try {
                const body = await fetchText(bulletin.link, {
                    timeout: 12000,
                    accept: "application/xml,text/xml,*/*"
                });
                alerts.push(...collectWarningsFromBulletin(body, officeCode));
            } catch (error) {
                console.error("[YOUTH NOW] JMA warning bulletin failed:", error.message);
            }
        }
    });

    await Promise.all(workers);
    return alerts;
}


/* ============================================================
   19. DISASTER
============================================================ */

async function loadDisaster() {

    if (
        CACHE.disaster.data &&
        Date.now() -
            CACHE.disaster.time <
            CACHE_TTL.disaster
    ) {

        return CACHE.disaster.data;
    }


    const result = {

        alerts:
            [],

        earthquakes:
            [],

        tsunamis:
            [],

        typhoons:
            [],

        sources: {
            earthquakes: false,
            alerts: false,
            tsunamis: false
        },

        updatedAt:
            ""
    };


    /*
     * 地震
     */

    try {

        const data =
            await fetchJSON(
                "https://www.jma.go.jp/bosai/quake/data/list.json",
                {
                    timeout:
                        15000
                }
            );


        result.earthquakes =
            (
                Array.isArray(
                    data
                )
                    ? data
                    : []
            )

                .map(
                    earthquakeFromJMA
                )

                .filter(
                    Boolean
                )

                .slice(
                    0,
                    30
                );

        result.sources.earthquakes = true;

    } catch (error) {

        console.error(
            "[YOUTH NOW] 地震取得失敗:",
            error.message
        );
    }


    /*
     * 警報・注意報
     */

    try {

        result.alerts = (await loadJmaWarnings()).slice(0, 100);

        result.sources.alerts = true;

    } catch (error) {

        console.error(
            "[YOUTH NOW] 警報取得失敗:",
            error.message
        );
    }


    /*
     * 津波
     */

    try {

        const xml =
            await fetchText(
                "https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml",
                {

                    timeout:
                        15000,

                    accept:
                        "application/xml,text/xml,*/*"
                }
            );


        const entries =
            xml.match(
                /<entry\b[\s\S]*?<\/entry>/gi
            ) ||
            [];


        result.tsunamis =
            entries

                .map(
                    entry => {

                        const title =
                            stripHTML(
                                xmlTag(
                                    entry,
                                    "title"
                                )
                            );


                        const updated =
                            safeString(
                                xmlTag(
                                    entry,
                                    "updated"
                                )
                            );


                        const id =
                            safeString(
                                xmlTag(
                                    entry,
                                    "id"
                                )
                            );


                        if (
                            !/津波/.test(
                                title
                            )
                        ) {

                            return null;
                        }


                        return {

                            id:
                                id ||
                                `${title}-${updated}`,

                            title:
                                "津波情報",

                            text:
                                title,

                            area:
                                "",

                            type:
                                "tsunami",

                            time:
                                updated,

                            source:
                                "気象庁"
                        };
                    }
                )

                .filter(
                    Boolean
                )

                .slice(
                    0,
                    30
                );

        result.sources.tsunamis = true;

    } catch (error) {

        console.error(
            "[YOUTH NOW] 津波取得失敗:",
            error.message
        );
    }


    result.updatedAt =
        nowISO();


    CACHE.disaster.data =
        result;


    CACHE.disaster.time =
        Date.now();


    return result;
}




module.exports = { loadDisaster };
