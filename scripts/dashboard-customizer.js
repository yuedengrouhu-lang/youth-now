"use strict";

const DASHBOARD_LAYOUT_STORAGE_KEY = "youthNowDashboardLayout";
const DASHBOARD_WIDGET_DEFINITIONS = [
    { id: "top-news", selector: "#top-three", label: "注目ニュース" },
    { id: "trend-weather", selector: ".home-dashboard", label: "話題のキーワードと天気" },
    { id: "safety", selector: "#home-disaster-card", label: "防災情報" },
    { id: "today", selector: "#today-summary", label: "今日のまとめ・交通情報" },
    { id: "quiz", selector: "#quiz", label: "今日のミニクイズ" }
];

let dashboardLayout = { order: [], hidden: [] };
let dashboardEditorOpen = false;

function getDashboardWidgets() {
    const home = document.querySelector("#home-page .container");
    if (!home) return [];

    return DASHBOARD_WIDGET_DEFINITIONS
        .map(definition => {
            const content = home.querySelector(definition.selector);
            const element = content?.closest(".home-section, .home-dashboard");
            if (!element || element.parentElement !== home) return null;
            element.dataset.dashboardWidget = definition.id;
            return { ...definition, element };
        })
        .filter(Boolean);
}

function normalizeDashboardLayout(stored, widgets) {
    const validIds = widgets.map(widget => widget.id);
    const storedOrder = Array.isArray(stored?.order) ? stored.order : [];
    const order = [...new Set(storedOrder.filter(id => validIds.includes(id)))];
    validIds.forEach(id => { if (!order.includes(id)) order.push(id); });
    const hidden = Array.isArray(stored?.hidden)
        ? [...new Set(stored.hidden.filter(id => validIds.includes(id)))]
        : [];
    return { order, hidden };
}

function applyDashboardLayout(widgets = getDashboardWidgets()) {
    const home = document.querySelector("#home-page .container");
    if (!home || !widgets.length) return;

    const byId = new Map(widgets.map(widget => [widget.id, widget]));
    dashboardLayout.order.forEach(id => {
        const widget = byId.get(id);
        if (!widget) return;
        widget.element.hidden = dashboardLayout.hidden.includes(id);
        home.append(widget.element);
    });
}

function saveDashboardLayout() {
    safeStorageSet(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(dashboardLayout));
}

function renderDashboardLayoutList(list, widgets, status) {
    list.replaceChildren();
    dashboardLayout.order.forEach((id, index) => {
        const widget = widgets.find(item => item.id === id);
        if (!widget) return;

        const row = document.createElement("li");
        row.className = "dashboard-layout-item";
        row.draggable = true;
        row.dataset.layoutId = id;

        const grip = document.createElement("span");
        grip.className = "dashboard-layout-grip";
        grip.setAttribute("aria-hidden", "true");
        grip.textContent = "⠿";

        const label = document.createElement("span");
        label.className = "dashboard-layout-label";
        label.textContent = widget.label;

        const moveUp = document.createElement("button");
        moveUp.type = "button";
        moveUp.className = "dashboard-layout-move";
        moveUp.dataset.moveWidget = "up";
        moveUp.dataset.widgetId = id;
        moveUp.textContent = "↑";
        moveUp.setAttribute("aria-label", widget.label + "を上へ移動");
        moveUp.disabled = index === 0;

        const moveDown = document.createElement("button");
        moveDown.type = "button";
        moveDown.className = "dashboard-layout-move";
        moveDown.dataset.moveWidget = "down";
        moveDown.dataset.widgetId = id;
        moveDown.textContent = "↓";
        moveDown.setAttribute("aria-label", widget.label + "を下へ移動");
        moveDown.disabled = index === dashboardLayout.order.length - 1;

        const visibility = document.createElement("label");
        visibility.className = "dashboard-layout-visibility";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !dashboardLayout.hidden.includes(id);
        checkbox.dataset.dashboardVisibility = id;
        checkbox.setAttribute("aria-label", widget.label + "を表示");
        const visibilityText = document.createElement("span");
        visibilityText.textContent = "表示";
        visibility.append(checkbox, visibilityText);

        row.append(grip, label, moveUp, moveDown, visibility);
        list.append(row);
    });

    status.textContent = "カードをドラッグするか、矢印で順番を変更できます。設定はこの端末に保存されます。";
}

