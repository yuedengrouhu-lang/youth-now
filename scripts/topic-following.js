"use strict";

const FOLLOWED_TOPICS_STORAGE_KEY = "youthNowFollowedTopics";
const MAX_FOLLOWED_TOPICS = 12;
let followedNewsTopics = [];

function normalizeFollowedTopic(value) {
    return safeString(value, "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function loadFollowedNewsTopics() {
    const stored = parseJSON(safeStorageGet(FOLLOWED_TOPICS_STORAGE_KEY), []);
    const seen = new Set();
    followedNewsTopics = Array.isArray(stored)
        ? stored.map(normalizeFollowedTopic).filter(topic => {
            const key = topic.toLocaleLowerCase("ja");
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, MAX_FOLLOWED_TOPICS)
        : [];
    renderFollowedTopics();
}

function getFollowedNewsTopics() {
    return [...followedNewsTopics];
}

function getMatchingFollowedTopics(item) {
    const searchable = [item?.title, item?.text, item?.category].filter(Boolean).join(" ").toLocaleLowerCase("ja");
    return followedNewsTopics.filter(topic => searchable.includes(topic.toLocaleLowerCase("ja")));
}

function rankNewsByFollowedTopics(items) {
    return items
        .map((item, index) => ({ item, index, matches: getMatchingFollowedTopics(item).length }))
        .sort((a, b) => b.matches - a.matches || a.index - b.index)
        .map(entry => entry.item);
}

function renderFollowedTopics() {
    const list = document.querySelector("#topic-follow-list");
    const count = document.querySelector("#topic-follow-count");
    const status = document.querySelector("#topic-follow-status");
    if (count) count.textContent = `${followedNewsTopics.length}件登録`;
    if (!list) return;

    list.replaceChildren();
    followedNewsTopics.forEach((topic, index) => {
        const chip = document.createElement("span");
        chip.className = "topic-follow-chip";
        const label = document.createElement("span");
        label.textContent = topic;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.removeFollowedTopic = String(index);
        remove.setAttribute("aria-label", `${topic}を登録解除`);
        remove.textContent = "×";
        chip.append(label, remove);
        list.append(chip);
    });

    if (status) {
        const matched = new Set(newsData.filter(item => getMatchingFollowedTopics(item).length).map(item => item.id)).size;
        status.textContent = followedNewsTopics.length
            ? matched ? `現在のニュースで${matched}件が一致しています。`
                : "現在のニュースに一致する記事はありません。新着記事に合う言葉を上に表示します。"
            : "キーワードを登録すると、合うニュースを一覧の上に表示します。";
    }
}

function persistFollowedNewsTopics() {
    safeStorageSet(FOLLOWED_TOPICS_STORAGE_KEY, JSON.stringify(followedNewsTopics));
    renderFollowedTopics();
    if (typeof renderNews === "function") renderNews();
    if (typeof renderHome === "function") renderHome();
}

function bindTopicFollowing() {
    const form = document.querySelector("#topic-follow-form");
    const input = document.querySelector("#topic-follow-input");
    const list = document.querySelector("#topic-follow-list");
    const status = document.querySelector("#topic-follow-status");
    if (!form || !input || !list) return;

    form.addEventListener("submit", event => {
        event.preventDefault();
        const topic = normalizeFollowedTopic(input.value);
        if (!topic) {
            if (status) status.textContent = "登録するキーワードを入力してください。";
            input.focus();
            return;
        }
        const normalized = topic.toLocaleLowerCase("ja");
        if (followedNewsTopics.some(item => item.toLocaleLowerCase("ja") === normalized)) {
            if (status) status.textContent = "このキーワードは登録済みです。";
            input.select();
            return;
        }
        if (followedNewsTopics.length >= MAX_FOLLOWED_TOPICS) {
            if (status) status.textContent = `キーワードは最大${MAX_FOLLOWED_TOPICS}件まで登録できます。`;
            return;
        }
        followedNewsTopics.push(topic);
        input.value = "";
        persistFollowedNewsTopics();
        if (status) status.textContent = `「${topic}」を登録しました。`;
    });

    list.addEventListener("click", event => {
        const button = event.target.closest("[data-remove-followed-topic]");
        if (!button) return;
        const index = Number(button.dataset.removeFollowedTopic);
        const [removed] = followedNewsTopics.splice(index, 1);
        persistFollowedNewsTopics();
        if (status) status.textContent = removed ? `「${removed}」を登録解除しました。` : "登録を更新しました。";
    });
}
