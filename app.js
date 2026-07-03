// コインナビ / Bus Coin Navi — プロトタイプ本体
// 乗車停留所: GPSで自動判定 / 降車停留所: 運転手が提示するQRを読み取る
// 状態管理はシンプルに素のJSで行う(フレームワーク不使用、デモ用)

const state = {
  lang: null,
  currentStopId: null, // 乗車停留所(自動判定)
  destinationId: null, // 降車停留所(QRスキャンで確定)
  screen: "language",
  // language | boarding-detect | manual-board | riding | scan-dest | manual-dest | fare | driver
};

const root = document.getElementById("app");

function t(key) {
  const dict = I18N[state.lang] || I18N.ja;
  return dict[key] ?? key;
}

function render() {
  document.documentElement.dir = state.lang ? I18N[state.lang].dir : "ltr";
  root.innerHTML = "";

  if (state.screen !== "language") {
    root.appendChild(renderTopBar());
  }

  let screenEl;
  switch (state.screen) {
    case "language":
      screenEl = renderLanguageScreen();
      break;
    case "boarding-detect":
      screenEl = renderBoardingDetectScreen();
      break;
    case "manual-board":
      screenEl = renderManualStopScreen("board");
      break;
    case "add-stop":
      screenEl = renderAddStopScreen();
      break;
    case "riding":
      screenEl = renderRidingScreen();
      break;
    case "scan-dest":
      screenEl = renderScanDestScreen();
      break;
    case "manual-dest":
      screenEl = renderManualStopScreen("dest");
      break;
    case "fare":
      screenEl = renderFareScreen();
      break;
    case "driver":
      screenEl = renderDriverScreen();
      break;
    default:
      screenEl = renderBoardingDetectScreen();
  }
  root.appendChild(screenEl);
}

function renderTopBar() {
  const bar = document.createElement("div");
  bar.className = "top-bar";

  const brand = document.createElement("div");
  brand.className = "brand";
  brand.textContent = "🪙 Bus Coin Navi";
  bar.appendChild(brand);

  const btn = document.createElement("button");
  btn.textContent = I18N[state.lang].langName;
  btn.onclick = () => {
    state.screen = "language";
    render();
  };
  bar.appendChild(btn);

  return bar;
}

function makeScreen(children) {
  const div = document.createElement("div");
  div.className = "screen";
  children.forEach((c) => c && div.appendChild(c));
  return div;
}

function h(tag, opts = {}, children = []) {
  const el = document.createElement(tag);
  if (opts.className) el.className = opts.className;
  if (opts.text) el.textContent = opts.text;
  if (opts.onclick) el.onclick = opts.onclick;
  children.forEach((c) => c && el.appendChild(c));
  return el;
}

function stopLabel(stop) {
  return stop ? (stop.name[state.lang] || stop.name.ja) : "?";
}

// --- 画面1: 言語選択 ---
function renderLanguageScreen() {
  const title = h("h1", { text: "🪙 Bus Coin Navi" });
  const hint = h("div", { className: "hint", text: "Please select your language / 言語を選んでください" });

  const grid = h("div", { className: "lang-grid" });
  LANGUAGES.forEach((code) => {
    const btn = h("button", {
      className: "lang-btn",
      text: I18N[code].langName,
      onclick: () => {
        state.lang = code;
        state.screen = "boarding-detect";
        render();
      },
    });
    grid.appendChild(btn);
  });

  return makeScreen([title, hint, grid]);
}

// --- 画面2: 乗車停留所をGPSで自動判定 ---
// 「停留所付近で静止→バスの走行速度まで加速」を検知し、
// 直前に静止していた停留所を乗車地点として確定する(boarding-detector.js)
let boardWatchId = null;
let boardDetector = null;

function stopBoardingWatch() {
  if (boardWatchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(boardWatchId);
  }
  boardWatchId = null;
  boardDetector = null;
}

function renderBoardingDetectScreen() {
  const title = h("h1", { text: t("detecting") });
  const status = h("div", { className: "scan-status", text: "📍" });

  const manualLink = h("button", {
    className: "back-link",
    text: t("wrongStop"),
    onclick: () => {
      stopBoardingWatch();
      state.screen = "manual-board";
      render();
    },
  });

  const addStopLink = h("button", {
    className: "back-link",
    text: t("addStopLink"),
    onclick: () => {
      stopBoardingWatch();
      state.screen = "add-stop";
      render();
    },
  });

  const screenEl = makeScreen([title, status, manualLink, addStopLink]);
  setTimeout(() => startBoardingWatch(status), 0);
  return screenEl;
}

