/* News normalization, retrieval, filtering, and article-link helpers. */

/* ============================================================
   09. NEWS データ
============================================================ */

function normalizeNewsCategory(
    category
) {
    const value =
        safeString(
            category,
            "TOP"
        ).toUpperCase();


    const aliases = {

        TOP:
            "TOP",

        NEWS:
            "NEWS",

        WORLD:
            "WORLD",

        SPORTS:
            "SPORTS",

        ENTERTAINMENT:
            "ENTERTAINMENT",

        SCIENCE:
            "SCIENCE",

        TECHNOLOGY:
            "TECHNOLOGY",

        GAME:
            "GAME",

        "AI-TECH":
            "AI・TECH",

        "AI・TECH":
            "AI・TECH",

        "AI TECH":
            "AI・TECH",

        FAVORITES:
            "FAVORITES",

        READ_LATER:
            "READ_LATER"
    };


    return aliases[value] ||
        "TOP";
}


function normalizeNewsItem(
    item
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
                item.id ||
                item.guid ||
                item.url ||
                item.link ||
                item.title
            ),

        title:
            safeString(
                item.title ||
                item.name,
                "ニュース"
            ),

        text:
            safeString(
                item.text ||
                item.description ||
                item.summary ||
                item.content,
                ""
            ),

        category:
            normalizeNewsCategory(
                item.category ||
                "NEWS"
            ),

        source:
            safeString(
                item.source ||
                item.publisher ||
                item.site,
                "ニュース"
            ),

        url:
            safeExternalURL(
                item.url ||
                item.link ||
                item.href
            ),

        image:
            safeExternalURL(
                item.image ||
                item.imageUrl ||
                item.thumbnail
            ),

        publishedAt:
            safeString(
                item.publishedAt ||
                item.pubDate ||
                item.published ||
                item.date,
                ""
            )
    };
}


function normalizeNewsData(
    data
) {

    let items = [];


    if (
        Array.isArray(
            data
        )
    ) {

        items =
            data;

    } else if (
        Array.isArray(
            data?.items
        )
    ) {

        items =
            data.items;

    } else if (
        Array.isArray(
            data?.news
        )
    ) {

        items =
            data.news;

    } else if (
        Array.isArray(
            data?.articles
        )
    ) {

        items =
            data.articles;
    }


    return items
        .map(
            normalizeNewsItem
        )
        .filter(
            Boolean
        );
}


/* ============================================================
   10. NEWS 取得
============================================================ */

async function loadNews(
    category =
        currentCategory,
    query = ""
) {

    const requestedCategory =
        normalizeNewsCategory(
            category
        );


    if (
        requestedCategory === "FAVORITES" ||
        requestedCategory === "READ_LATER"
    ) {

        currentCategory =
            requestedCategory;

        renderNews();

        return;
    }


    if (
        newsLoading
    ) {
        return;
    }


    newsLoading =
        true;


    currentCategory =
        requestedCategory;


    updateCategoryButtons();


    if (
        DOM.refreshButton
    ) {
        setDisabled(
            DOM.refreshButton,
            true
        );
    }


    try {

        const params =
            new URLSearchParams();


        params.set(
            "category",
            requestedCategory
        );


        if (
            safeString(
                query
            )
        ) {

            params.set(
                "q",
                safeString(
                    query
                )
            );
        }


        const data =
            await requestJSON(
                `${APP_CONFIG.api.news}?${params.toString()}`
            );


        newsData =
            normalizeNewsData(
                data
            );

        newsRequestFailed = false;


        lastNewsLoadTime =
            Date.now();


        renderNews();

        renderHome();

        updateLastUpdated();

        updateTodaySummary();
        if (typeof updateDataFreshness === "function") updateDataFreshness();


        if (
            DOM.lastUpdated
        ) {

            setText(
                DOM.lastUpdated,
                formatDateTime(
                    new Date()
                )
            );
        }


        announce(
            "ニュースを更新しました"
        );


        if (
            DOM.newsList &&
            !newsData.length
        ) {

            setHTML(
                DOM.newsList,
                `
                <div class="empty-card">
                    このカテゴリーのニュースは見つかりませんでした。
                </div>
                `
            );
        }

    } catch (error) {

        newsRequestFailed = true;

        console.error(
            "[YOUTH NOW] ニュース取得失敗",
            error
        );


        if (
            DOM.newsList &&
            !newsData.length
        ) {

            setHTML(
                DOM.newsList,
                `
                <div class="empty-card">
                    ニュースを取得できませんでした。
                    <br>
                    <small>
                        サーバーやインターネット接続を確認してください。
                    </small>
                </div>
                `
            );
        }

    } finally {

        if (typeof updateDataFreshness === "function") updateDataFreshness();

        newsLoading =
            false;


        if (
            DOM.refreshButton
        ) {
            setDisabled(
                DOM.refreshButton,
                false
            );
        }
    }
}


function getFilteredNews() {

    let items = currentCategory === "READ_LATER"
        ? getReadLaterNews()
        : [...newsData];


    if (
        currentCategory ===
        "FAVORITES"
    ) {

        items =
            items.filter(
                item =>
                    favoriteLinks.includes(
                        item.url
                    )
            );
    }


    const word =
        searchWord
            .trim()
            .toLowerCase();


    if (
        word
    ) {

        const words =
            word
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
                            item.category,
                            item.source
                        ]
                            .join(
                                " "
                            )
                            .toLowerCase();


                    return words.every(
                        searchTerm =>
                            haystack.includes(
                                searchTerm
                            )
                    );
                }
            );
    }


    if (typeof rankNewsForLocalView === "function") items = rankNewsForLocalView(items);
    return typeof rankNewsByFollowedTopics === "function" ? rankNewsByFollowedTopics(items) : items;
}


function isNewArticle(
    item
) {

    if (
        !item?.publishedAt
    ) {
        return false;
    }


    const time =
        new Date(
            item.publishedAt
        ).getTime();


    if (
        Number.isNaN(
            time
        )
    ) {
        return false;
    }


    const hours =
        (
            Date.now() -
            time
        ) /
        1000 /
        60 /
        60;


    return (
        hours >= 0 &&
        hours <= 6
    );
}


function makeArticleLink(
    item
) {

    if (
        !item?.url
    ) {
        return "#";
    }


    const articleURL = safeExternalURL(item.url);
    if (!articleURL) {
        return "#";
    }

    // Google News RSS links can show an account-restricted interstitial.
    // Resolve them on the local server, then redirect to the publisher.
    return `/go?url=${encodeURIComponent(articleURL)}`;
}
