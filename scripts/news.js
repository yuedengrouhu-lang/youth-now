/* ============================================================
   11. NEWS 表示
============================================================ */

function createNewsCard(
    item,
    index,
    featured =
        false
) {

    const favorite =
        favoriteLinks.includes(
            item.url
        );

    const savedForLater =
        typeof isNewsSavedForLater === "function" &&
        isNewsSavedForLater(item);
    const followedTopic =
        typeof getMatchingFollowedTopics === "function" ? getMatchingFollowedTopics(item)[0] : "";


    return `
        <article
            class="news-card ${featured ? "featured" : ""}"
        >

            <div class="news-card-top">

                <span class="news-category">
                    ${escapeHTML(
                        item.category
                    )}
                </span>

                <span class="news-source">
                    ${escapeHTML(
                        item.source
                    )}
                </span>
                <span class="news-importance importance-${(window.getNewsImportance ? window.getNewsImportance(item) : 1)}">${(window.getNewsImportance ? window.getNewsImportance(item) : 1) === 3 ? "重要" : (window.getNewsImportance ? window.getNewsImportance(item) : 1) === 2 ? "注目" : "通常"}</span>
                ${(window.isNewsRelevant && window.isNewsRelevant(item)) ? '<span class="news-local-badge">地域関連</span>' : ""}
                ${followedTopic ? `<span class="news-topic-badge">${escapeHTML(followedTopic)}</span>` : ""}

            </div>


            <h3 class="news-title">

                ${
                    item.url
                        ? `
                            <a
                                href="${escapeHTML(
                                    makeArticleLink(
                                        item
                                    )
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ${escapeHTML(
                                    item.title
                                )}
                            </a>
                          `
                        : escapeHTML(
                            item.title
                        )
                }

            </h3>


            ${
                item.text
                    ? `
                        <p class="news-text">
                            ${escapeHTML(
                                item.text
                            )}
                        </p>
                      `
                    : ""
            }


            <div class="news-meta">

                <span class="news-date">

                    ${
                        isNewArticle(
                            item
                        )
                            ? "NEW · "
                            : ""
                    }

                    ${escapeHTML(
                        formatDateTime(
                            item.publishedAt
                        )
                    )}

                </span>


                <div class="news-actions">
                    <button type="button" class="news-action" data-news-summary data-news-id="${escapeHTML(item.id)}">AIで3行要約</button>

                    ${
                        item.url
                            ? `
                                <a
                                    class="news-action"
                                    href="${escapeHTML(
                                        makeArticleLink(
                                            item
                                        )
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    記事 →
                                </a>
                              `
                            : ""
                    }


                    <button
                        type="button"
                        class="news-action favorite-button"
                        data-news-favorite-index="${index}"
                        aria-label="${
                            favorite
                                ? "お気に入りから削除"
                                : "お気に入りに追加"
                        }"
                    >
                        ${
                            favorite
                                ? "⭐"
                                : "☆"
                        }
                    </button>

                    <button
                        type="button"
                        class="news-action read-later-button ${savedForLater ? "is-saved" : ""}"
                        data-news-read-later-index="${index}"
                        aria-pressed="${savedForLater}"
                        aria-label="${savedForLater ? "あとで読むから削除" : "あとで読むに保存"}"
                    >
                        ${savedForLater ? "✓ 保存済み" : "＋ あとで読む"}
                    </button>

                </div>

            </div>

        </article>
    `;
}