// --- (テスト用)現在地をバス停として登録する画面 ---
function renderAddStopScreen() {
  const title = h("h1", { text: t("addStopTitle") });
  const status = h("div", { className: "scan-status", text: "📍" });

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = t("addStopNamePrompt");
  nameInput.className = "text-input";

  let currentPos = null;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      status.textContent = `📍 ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`;
    },
    () => {
      status.textContent = t("locationDenied");
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );

  const saveBtn = h("button", {
    className: "primary-btn",
    text: t("addStopSave"),
    onclick: () => {
      if (!currentPos || !nameInput.value.trim()) return;
      addCustomStop({
        id: "custom-" + Date.now(),
        nameJa: nameInput.value.trim(),
        nameEn: nameInput.value.trim(),
        lat: currentPos.lat,
        lng: currentPos.lng,
      });
      status.textContent = "✅ " + t("addStopSaved");
      nameInput.value = "";
    },
  });

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    state.screen = "boarding-detect";
    render();
  }});

  return makeScreen([title, status, nameInput, saveBtn, back]);
}

function startBoardingWatch(status) {
  if (!navigator.geolocation) {
    status.textContent = t("locationDenied");
    return;
  }
  boardDetector = createBoardingDetector(getAllStops());

  boardWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const result = boardDetector.feed({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        t: pos.timestamp,
        speed: pos.coords.speed,
      });

      if (result.status === "locked") {
        stopBoardingWatch();
        state.currentStopId = result.stopId;
        state.screen = "riding";
        render();
        return;
      }

      if (result.status === "no-candidate") {
        stopBoardingWatch();
        state.screen = "manual-board";
        render();
        return;
      }

      if (result.stopId) {
        const stop = getAllStops().find((s) => s.id === result.stopId);
        status.textContent = `${t("waitingNear")} ${stopLabel(stop)}`;
      }
    },
    () => {
      status.textContent = t("locationDenied");
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
  );
}

// --- 画面3: 乗車中(降りる時にQRスキャンへ進む導線) ---
function renderRidingScreen() {
  const boardStop = getAllStops().find((s) => s.id === state.currentStopId);
  const badge = h("div", {
    className: "current-stop-badge",
    text: `${t("boardedAt")}: ${stopLabel(boardStop)}`,
  });

  const title = h("h1", { text: t("ridingTitle") });
  const hint = h("div", { className: "hint", text: t("ridingHint") });

  const getOffBtn = h("button", {
    className: "primary-btn",
    text: t("getOffButton"),
    onclick: () => {
      state.screen = "scan-dest";
      render();
    },
  });

  const wrongLink = h("button", {
    className: "back-link",
    text: t("wrongStop"),
    onclick: () => {
      state.screen = "manual-board";
      render();
    },
  });

  return makeScreen([badge, title, hint, getOffBtn, wrongLink]);
}

// --- 画面4: 降車停留所をQRカメラで読み取る ---
let scanStream = null;
let scanRafId = null;

function stopScanLoop() {
  if (scanRafId) cancelAnimationFrame(scanRafId);
  scanRafId = null;
  if (scanStream) {
    scanStream.getTracks().forEach((tr) => tr.stop());
    scanStream = null;
  }
}

// QRコードの中身のフォーマット: "COINNAVI:STOP:<stopId>"
function parseStopQr(text) {
  const m = /^COINNAVI:STOP:(.+)$/.exec(text.trim());
  if (!m) return null;
  const stop = getAllStops().find((s) => s.id === m[1]);
  return stop ? stop.id : null;
}

function onDestinationDetected(stopId) {
  stopScanLoop();
  state.destinationId = stopId;
  state.screen = "fare";
  render();
}

function renderScanDestScreen() {
  const title = h("h1", { text: t("scanQr") });
  const video = h("video", {});
  video.id = "scan-video";
  video.setAttribute("playsinline", "true");
  video.setAttribute("muted", "true");

  const status = h("div", { className: "scan-status", text: "…" });

  const manualToggle = h("button", {
    className: "back-link",
    text: t("simulateScan"),
    onclick: () => {
      stopScanLoop();
      state.screen = "manual-dest";
      render();
    },
  });

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    stopScanLoop();
    state.screen = "riding";
    render();
  }});

  const screenEl = makeScreen([title, video, status, manualToggle, back]);
  setTimeout(() => startCameraScan(video, status), 0);
  return screenEl;
}

async function startCameraScan(video, status) {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = scanStream;
    await video.play();
    status.textContent = t("scanDestHint");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const tick = () => {
      if (!scanStream) return; // 画面遷移等で停止済み
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const stopId = parseStopQr(code.data);
          if (stopId) {
            onDestinationDetected(stopId);
            return;
          } else {
            status.textContent = "⚠ " + code.data;
          }
        }
      }
      scanRafId = requestAnimationFrame(tick);
    };
    scanRafId = requestAnimationFrame(tick);
  } catch (err) {
    status.textContent = "📵 " + (err.message || err);
  }
}

