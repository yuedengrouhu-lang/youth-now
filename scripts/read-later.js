"use strict";

const READ_LATER_STORAGE_KEY = "youthNowReadLaterNews";
let readLaterNews = [];

function loadReadLaterNews() {
    const stored = parseJSON(safeStorageGet(READ_LATER_STORAGE_KEY), []);
    readLaterNews = Array.isArray(stored)
        ? stored
            .map(item => normalizeNewsItem(item))
            .filter(item => item?.url)
            .filter((item, index, items) => items.findIndex(candidate => candidate.url === item.url) === index)
            .slice(0, 100)
        : [];
}

function getReadLaterNews() {
    return [...readLaterNews];
}

function isNewsSavedForLater(item) {
    return Boolean(item?.url && readLaterNews.some(saved => saved.url === item.url));
}

function toggleNewsReadLater(item) {
    if (!item?.url) return false;

    const existingIndex = readLaterNews.findIndex(saved => saved.url === item.url);
    if (existingIndex >= 0) {
        readLaterNews.splice(existingIndex, 1);
        announce("あとで読むリストから削除しました");
    } else {
        const normalized = normalizeNewsItem(item);
        if (!normalized?.url) return false;
        readLaterNews.unshift(normalized);
        readLaterNews = readLaterNews.slice(0, 100);
        announce("あとで読むリストに保存しました");
    }

    safeStorageSet(READ_LATER_STORAGE_KEY, JSON.stringify(readLaterNews));
    return true;
}
