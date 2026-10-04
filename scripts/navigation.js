/* ============================================================
   08. ナビゲーション
============================================================ */

function normalizePage(
    page
) {
    const value =
        safeString(
            page,
            "home"
        ).toLowerCase();


    const aliases = {
        top:
            "home",

        news:
            "news",

        music:
            "music",

        weather:
            "weather",

        disaster:
            "disaster",

        ai:
            "ai",

        settings:
            "settings"
    };


    return aliases[value] ||
        "home";
}


function showPage(
    page,
    skipTransition = false
) {

    const targetPage =
        normalizePage(
            page
        );

    if (
        !skipTransition &&
        targetPage !== currentPage &&
        typeof document.startViewTransition === "function" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        document.startViewTransition(
            () => showPage(targetPage, true)
        );
        return;
    }


    const pageMap = {
        home:
            DOM.homePage,

        news:
            DOM.newsPage,

        music:
            DOM.musicPage,

        weather:
            DOM.weatherPage,

        disaster:
            DOM.disasterPage,

        ai:
            DOM.aiPage,

        settings:
            DOM.settingsPage
    };


    Object.entries(
        pageMap
    ).forEach(
        (
            [
                key,
                element
            ]
        ) => {

            if (!element) {
                return;
            }


            const active =
                key ===
                targetPage;


            element.hidden =
                !active;


            element.classList.toggle(
                "active-page",
                active
            );
        }
    );


    $all(
        "[data-page]"
    ).forEach(
        element => {

            const elementPage =
                normalizePage(
                    element.dataset.page
                );


            element.classList.toggle(
                "active",
                elementPage ===
                    targetPage &&
                element.classList.contains(
                    "nav-button"
                )
            );
        }
    );


    currentPage =
        targetPage;


    safeStorageSet(
        APP_CONFIG.lastPageStorageKey,
        currentPage
    );


    if (
        DOM.mainNav
    ) {
        DOM.mainNav.classList.remove(
            "open"
        );
    }


    if (
        DOM.menuButton
    ) {
        DOM.menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    window.scrollTo({
        top:
            0,

        behavior:
            "smooth"
    });


    if (
        currentPage ===
        "news"
    ) {

        if (
            !newsData.length
        ) {
            loadNews(
                currentCategory,
                searchWord
            );
        }

        renderNews();

    }


    if (
        currentPage ===
        "music"
    ) {

        if (
            !musicData.length
        ) {
            loadMusic(
                musicSearchWord
            );
        } else {

            renderMusic();
        }
    }


    if (
        currentPage ===
        "weather"
    ) {

        renderWeather();
    }


    if (
        currentPage ===
        "disaster"
    ) {

        renderDisaster();
        if (typeof initDisasterMap === "function") requestAnimationFrame(initDisasterMap);
    }


    if (
        currentPage ===
        "settings"
    ) {

        updateSettingsView();
    }
}


function bindNavigation() {

    $all(
        "[data-page]"
    ).forEach(
        element => {

            addEvent(
                element,
                "click",
                event => {

                    event.preventDefault();

                    const page =
                        element.dataset.page ||
                        "home";

                    showPage(
                        page
                    );
                }
            );
        }
    );


    addEvent(
        DOM.menuButton,
        "click",
        event => {

            event.preventDefault();

            if (
                !DOM.mainNav
            ) {
                return;
            }


            const open =
                DOM.mainNav.classList.toggle(
                    "open"
                );


            DOM.menuButton.setAttribute(
                "aria-expanded",
                String(
                    open
                )
            );
        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !DOM.mainNav ||
                !DOM.menuButton
            ) {
                return;
            }


            const target =
                event.target;


            if (
                DOM.mainNav.contains(
                    target
                ) ||
                DOM.menuButton.contains(
                    target
                )
            ) {
                return;
            }


            DOM.mainNav.classList.remove(
                "open"
            );


            DOM.menuButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    );
}