// --- (共通)手動選択画面: purpose="board" or "dest" ---
// タブで「停留所名で選ぶ」「整理券番号で選ぶ」を切り替えられる。
// 整理券番号方式は、乗ってから/降りる直前にアプリに気づいた人でも、
// GPS履歴を遡ることなく(プライバシーに配慮しつつ)乗車地点を特定できるようにするため。
let manualTab = "name"; // "name" | "seiriken"

function confirmStopSelection(purpose, stopId) {
  if (purpose === "board") {
    state.currentStopId = stopId;
    state.screen = "riding";
  } else {
    state.destinationId = stopId;
    state.screen = "fare";
  }
  render();
}

function renderManualStopScreen(purpose) {
  const title = h("h1", { text: t("simulateScan") });

  const tabs = h("div", { className: "tab-row" });
  const nameTabBtn = h("button", {
    className: "tab-btn" + (manualTab === "name" ? " active" : ""),
    text: t("stopNameTab"),
    onclick: () => { manualTab = "name"; render(); },
  });
  const seirikenTabBtn = h("button", {
    className: "tab-btn" + (manualTab === "seiriken" ? " active" : ""),
    text: t("seirikenTab"),
    onclick: () => { manualTab = "seiriken"; render(); },
  });
  tabs.appendChild(nameTabBtn);
  tabs.appendChild(seirikenTabBtn);

  const excludeId = purpose === "dest" ? state.currentStopId : null;
  let contentEl;

  if (manualTab === "seiriken") {
    const prompt = h("div", { className: "hint", text: t("seirikenPrompt") });
    const grid = h("div", { className: "seiriken-grid" });
    SEIRIKEN_ROUTE_ORDER.forEach((stopId, idx) => {
      if (stopId === excludeId) return;
      const num = idx + 1;
      const btn = h("button", {
        className: "seiriken-btn",
        onclick: () => confirmStopSelection(purpose, stopId),
      });
      const numEl = h("div", { className: "seiriken-num", text: String(num) });
      const nameEl = h("div", { className: "seiriken-name", text: stopLabel(STOPS.find((s) => s.id === stopId)) });
      btn.appendChild(numEl);
      btn.appendChild(nameEl);
      grid.appendChild(btn);
    });
    contentEl = h("div", { className: "manual-tab-content" }, [prompt, grid]);
  } else {
    const list = h("div", { className: "stop-list" });
    getAllStops().filter((s) => s.id !== excludeId).forEach((stop) => {
      const btn = h("button", {
        className: "stop-btn",
        text: stopLabel(stop) + (stop.custom ? " 📍" : ""),
        onclick: () => confirmStopSelection(purpose, stop.id),
      });
      list.appendChild(btn);
    });
    contentEl = h("div", { className: "manual-tab-content" }, [list]);
  }

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    state.screen = purpose === "board" ? "boarding-detect" : "scan-dest";
    render();
  }});

  return makeScreen([title, tabs, contentEl, back]);
}

// --- 画面5: 運賃・コイン内訳表示 ---
function renderFareScreen() {
  const { fare, estimated } = getFareOrEstimate(state.currentStopId, state.destinationId);
  const title = h("h1", { text: t("fareIs") });
  const amount = h("div", { className: "fare-amount", text: `¥${fare?.toLocaleString() ?? "-"}` });
  const estimatedNote = estimated
    ? h("div", { className: "hint", text: t("estimatedFareNote") })
    : null;

  const coinsTitle = h("div", { className: "hint", text: t("coinsNeeded") });
  const coinList = h("div", { className: "coin-list" });

  if (fare != null) {
    const breakdown = breakdownToCoins(fare);
    breakdown.forEach(({ value, count }) => {
      const row = h("div", { className: "coin-row" });
      const icon = h("div", { className: "coin-icon-wrap" });
      icon.innerHTML = coinSVG(value);
      const label = h("div", { text: t(`unit_${value}`) });
      const count_el = h("div", { className: "coin-count", text: `× ${count}` });
      row.appendChild(icon);
      row.appendChild(label);
      row.appendChild(count_el);
      coinList.appendChild(row);
    });
  }

  const showBtn = h("button", {
    className: "primary-btn",
    text: t("showToDriver"),
    onclick: () => {
      state.screen = "driver";
      render();
    },
  });

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    state.screen = "scan-dest";
    render();
  }});

  return makeScreen([title, amount, estimatedNote, coinsTitle, coinList, showBtn, back]);
}

// --- 画面6: 運転手向け提示画面(会話不要で見せるだけ) ---
function renderDriverScreen() {
  const { fare } = getFareOrEstimate(state.currentStopId, state.destinationId);

  const box = h("div", { className: "driver-screen" });
  const title = h("div", { text: I18N.ja.driverScreenTitle, className: "hint" });
  title.style.color = "#e0f2ef";
  const amount = h("div", { className: "amount", text: `¥${fare?.toLocaleString() ?? "-"}` });
  box.appendChild(title);
  box.appendChild(amount);

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    state.screen = "fare";
    render();
  }});

  return makeScreen([box, back]);
}

render();