function initDashboardCustomizer() {
    const home = document.querySelector("#home-page .container");
    const hero = home?.querySelector(":scope > .hero-section");
    if (!home || !hero || home.querySelector(".dashboard-editor")) return;

    const widgets = getDashboardWidgets();
    if (!widgets.length) return;

    dashboardLayout = normalizeDashboardLayout(
        parseJSON(safeStorageGet(DASHBOARD_LAYOUT_STORAGE_KEY), null),
        widgets
    );

    const editor = document.createElement("section");
    editor.className = "dashboard-editor";
    editor.setAttribute("aria-label", "ホーム画面のカスタマイズ");
    editor.innerHTML = `
        <div class="dashboard-editor-bar">
            <div><span class="section-kicker">YOUR DASHBOARD</span><p>ホーム画面を使いやすく整えられます。</p></div>
            <button type="button" class="secondary-button dashboard-edit-toggle" aria-expanded="false">ホームを編集</button>
        </div>
        <div class="dashboard-editor-panel" hidden>
            <div class="dashboard-editor-heading"><strong>カードの表示と順番</strong><button type="button" class="text-button" data-dashboard-reset>初期状態に戻す</button></div>
            <ol class="dashboard-layout-list" aria-label="ホームカードの順番"></ol>
            <p class="dashboard-editor-status" role="status" aria-live="polite"></p>
            <button type="button" class="primary-button dashboard-edit-done">完了</button>
        </div>`;
    hero.insertAdjacentElement("afterend", editor);

    const toggle = editor.querySelector(".dashboard-edit-toggle");
    const panel = editor.querySelector(".dashboard-editor-panel");
    const list = editor.querySelector(".dashboard-layout-list");
    const status = editor.querySelector(".dashboard-editor-status");

    const refresh = () => {
        applyDashboardLayout(widgets);
        renderDashboardLayoutList(list, widgets, status);
    };
    const commit = message => {
        dashboardLayout.order = Array.from(list.querySelectorAll("[data-layout-id]"), row => row.dataset.layoutId);
        applyDashboardLayout(widgets);
        saveDashboardLayout();
        renderDashboardLayoutList(list, widgets, status);
        if (message) status.textContent = message;
    };

    refresh();
    toggle.addEventListener("click", () => {
        dashboardEditorOpen = !dashboardEditorOpen;
        panel.hidden = !dashboardEditorOpen;
        toggle.setAttribute("aria-expanded", String(dashboardEditorOpen));
        toggle.textContent = dashboardEditorOpen ? "編集を閉じる" : "ホームを編集";
        document.body.classList.toggle("dashboard-editing", dashboardEditorOpen);
    });

    editor.querySelector(".dashboard-edit-done").addEventListener("click", () => {
        dashboardEditorOpen = false;
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "ホームを編集";
        document.body.classList.remove("dashboard-editing");
        toggle.focus();
    });

    editor.addEventListener("change", event => {
        const checkbox = event.target.closest("[data-dashboard-visibility]");
        if (!checkbox) return;
        const id = checkbox.dataset.dashboardVisibility;
        dashboardLayout.hidden = checkbox.checked
            ? dashboardLayout.hidden.filter(item => item !== id)
            : [...new Set([...dashboardLayout.hidden, id])];
        applyDashboardLayout(widgets);
        saveDashboardLayout();
        status.textContent = checkbox.checked ? "カードを表示しました。" : "カードを非表示にしました。";
    });

    editor.addEventListener("click", event => {
        if (event.target.closest("[data-dashboard-reset]")) {
            dashboardLayout = { order: widgets.map(widget => widget.id), hidden: [] };
            applyDashboardLayout(widgets);
            saveDashboardLayout();
            renderDashboardLayoutList(list, widgets, status);
            status.textContent = "ホーム画面を初期状態に戻しました。";
            return;
        }

        const move = event.target.closest("[data-move-widget]");
        if (!move) return;
        const oldIndex = dashboardLayout.order.indexOf(move.dataset.widgetId);
        const newIndex = oldIndex + (move.dataset.moveWidget === "up" ? -1 : 1);
        if (oldIndex < 0 || newIndex < 0 || newIndex >= dashboardLayout.order.length) return;
        [dashboardLayout.order[oldIndex], dashboardLayout.order[newIndex]] = [dashboardLayout.order[newIndex], dashboardLayout.order[oldIndex]];
        applyDashboardLayout(widgets);
        saveDashboardLayout();
        renderDashboardLayoutList(list, widgets, status);
        list.querySelector(`[data-widget-id="${move.dataset.widgetId}"][data-move-widget="${move.dataset.moveWidget}"]`)?.focus();
        status.textContent = "カードの順番を保存しました。";
    });

    let draggedRow = null;
    list.addEventListener("dragstart", event => {
        draggedRow = event.target.closest(".dashboard-layout-item");
        if (!draggedRow) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedRow.dataset.layoutId);
        draggedRow.classList.add("is-dragging");
    });
    list.addEventListener("dragover", event => {
        const target = event.target.closest(".dashboard-layout-item");
        if (!draggedRow || !target || target === draggedRow) return;
        event.preventDefault();
        const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
        list.insertBefore(draggedRow, after ? target.nextSibling : target);
    });
    list.addEventListener("dragend", () => {
        if (!draggedRow) return;
        draggedRow.classList.remove("is-dragging");
        draggedRow = null;
        commit("カードの順番を保存しました。");
    });
}