function renderNews() {

    if (
        !DOM.newsList
    ) {
        return;
    }

    if (typeof renderFollowedTopics === "function") renderFollowedTopics();


    const items =
        getFilteredNews();


    if (
        !items.length
    ) {

        const message =
            currentCategory === "READ_LATER"

                ? "あとで読む記事はまだありません。ニュースカードの「＋ あとで読む」から保存できます。"

                : currentCategory === "FAVORITES"

                    ? "お気に入り登録したニュースがありません。"

                    : searchWord

                        ? "検索結果がありません。"

                        : "このカテゴリーのニュースがありません。";


        setHTML(
            DOM.newsList,
            `
            <div class="empty-card">
                ${escapeHTML(
                    message
                )}
            </div>
            `
        );

        return;
    }


    const displayItems =
        items.slice(
            0,
            50
        );


    setHTML(
        DOM.newsList,
        displayItems
            .map(
                (
                    item,
                    index
                ) =>
                    createNewsCard(
                        item,
                        index,
                        false
                    )
            )
            .join(
                ""
            )
    );


    $all(
        "[data-news-favorite-index]"
    ).forEach(
        button => {

            addEvent(
                button,
                "click",
                event => {

                    event.preventDefault();

                    const index =
                        Number(
                            button.dataset
                                .newsFavoriteIndex
                        );


                    const item =
                        displayItems[
                            index
                        ];


                    toggleNewsFavorite(
                        item
                    );
                }
            );
        }
    );

    $all("[data-news-read-later-index]").forEach(button => {
        addEvent(button, "click", event => {
            event.preventDefault();
            const index = Number(button.dataset.newsReadLaterIndex);
            const item = displayItems[index];
            if (!item) return;
            toggleNewsReadLater(item);
            renderNews();
        });
    });
}


function toggleNewsFavorite(
    item
) {

    if (
        !item?.url
    ) {
        return;
    }


    const index =
        favoriteLinks.indexOf(
            item.url
        );


    if (
        index >= 0
    ) {

        favoriteLinks.splice(
            index,
            1
        );


        announce(
            "お気に入りから削除しました"
        );

    } else {

        favoriteLinks.push(
            item.url
        );


        announce(
            "お気に入りに追加しました"
        );
    }


    saveFavorites();

    renderNews();

    renderHome();
}


/* ============================================================
   12. NEWS カテゴリー
============================================================ */

function updateCategoryButtons() {

    $all(
        ".category-button"
    ).forEach(
        button => {

            const buttonCategory =
                normalizeNewsCategory(
                    button.dataset.category
                );


            const active =
                buttonCategory ===
                currentCategory;


            button.classList.toggle(
                "active",
                active
            );


            button.setAttribute(
                "aria-selected",
                String(
                    active
                )
            );
        }
    );
}


function bindNews() {

    addEvent(
        DOM.searchInput,
        "input",
        () => {

            searchWord =
                getValue(
                    DOM.searchInput
                );

            renderNews();
        }
    );


    addEvent(
        DOM.searchInput,
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                renderNews();
            }
        }
    );


    addEvent(
        DOM.refreshButton,
        "click",
        event => {

            event.preventDefault();

            loadNews(
                currentCategory,
                searchWord
            );
        }
    );


    $all(
        ".category-button"
    ).forEach(
        button => {

            addEvent(
                button,
                "click",
                event => {

                    event.preventDefault();

                    const selected =
                        safeString(
                            button.dataset.category,
                            "TOP"
                        );


                    currentCategory =
                        selected ===
                        "FAVORITES"

                            ? "FAVORITES"

                            : normalizeNewsCategory(
                                selected
                            );


                    updateCategoryButtons();


                    if (
                        currentCategory ===
                        "FAVORITES"
                    ) {

                        renderNews();

                        return;
                    }


                    loadNews(
                        currentCategory
                    );
                }
            );
        }
    );
}


/* ============================================================
   13. HOME
============================================================ */

function renderHome() {

    renderHomeTopNews();

    renderTrendList();

    updateHomeWeather();

    updateHomeDisaster();

    updateTodaySummary();
}


