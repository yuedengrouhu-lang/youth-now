/* ============================================================
   07. テーマ
============================================================ */

function loadTheme() {

    const theme =
        safeString(
            safeStorageGet(
                APP_CONFIG.themeStorageKey
            )
        );


    if (
        theme ===
        "dark"
    ) {

        document.body.classList.add(
            "dark-mode"
        );

    } else {

        document.body.classList.remove(
            "dark-mode"
        );
    }


    updateThemeButton();
}


function toggleTheme() {

    const isDark =
        document.body.classList.toggle(
            "dark-mode"
        );


    safeStorageSet(
        APP_CONFIG.themeStorageKey,
        isDark
            ? "dark"
            : "light"
    );


    updateThemeButton();

    announce(
        isDark
            ? "ダークモードにしました"
            : "ライトモードにしました"
    );
}


function updateThemeButton() {

    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    if (
        DOM.themeButton
    ) {

        setText(
            DOM.themeButton.querySelector(
                ".theme-icon"
            ),
            isDark
                ? "☀"
                : "◐"
        );


        DOM.themeButton.title =
            isDark
                ? "ライトモード"
                : "ダークモード";


        DOM.themeButton.setAttribute(
            "aria-label",
            isDark
                ? "ライトモードに切り替える"
                : "ダークモードに切り替える"
        );
    }


    if (
        DOM.settingsThemeButton
    ) {

        setText(
            DOM.settingsThemeButton,
            isDark
                ? "ライトモードにする"
                : "ダークモードにする"
        );
    }
}



