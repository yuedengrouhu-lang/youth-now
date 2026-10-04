let deferredPWAInstall = null;

function setPWAStatus(message, state = "") {
    const status = document.querySelector("#pwa-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

function updatePWAConnectivity() {
    if (!navigator.onLine) {
        setPWAStatus("オフラインです。保存済みの画面を表示しています。防災情報は最新状態を取得できません。", "offline");
        return;
    }
    setPWAStatus("オンライン", "online");
}

async function initPWA() {
    updatePWAConnectivity();
    window.addEventListener("online", () => {
        updatePWAConnectivity();
        if (typeof loadWeather === "function") loadWeather();
        if (typeof loadNews === "function") loadNews(currentCategory, searchWord);
        if (typeof loadDisaster === "function") loadDisaster();
    });
    window.addEventListener("offline", updatePWAConnectivity);

    if (!("serviceWorker" in navigator)) {
        setPWAStatus(navigator.onLine ? "このブラウザーはオフライン保存に対応していません。" : "オフラインです。防災情報は最新状態を取得できません。", navigator.onLine ? "" : "offline");
        return;
    }
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
        setPWAStatus("インストールとオフライン機能にはHTTPS接続が必要です。");
        return;
    }
    const installButton = document.querySelector("#pwa-install-button");
    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (installButton) installButton.hidden = Boolean(alreadyInstalled);
    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        deferredPWAInstall = event;
        if (installButton) installButton.hidden = false;
    });
    window.addEventListener("appinstalled", () => {
        deferredPWAInstall = null;
        if (installButton) installButton.hidden = true;
        setPWAStatus("YOUTH NOW をインストールしました。", "online");
    });
    installButton?.addEventListener("click", async () => {
        if (!deferredPWAInstall) {
            setPWAStatus("ブラウザーのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。");
            return;
        }
        deferredPWAInstall.prompt();
        const choice = await deferredPWAInstall.userChoice;
        if (choice?.outcome === "accepted") setPWAStatus("インストールを開始しました。", "online");
        deferredPWAInstall = null;
        installButton.hidden = true;
    });
    try {
        const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        registration.update().catch(() => {});
        console.info("[YOUTH NOW] PWA service worker ready", registration.scope);
    } catch (error) {
        console.error("[YOUTH NOW] PWA登録失敗", error);
        setPWAStatus("オフライン機能を準備できませんでした。ページを再読み込みしてください。");
    }

    if (alreadyInstalled) {
        setPWAStatus(navigator.onLine ? "インストール済みアプリ · オンライン" : "インストール済みアプリ · オフライン", navigator.onLine ? "online" : "offline");
    }
}