function renderHomeTopNews() {

    if (
        !DOM.topThree
    ) {
        return;
    }


    const sourceItems =
        newsData.length
            ? newsData
            : [];


    if (
        !sourceItems.length
    ) {

        setHTML(
            DOM.topThree,
            `
            <article class="empty-card">
                ニュースを読み込んでいます…
            </article>
            `
        );

        return;
    }


    let rankedItems = window.rankNewsForLocalView ? window.rankNewsForLocalView(sourceItems) : [...sourceItems];
    if (window.rankNewsByFollowedTopics) rankedItems = window.rankNewsByFollowedTopics(rankedItems);
    const items = rankedItems.slice(0, 3);


    setHTML(
        DOM.topThree,
        items
            .map(
                (
                    item,
                    index
                ) =>
                    `
                    <article class="news-card">
                        <div class="news-card-top">

                            <span class="news-category">
                                ${escapeHTML(
                                    item.category
                                )}
                            </span>

                            ${window.getMatchingFollowedTopics?.(item)?.[0] ? `<span class="news-topic-badge">${escapeHTML(window.getMatchingFollowedTopics(item)[0])}</span>` : ""}

                            ${
                                isNewArticle(
                                    item
                                )
                                    ? `
                                        <span class="news-source">
                                            NEW
                                        </span>
                                      `
                                    : ""
                            }

                        </div>

                        <h3 class="news-title">
                            ${
                                item.url
                                    ? `
                                        <a
                                            href="${escapeHTML(
                                                makeArticleLink(item)
                                            )}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            ${escapeHTML(
                                                item.title
                                            )}
                                        </a>
                                      `
                                    : escapeHTML(
                                        item.title
                                    )
                            }
                        </h3>

                        <div class="news-meta">

                            <span class="news-date">
                                ${escapeHTML(
                                    formatDateTime(
                                        item.publishedAt
                                    )
                                )}
                            </span>

                            <span class="news-date">
                                ${escapeHTML(
                                    item.source
                                )}
                            </span>

                        </div>
                    </article>
                    `
            )
            .join(
                ""
            )
    );
}


function renderTrendList() {

    if (
        !DOM.trendList
    ) {
        return;
    }


    if (
        !newsData.length
    ) {

        setText(
            DOM.trendList,
            "ニュースを読み込んでいます…"
        );

        return;
    }


    const words =
        new Map();


    newsData
        .slice(
            0,
            30
        )
        .forEach(
            item => {

                const text =
                    [
                        item.title
                    ]
                        .join(
                            " "
                        );


                text
                    .replace(
                        /[「」『』（）()[\]、。！？,.!?]/g,
                        " "
                    )
                    .split(
                        /\s+/
                    )
                    .map(
                        word =>
                            word.trim()
                    )
                    .filter(
                        word =>
                            word.length >= 2 &&
                            word.length <= 12
                    )
                    .forEach(
                        word => {

                            words.set(
                                word,
                                (
                                    words.get(
                                        word
                                    ) ||
                                    0
                                ) + 1
                            );
                        }
                    );
            }
        );


    const items =
        [...words.entries()]
            .sort(
                (
                    a,
                    b
                ) =>
                    b[1] -
                    a[1]
            )
            .slice(
                0,
                5
            );


    if (
        !items.length
    ) {

        setText(
            DOM.trendList,
            "話題のキーワードを準備中です。"
        );

        return;
    }


    setHTML(
        DOM.trendList,
        items
            .map(
                (
                    [
                        word,
                        count
                    ],
                    index
                ) =>
                    `
                    <div class="trend-item">

                        <span class="trend-number">
                            ${index + 1}
                        </span>

                        <span class="trend-word">
                            ${escapeHTML(
                                word
                            )}
                        </span>

                        <span class="trend-count">
                            ${count}件
                        </span>

                    </div>
                    `
            )
            .join(
                ""
            )
    );
}


function updateLastUpdated() {

    if (
        !DOM.lastUpdated
    ) {
        return;
    }


    if (
        !lastNewsLoadTime
    ) {

        setText(
            DOM.lastUpdated,
            "--"
        );

        return;
    }


    setText(
        DOM.lastUpdated,
        formatDateTime(
            lastNewsLoadTime
        )
    );
}



