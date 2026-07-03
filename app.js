// コインナビ / Bus Coin Navi — プロトタイプ本体
// 状態管理はシンプルに素のJSで行う(フレームワーク不使用、デモ用)

const state = {
  lang: null,
  currentStopId: null,
  destinationId: null,
  screen: "language", // language | home | scan | destination | fare | driver
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
    case "home":
      screenEl = renderHomeScreen();
      break;
    case "scan":
      screenEl = renderScanScreen();
      break;
    case "manual-select":
      screenEl = renderManualSelectScreen();
      break;
    case "destination":
      screenEl = renderDestinationScreen();
      break;
    case "fare":
      screenEl = renderFareScreen();
      break;
    case "driver":
      screenEl = renderDriverScreen();
      break;
    default:
      screenEl = renderHomeScreen();
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
        state.screen = "home";
        render();
      },
    });
    grid.appendChild(btn);
  });

  return makeScreen([title, hint, grid]);
}

// --- 画面2: ホーム(QRスキャン導線) ---
function renderHomeScreen() {
  const title = h("h1", { text: t("scanQr") });
  const hint = h("div", { className: "hint", text: t("scanQrHint") });

  const qrBox = h("div", { className: "qr-box", text: "▦", onclick: () => {
    state.screen = "scan";
    render();
  }});

  const scanBtn = h("button", {
    className: "primary-btn",
    text: t("scanQr"),
    onclick: () => {
      state.screen = "scan";
      render();
    },
  });

  return makeScreen([title, hint, qrBox, scanBtn]);
}

// --- 画面3: QRコードを実カメラで読み取る ---
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
  const stop = STOPS.find((s) => s.id === m[1]);
  return stop ? stop.id : null;
}

function onStopDetected(stopId) {
  stopScanLoop();
  state.currentStopId = stopId;
  state.screen = "destination";
  render();
}

function renderScanScreen() {
  const title = h("h1", { text: t("scanQr") });
  const video = h("video", { className: "" });
  video.id = "scan-video";
  video.setAttribute("playsinline", "true");
  video.setAttribute("muted", "true");

  const status = h("div", { className: "scan-status", text: "…" });

  const manualToggle = h("button", {
    className: "back-link",
    text: t("simulateScan"),
    onclick: () => {
      stopScanLoop();
      state.screen = "manual-select";
      render();
    },
  });

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    stopScanLoop();
    state.screen = "home";
    render();
  }});

  const screenEl = makeScreen([title, video, status, manualToggle, back]);

  // カメラ起動はDOM挿入後に行う(video要素が実体化してから)
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
    status.textContent = t("scanQrHint");

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
            onStopDetected(stopId);
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

// --- (フォールバック)カメラが使えない場合の手動選択画面 ---
function renderManualSelectScreen() {
  const title = h("h1", { text: t("simulateScan") });
  const list = h("div", { className: "stop-list" });

  STOPS.forEach((stop) => {
    const btn = h("button", {
      className: "stop-btn",
      text: stop.name[state.lang] || stop.name.ja,
      onclick: () => {
        state.currentStopId = stop.id;
        state.screen = "destination";
        render();
      },
    });
    list.appendChild(btn);
  });

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    state.screen = "scan";
    render();
  }});

  return makeScreen([title, list, back]);
}

// --- 画面4: 行き先選択 ---
function renderDestinationScreen() {
  const currentStop = STOPS.find((s) => s.id === state.currentStopId);
  const badge = h("div", {
    className: "current-stop-badge",
    text: `${t("currentStop")}: ${currentStop.name[state.lang] || currentStop.name.ja}`,
  });

  const title = h("h1", { text: t("selectDestination") });
  const list = h("div", { className: "stop-list" });

  STOPS.filter((s) => s.id !== state.currentStopId).forEach((stop) => {
    const btn = h("button", {
      className: "stop-btn",
      text: stop.name[state.lang] || stop.name.ja,
      onclick: () => {
        state.destinationId = stop.id;
        state.screen = "fare";
        render();
      },
    });
    list.appendChild(btn);
  });

  const back = h("button", { className: "back-link", text: "← " + t("back"), onclick: () => {
    state.screen = "scan";
    render();
  }});

  return makeScreen([badge, title, list, back]);
}

// --- 画面5: 運賃・コイン内訳表示 ---
function renderFareScreen() {
  const fare = getFare(state.currentStopId, state.destinationId);
  const title = h("h1", { text: t("fareIs") });
  const amount = h("div", { className: "fare-amount", text: `¥${fare?.toLocaleString() ?? "-"}` });

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
    state.screen = "destination";
    render();
  }});

  return makeScreen([title, amount, coinsTitle, coinList, showBtn, back]);
}

// --- 画面6: 運転手向け提示画面(会話不要で見せるだけ) ---
function renderDriverScreen() {
  const fare = getFare(state.currentStopId, state.destinationId);

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
