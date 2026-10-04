"use strict";

const ACCESSIBILITY_STORAGE_KEY = "youthNowAccessibility";

function normalizeAccessibilityPreferences(value) {
    const fontScale = Number(value?.fontScale);
    return {
        fontScale: Number.isFinite(fontScale) ? Math.min(130, Math.max(90, fontScale)) : 100,
        highContrast: Boolean(value?.highContrast),
        reduceMotion: Boolean(value?.reduceMotion)
    };
}

function applyAccessibilityPreferences(preferences) {
    const prefs = normalizeAccessibilityPreferences(preferences);
    document.documentElement.style.fontSize = `${prefs.fontScale}%`;
    document.body.classList.toggle("accessibility-high-contrast", prefs.highContrast);
    document.body.classList.toggle("accessibility-reduced-motion", prefs.reduceMotion);
}

function initAccessibilitySettings() {
    const container = document.querySelector("#settings-page .container");
    if (!container) return;

    let panel = container.querySelector(".accessibility-settings-section");
    if (!panel) {
        panel = document.createElement("section");
        panel.className = "settings-section accessibility-settings-section";
        panel.setAttribute("aria-labelledby", "accessibility-settings-title");
        panel.innerHTML = `
            <div class="settings-card">
                <div class="settings-card-header">
                    <div><span class="section-kicker">READABILITY</span><h2 id="accessibility-settings-title">見やすさの設定</h2></div>
                </div>
                <p class="settings-description">文字の大きさや動きを調整できます。設定はこの端末に保存されます。</p>
                <div class="accessibility-setting-row accessibility-font-row">
                    <label for="accessibility-font-scale"><strong>文字サイズ</strong><span>ページ全体の文字を拡大・縮小</span></label>
                    <div class="accessibility-range-control"><input id="accessibility-font-scale" type="range" min="90" max="130" step="10" value="100"><output id="accessibility-font-value" for="accessibility-font-scale">100%</output></div>
                </div>
                <label class="accessibility-setting-row accessibility-check-row" for="accessibility-high-contrast">
                    <span><strong>コントラストを高める</strong><small>文字や境界を見分けやすくします</small></span>
                    <input id="accessibility-high-contrast" type="checkbox">
                </label>
                <label class="accessibility-setting-row accessibility-check-row" for="accessibility-reduce-motion">
                    <span><strong>アニメーションを減らす</strong><small>画面の動きとスクロール演出を抑えます</small></span>
                    <input id="accessibility-reduce-motion" type="checkbox">
                </label>
                <div class="accessibility-settings-footer"><p id="accessibility-settings-status" role="status" aria-live="polite">設定はこのブラウザー内に保存されます。</p><button type="button" class="text-button" id="accessibility-reset">初期設定に戻す</button></div>
            </div>`;
        container.append(panel);
    }

    const fontInput = panel.querySelector("#accessibility-font-scale");
    const fontOutput = panel.querySelector("#accessibility-font-value");
    const contrastInput = panel.querySelector("#accessibility-high-contrast");
    const motionInput = panel.querySelector("#accessibility-reduce-motion");
    const status = panel.querySelector("#accessibility-settings-status");
    const reset = panel.querySelector("#accessibility-reset");

    let preferences = normalizeAccessibilityPreferences(
        parseJSON(safeStorageGet(ACCESSIBILITY_STORAGE_KEY), null)
    );

    const syncControls = () => {
        fontInput.value = String(preferences.fontScale);
        fontOutput.value = `${preferences.fontScale}%`;
        fontOutput.textContent = `${preferences.fontScale}%`;
        contrastInput.checked = preferences.highContrast;
        motionInput.checked = preferences.reduceMotion;
        applyAccessibilityPreferences(preferences);
    };
    const save = () => {
        preferences = normalizeAccessibilityPreferences(preferences);
        safeStorageSet(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences));
        syncControls();
        status.textContent = "見やすさの設定を保存しました。";
    };

    syncControls();
    fontInput.addEventListener("input", () => {
        preferences.fontScale = Number(fontInput.value);
        save();
    });
    contrastInput.addEventListener("change", () => {
        preferences.highContrast = contrastInput.checked;
        save();
    });
    motionInput.addEventListener("change", () => {
        preferences.reduceMotion = motionInput.checked;
        save();
    });
    reset.addEventListener("click", () => {
        preferences = { fontScale: 100, highContrast: false, reduceMotion: false };
        save();
        status.textContent = "見やすさの設定を初期状態に戻しました。";
    });
}
