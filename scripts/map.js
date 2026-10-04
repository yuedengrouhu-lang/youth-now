let disasterMap = null;
let mapLayers = {};
let mapShelterCache = new Map();

function getMapLocation() {
    const location = regionLocation || weatherLocation || APP_CONFIG.defaultWeather;
    return { latitude: Number(location.latitude), longitude: Number(location.longitude), name: location.name || "設定地域" };
}

function initDisasterMap() {
    const node = document.querySelector("#disaster-map");
    if (!node || !window.L) {
        setText(document.querySelector("#disaster-map-status"), "地図を読み込めませんでした。ネット接続を確認してください。");
        return;
    }
    const location = getMapLocation();
    if (!disasterMap) {
        disasterMap = L.map(node, { scrollWheelZoom: false }).setView([location.latitude, location.longitude], 10);
        L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>'
        }).addTo(disasterMap);
        mapLayers.earthquakes = L.layerGroup().addTo(disasterMap);
        mapLayers.alerts = L.layerGroup().addTo(disasterMap);
        mapLayers.shelters = L.layerGroup().addTo(disasterMap);
        mapLayers.location = L.layerGroup().addTo(disasterMap);
        disasterMap.on("moveend", loadVisibleShelters);
        document.querySelector("#disaster-map-locate")?.addEventListener("click", () => disasterMap.setView([getMapLocation().latitude, getMapLocation().longitude], 11));
        loadVisibleShelters();
    } else {
        disasterMap.invalidateSize();
        disasterMap.setView([location.latitude, location.longitude], Math.max(disasterMap.getZoom(), 9));
    }
    updateDisasterMap();
}

function toggleDisasterMapLayer(name, enabled) {
    if (!disasterMap || !mapLayers[name]) return;
    if (enabled) mapLayers[name].addTo(disasterMap);
    else disasterMap.removeLayer(mapLayers[name]);
}

function updateDisasterMap() {
    if (!disasterMap || !window.L) return;
    const location = getMapLocation();
    mapLayers.earthquakes.clearLayers();
    mapLayers.alerts.clearLayers();
    mapLayers.location.clearLayers();
    L.circleMarker([location.latitude, location.longitude], { radius: 7, color: "#fff", weight: 3, fillColor: "#2777d2", fillOpacity: 1 })
        .bindPopup("<strong>" + escapeHTML(location.name) + "</strong><br>設定した地域")
        .addTo(mapLayers.location);
    const icon = L.divIcon({ className: "map-quake-icon", html: "〰", iconSize: [28, 28], iconAnchor: [14, 14] });
    (disasterData.earthquakes || []).forEach(item => {
        if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) return;
        L.marker([item.latitude, item.longitude], { icon }).bindPopup("<strong>" + escapeHTML(item.title) + "</strong><br>" + escapeHTML([item.area, item.magnitude == null ? "" : "M" + item.magnitude, item.intensity ? "最大震度 " + item.intensity : ""].filter(Boolean).join(" · "))).addTo(mapLayers.earthquakes);
    });
    getActiveDisasterEvents().filter(item => item.local && item.type !== "earthquake").forEach(item => {
        L.circleMarker([location.latitude, location.longitude], { radius: 10, color: "#d13b31", fillColor: "#ff6b5f", fillOpacity: 0.78 })
            .bindPopup("<strong>" + escapeHTML(item.title) + "</strong><br>対象地域の発表 · " + escapeHTML(item.area || location.name))
            .addTo(mapLayers.alerts);
    });
    const local = getActiveDisasterEvents().filter(item => item.local);
    setText(document.querySelector("#disaster-map-status"), location.name + "を中心に表示 · 周辺の発表 " + local.length + "件 · 避難場所データを取得中");
}

function tileFor(lat, lon, zoom) {
    const scale = Math.pow(2, zoom);
    return {
        x: Math.floor((lon + 180) / 360 * scale),
        y: Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * scale)
    };
}

async function loadVisibleShelters() {
    if (!disasterMap || !mapLayers.shelters) return;
    const bounds = disasterMap.getBounds();
    const nw = tileFor(bounds.getNorth(), bounds.getWest(), 10);
    const se = tileFor(bounds.getSouth(), bounds.getEast(), 10);
    const tiles = [];
    for (let x = Math.min(nw.x, se.x); x <= Math.max(nw.x, se.x) && tiles.length < 6; x++) {
        for (let y = Math.min(nw.y, se.y); y <= Math.max(nw.y, se.y) && tiles.length < 6; y++) tiles.push({ x, y });
    }
    const kind = "sih";
    try {
        const dataSets = await Promise.all(tiles.map(async tile => {
            const key = kind + "/" + tile.x + "/" + tile.y;
            if (!mapShelterCache.has(key)) {
                const data = await requestJSON("/api/map/shelters?z=10&x=" + tile.x + "&y=" + tile.y + "&kind=" + kind);
                mapShelterCache.set(key, data);
                if (mapShelterCache.size > 100) mapShelterCache.delete(mapShelterCache.keys().next().value);
            }
            return mapShelterCache.get(key);
        }));
        mapLayers.shelters.clearLayers();
        let count = 0;
        dataSets.forEach(data => (data.features || []).forEach(feature => {
            const coordinates = feature.geometry?.coordinates;
            if (!Array.isArray(coordinates) || coordinates.length < 2) return;
            const lon = Number(coordinates[0]);
            const lat = Number(coordinates[1]);
            if (!bounds.contains([lat, lon])) return;
            const properties = feature.properties || {};
            const marker = L.circleMarker([lat, lon], { radius: 4, color: "#226f65", fillColor: "#38a795", fillOpacity: 0.9 });
            marker.bindPopup("<strong>" + escapeHTML(properties.name || "指定避難場所") + "</strong><br>" + escapeHTML(properties.address || properties.remarks || "詳細は自治体にご確認ください。"));
            marker.addTo(mapLayers.shelters);
            count++;
        }));
        setText(document.querySelector("#disaster-map-status"), getMapLocation().name + "を中心に表示 · 周辺の発表 " + getActiveDisasterEvents().filter(item => item.local).length + "件 · 避難場所 " + count + "か所");
    } catch (error) {
        setText(document.querySelector("#disaster-map-status"), "避難場所データを取得できません。地図と防災情報は表示しています。");
        console.warn("[YOUTH NOW] 避難場所タイル取得失敗", error);
    }
}
