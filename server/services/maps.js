"use strict";

const { fetchJSON } = require("../utils");
const cache = new Map();
const allowedKinds = new Set(["sih", "sfh", "skhb04", "skhb05"]);

async function loadShelterTile(kind, x, y) {
    if (!allowedKinds.has(kind)) throw new Error("避難場所データの種類が不正です。");
    const key = kind + "/" + x + "/" + y;
    const old = cache.get(key);
    if (old && Date.now() - old.time < 6 * 60 * 60 * 1000) return old.data;
    const url = "https://cyberjapandata.gsi.go.jp/xyz/" + kind + "/10/" + x + "/" + y + ".geojson";
    const data = await fetchJSON(url, { timeout: 12000 });
    const normalized = data && data.type === "FeatureCollection" && Array.isArray(data.features)
        ? data
        : { type: "FeatureCollection", features: [] };
    cache.set(key, { data: normalized, time: Date.now() });
    while (cache.size > 100) cache.delete(cache.keys().next().value);
    return normalized;
}

module.exports = { loadShelterTile };
