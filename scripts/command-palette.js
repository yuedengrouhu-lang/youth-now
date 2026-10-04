/* Keyboard-driven navigation and in-site content search. */

function bindCommandPalette() {
    const palette = document.querySelector("#command-palette");
    const trigger = document.querySelector("#command-trigger");
    const input = document.querySelector("#command-search");
    const pageOptions = Array.from(palette?.querySelectorAll("[data-command-page]") || []);
    const contentHost = palette?.querySelector("#command-content-results");
    const contentLabel = palette?.querySelector("#command-content-label");
    const status = palette?.querySelector("#command-search-status");

    if (!palette || !input || pageOptions.length === 0) return;

    let activeIndex = 0;
    let contentItems = [];

    const allOptions = () => Array.from(palette.querySelectorAll(".command-option"));
    const visibleOptions = () => allOptions().filter(option => !option.hidden);

    const setActive = index => {
        const visible = visibleOptions();
        allOptions().forEach(option => {
            option.classList.remove("is-active");
            option.setAttribute("aria-selected", "false");
        });
        if (!visible.length) {
            activeIndex = -1;
            return;
        }

        activeIndex = (index + visible.length) % visible.length;
        visible[activeIndex].classList.add("is-active");
        visible[activeIndex].setAttribute("aria-selected", "true");
        visible[activeIndex].scrollIntoView({ block: "nearest" });
    };

    const createContentOption = (result, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "command-option command-content-option";
        button.setAttribute("role", "option");
        button.dataset.commandContentIndex = String(index);

        const icon = document.createElement("span");
        icon.className = "command-option-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = result.kind === "news" ? "◫" : "◇";

        const copy = document.createElement("span");
        copy.className = "command-content-copy";
        const title = document.createElement("strong");
        title.textContent = result.title;
        const detail = document.createElement("small");
        detail.textContent = result.detail;
        copy.append(title, detail);

        const badge = document.createElement("span");
        badge.className = "command-content-badge";
        badge.textContent = result.badge;
        button.append(icon, copy, badge);
        return button;
    };

    const renderContentResults = rawQuery => {
        if (!contentHost) return;
        const query = rawQuery.trim().toLocaleLowerCase("ja");
        contentItems = [];
        contentHost.replaceChildren();

        if (!query) {
            contentHost.hidden = true;
            if (contentLabel) contentLabel.hidden = true;
            if (status) status.textContent = "ページ移動と、読み込み済みニュース・防災情報を検索できます。";
            return;
        }

        const terms = query.split(/\s+/).filter(Boolean);
        const byURL = new Map();
        [...newsData, ...(typeof getReadLaterNews === "function" ? getReadLaterNews() : [])].forEach(item => {
            const key = item.url || item.id || item.title;
            if (!key || byURL.has(key)) return;
            byURL.set(key, item);
        });

        let newsMatches = [...byURL.values()].filter(item => {
            const text = [item.title, item.text, item.source, item.category].join(" ").toLocaleLowerCase("ja");
            return terms.every(term => text.includes(term));
        });
        if (typeof rankNewsForLocalView === "function") newsMatches = rankNewsForLocalView(newsMatches);
        if (typeof rankNewsByFollowedTopics === "function") newsMatches = rankNewsByFollowedTopics(newsMatches);

        const eventMatches = (typeof getActiveDisasterEvents === "function" ? getActiveDisasterEvents() : [])
            .filter(item => terms.every(term => [item.title, item.text, item.area, item.type].join(" ").toLocaleLowerCase("ja").includes(term)));

        newsMatches.slice(0, 6).forEach(item => {
            const saved = typeof isNewsSavedForLater === "function" && isNewsSavedForLater(item);
            contentItems.push({
                kind: "news",
                item,
                saved,
                title: item.title || "ニュース",
                detail: [item.source, item.category].filter(Boolean).join(" · ") || "記事を開く",
                badge: saved ? "あとで読む" : "ニュース"
            });
        });
        eventMatches.slice(0, 5).forEach(item => {
            contentItems.push({
                kind: "disaster",
                item,
                title: item.title || "防災情報",
                detail: [item.area, item.type === "earthquake" && item.intensity ? `最大震度 ${item.intensity}` : ""].filter(Boolean).join(" · ") || "防災情報",
                badge: item.local ? "周辺" : "防災"
            });
        });

        contentHost.hidden = contentItems.length === 0;
        if (contentLabel) contentLabel.hidden = contentItems.length === 0;
        contentItems.forEach((item, index) => contentHost.append(createContentOption(item, index)));

        const pageCount = pageOptions.filter(option => !option.hidden).length;
        if (status) {
            status.textContent = contentItems.length
                ? `ページ ${pageCount}件、ニュース ${newsMatches.length}件、防災 ${eventMatches.length}件。矢印キーで選択してEnterで開きます。`
                : pageCount ? `記事や防災情報に一致する結果はありません。ページ ${pageCount}件が見つかりました。`
                    : "一致するページ・ニュース・防災情報はありません。";
        }
    };

    const navigateToContent = result => {
        palette.close();
        if (result.kind === "news") {
            currentCategory = result.saved ? "READ_LATER" : normalizeNewsCategory(result.item.category || "TOP");
            searchWord = result.item.title || "";
            if (DOM.searchInput) DOM.searchInput.value = searchWord;
            updateCategoryButtons();
            showPage("news");
            renderNews();
            return;
        }

        showPage("disaster");
        requestAnimationFrame(() => document.querySelector("#disaster-overview")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    const open = () => {
        if (!palette.open) {
            palette.showModal();
        }
        input.value = "";
        pageOptions.forEach(option => { option.hidden = false; });
        renderContentResults("");
        setActive(0);
        requestAnimationFrame(() => input.focus());
    };

    trigger?.addEventListener("click", open);

    document.addEventListener("keydown", event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            palette.open ? palette.close() : open();
        }
    });

    input.addEventListener("input", () => {
        const query = input.value.trim().toLocaleLowerCase("ja");
        pageOptions.forEach(option => {
            option.hidden = !option.textContent.toLocaleLowerCase("ja").includes(query);
        });
        renderContentResults(query);
        setActive(0);
    });

    input.addEventListener("keydown", event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        } else if (event.key === "Enter") {
            event.preventDefault();
            const active = visibleOptions()[activeIndex];
            active?.click();
        }
    });

    pageOptions.forEach(option => {
        option.addEventListener("pointermove", () => {
            const index = visibleOptions().indexOf(option);
            if (index >= 0) setActive(index);
        });
        option.addEventListener("click", () => {
            showPage(option.dataset.commandPage);
            palette.close();
        });
    });

    contentHost?.addEventListener("pointermove", event => {
        const option = event.target.closest("[data-command-content-index]");
        if (!option) return;
        const index = visibleOptions().indexOf(option);
        if (index >= 0) setActive(index);
    });
    contentHost?.addEventListener("click", event => {
        const option = event.target.closest("[data-command-content-index]");
        if (!option) return;
        const result = contentItems[Number(option.dataset.commandContentIndex)];
        if (result) navigateToContent(result);
    });

    palette.addEventListener("click", event => {
        if (event.target === palette) {
            palette.close();
        }
    });
}
