"use strict";

const SHELL_CACHE = "youth-now-shell-v1";
const DATA_CACHE = "youth-now-data-v1";
const SHELL_FILES = [
    "/",
    "/index.html",
    "/style.css",
    "/features.css",
    "/script.js",
    "/scripts/dom.js",
    "/scripts/storage.js",
    "/scripts/theme.js",
    "/scripts/navigation.js",
    "/scripts/news.js",
    "/scripts/weather.js",
    "/scripts/music.js",
    "/scripts/disaster.js",
    "/scripts/map.js",
    "/scripts/intelligence.js",
    "/scripts/pwa.js",
    "/scripts/ai.js",
    "/scripts/settings.js",
    "/scripts/quiz.js",
    "/scripts/app.js",
    "/manifest.webmanifest",
    "/icons/pwa-192.png",
    "/icons/pwa-512.png",
    "/icons/apple-touch-icon.png"
];
const OFFLINE_JSON = JSON.stringify({ error: "オフラインです。最新情報を取得できません。" });

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(SHELL_CACHE);
        await cache.addAll(SHELL_FILES);
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keep = new Set([SHELL_CACHE, DATA_CACHE]);
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith("youth-now-") && !keep.has(key)).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
    } catch {
        const cached = await cache.match(request);
        if (!cached) return new Response(OFFLINE_JSON, { status: 503, headers: { "Content-Type": "application/json; charset=utf-8", "X-PWA-Offline": "true" } });
        const headers = new Headers(cached.headers);
        headers.set("X-PWA-Cached", "true");
        return new Response(await cached.arrayBuffer(), { status: cached.status, statusText: cached.statusText, headers });
    }
}

async function shellResponse(request) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    const refresh = fetch(request).then(response => {
        if (response.ok && response.type !== "opaque") cache.put(request, response.clone());
        return response;
    });
    if (cached) {
        if (self.registration.active) refresh.catch(() => {});
        return cached;
    }
    try { return await refresh; }
    catch {
        if (request.mode === "navigate") return (await cache.match("/index.html")) || Response.error();
        return Response.error();
    }
}

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname === "/api/disaster" || url.pathname === "/api/geocode" || url.pathname.startsWith("/api/music")) {
        // Never replay cached emergency data as if it were current.
        event.respondWith(fetch(request).catch(() => new Response(OFFLINE_JSON, { status: 503, headers: { "Content-Type": "application/json; charset=utf-8", "X-PWA-Offline": "true" } })));
        return;
    }
    if (url.pathname === "/api/news" || url.pathname === "/api/weather" || url.pathname === "/api/map/shelters") {
        event.respondWith(networkFirst(request, DATA_CACHE));
        return;
    }
    if (request.mode === "navigate" || url.pathname === "/" || SHELL_FILES.includes(url.pathname)) {
        event.respondWith(shellResponse(request));
    }
});
