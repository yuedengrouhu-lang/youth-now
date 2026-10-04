"use strict";

const { CACHE, CACHE_TTL } = require("../config");
const { nowISO, fetchJSON } = require("../utils");

const WIKIDATA_QUERY = `
SELECT ?prefectureLabel ?capitalLabel WHERE {
  ?prefecture wdt:P31 wd:Q50337;
              wdt:P17 wd:Q17;
              wdt:P36 ?capital.
  FILTER NOT EXISTS { ?prefecture wdt:P576 ?abolishedAt. }
  FILTER NOT EXISTS { ?prefecture wdt:P582 ?endedAt. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja". }
}
LIMIT 100
`;

async function loadQuiz() {
    let facts = CACHE.quiz.data;

    if (!facts || Date.now() - CACHE.quiz.time >= CACHE_TTL.quiz) {
        const endpoint = new URL("https://query.wikidata.org/sparql");
        endpoint.searchParams.set("query", WIKIDATA_QUERY);
        endpoint.searchParams.set("format", "json");

        const response = await fetchJSON(endpoint.href, {
            accept: "application/sparql-results+json",
            timeout: 20000,
            maxBytes: 512 * 1024
        });

        facts = (response?.results?.bindings || [])
            .map(row => ({
                prefecture: String(row.prefectureLabel?.value || "").trim(),
                capital: String(row.capitalLabel?.value || "").trim()
            }))
            .filter(row => row.prefecture && row.capital)
            .filter((row, index, list) =>
                list.findIndex(item => item.prefecture === row.prefecture) === index
            );

        if (facts.length < 4) {
            throw new Error("Wikidataからクイズに使えるデータを十分取得できませんでした。");
        }

        CACHE.quiz.data = facts;
        CACHE.quiz.time = Date.now();
    }

    return {
        provider: "Wikidata Query Service",
        category: "日本の地理",
        sourceUrl: "https://www.wikidata.org/wiki/Q50337",
        fetchedAt: nowISO(),
        items: facts
    };
}

module.exports = { loadQuiz };
