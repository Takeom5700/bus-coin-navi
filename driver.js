// 運転手用テストツール: 選んだ停留所のQRコードを表示する
// QRの中身は "COINNAVI:STOP:<stopId>" 形式(app.jsのparseStopQrと対応)
// 外国人ドライバーの増加を想定し、日本語/英語を切り替えられるようにしている

const DRIVER_I18N = {
  ja: {
    title: "🚌 【テスト用】運転手側 QR表示",
    desc: "本番では運転席付近に掲示するQRコードです。<br>このQRコードをスマホのBus Coin Naviでスキャンしてテストできます。",
    note: "同じネットワーク内の別端末から、この画面をスマホのブラウザで表示してスキャンするか、PC画面を別のスマホのカメラで直接映して読み取ってください。",
  },
  en: {
    title: "🚌 [Test Tool] Driver-side QR Display",
    desc: "In production, this QR code would be posted near the driver's seat.<br>Scan it with Bus Coin Navi on a smartphone to test.",
    note: "Open this screen on another device on the same network via a smartphone browser and scan it, or simply point another phone's camera at this PC screen.",
  },
};

let driverLang = "ja";

const select = document.getElementById("stopSelect");
const qrWrap = document.getElementById("qrWrap");
const langJaBtn = document.getElementById("langJa");
const langEnBtn = document.getElementById("langEn");
const titleText = document.getElementById("titleText");
const descText = document.getElementById("descText");
const noteText = document.getElementById("noteText");

function populateStops() {
  select.innerHTML = "";
  STOPS.forEach((stop) => {
    const opt = document.createElement("option");
    opt.value = stop.id;
    const label = stop.name[driverLang] || stop.name.ja;
    opt.textContent = `${label} (${stop.id})`;
    select.appendChild(opt);
  });
}

function applyDriverLang(lang) {
  driverLang = lang;
  const dict = DRIVER_I18N[lang];
  titleText.textContent = dict.title;
  descText.innerHTML = dict.desc;
  noteText.textContent = dict.note;
  langJaBtn.classList.toggle("active", lang === "ja");
  langEnBtn.classList.toggle("active", lang === "en");
  document.documentElement.lang = lang;

  const prevValue = select.value;
  populateStops();
  if (prevValue) select.value = prevValue;
}

function drawQr(stopId) {
  qrWrap.innerHTML = "";
  const payload = `COINNAVI:STOP:${stopId}`;
  const qr = qrcode(0, "M"); // type 0 = auto, error correction level M
  qr.addData(payload);
  qr.make();
  qrWrap.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 4 });
}

langJaBtn.addEventListener("click", () => applyDriverLang("ja"));
langEnBtn.addEventListener("click", () => applyDriverLang("en"));
select.addEventListener("change", () => drawQr(select.value));

applyDriverLang("ja");
drawQr(STOPS[0].id);
