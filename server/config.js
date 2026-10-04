"use strict";

/*
============================================================
YOUTH NOW - server.js
HTML / CSS / JS 完全対応版
============================================================
*/

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { Readable, Transform } = require("node:stream");
const net = require("node:net");


/* ============================================================
   01. Google News Decoder
============================================================ */

let GoogleDecoder = null;

try {

    ({ GoogleDecoder } =
        require(
            "google-news-url-decoder"
        ));

} catch (error) {

    console.warn(
        "[YOUTH NOW] google-news-url-decoder が見つかりません。"
    );
}


/* ============================================================
   02. 基本設定
============================================================ */

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const PORT =
    Number(
        process.env.PORT
    ) ||
    3000;

const MAX_UPSTREAM_BYTES =
    5 * 1024 * 1024;

const MAX_PREVIEW_BYTES =
    15 * 1024 * 1024;

const MAX_QUERY_LENGTH =
    120;

const ROOT_DIR = path.resolve(__dirname, "..");


/* ============================================================
   03. キャッシュ
============================================================ */

const CACHE = {

    news:
        new Map(),

    music:
        new Map(),

    weather:
        new Map(),

    geocode:
        new Map(),

    disaster: {

        data:
            null,

        time:
            0
    },

    quiz: {
        data: null,
        time: 0
    }
};


const CACHE_TTL = {

    news:
        2 * 60 * 1000,

    music:
        10 * 60 * 1000,

    weather:
        5 * 60 * 1000,

    geocode:
        30 * 60 * 1000,

    disaster:
        60 * 1000,

    quiz:
        6 * 60 * 60 * 1000
};


/* ============================================================
   04. NEWS カテゴリー
============================================================ */

const NEWS_CATEGORIES = {

    TOP: {

        label:
            "トップ",

        query:
            "",

        feed:
            "https://news.google.com/rss" +
            "?hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    NEWS: {

        label:
            "国内ニュース",

        query:
            "日本 ニュース",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "日本 ニュース"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    WORLD: {

        label:
            "世界",

        query:
            "世界 ニュース",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "世界 ニュース"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    SPORTS: {

        label:
            "スポーツ",

        query:
            "スポーツ",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "スポーツ"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    ENTERTAINMENT: {

        label:
            "エンタメ",

        query:
            "エンタメ 芸能",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "エンタメ 芸能"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    SCIENCE: {

        label:
            "科学",

        query:
            "科学",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "科学"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    TECHNOLOGY: {

        label:
            "テクノロジー",

        query:
            "テクノロジー",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "テクノロジー"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    GAME: {

        label:
            "ゲーム",

        query:
            "ゲーム",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "ゲーム"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    },


    "AI・TECH": {

        label:
            "AI・TECH",

        query:
            "AI テクノロジー",

        feed:
            "https://news.google.com/rss/search" +
            `?q=${encodeURIComponent(
                "AI テクノロジー"
            )}` +
            "&hl=ja" +
            "&gl=JP" +
            "&ceid=JP:ja"
    }
};


/* ============================================================
   05. MIME
============================================================ */

const MIME_TYPES = {

    ".html":
        "text/html; charset=utf-8",

    ".css":
        "text/css; charset=utf-8",

    ".js":
        "application/javascript; charset=utf-8",

    ".json":
        "application/json; charset=utf-8",

    ".webmanifest":
        "application/manifest+json; charset=utf-8",

    ".txt":
        "text/plain; charset=utf-8",

    ".svg":
        "image/svg+xml",

    ".png":
        "image/png",

    ".jpg":
        "image/jpeg",

    ".jpeg":
        "image/jpeg",

    ".webp":
        "image/webp",

    ".gif":
        "image/gif",

    ".ico":
        "image/x-icon"
};


/* ============================================================
   06. 音楽試聴許可ホスト
============================================================ */

const PREVIEW_HOSTS =
    new Set([

        "audio-ssl.itunes.apple.com",

        "audio.itunes.apple.com",

        "aod.itunes.apple.com"
    ]);


/* ============================================================
   07. ジオコード制御
============================================================ */




/* ============================================================
   08. 共通ヘルパー
============================================================ */


module.exports = {
  HOST, PORT, ROOT_DIR, MAX_UPSTREAM_BYTES, MAX_PREVIEW_BYTES, MAX_QUERY_LENGTH,
  CACHE, CACHE_TTL, NEWS_CATEGORIES, MIME_TYPES, PREVIEW_HOSTS, GoogleDecoder
};
