// テスト用: 実際にその場に行ってGPSで停留所を登録できる仕組み
// 本番のAPIキー取得(developer.odpt.orgでの開発者登録、承認まで最大2営業日)を
// 待たずに、自宅周辺の実在するバス停で今すぐ動作確認するためのもの。
//
// ブラウザのlocalStorageに保存するため、同じ端末・同じブラウザ内でのみ有効。
// (乗客用アプリと運転手用ツールを同じ端末の別タブで開けば、両方から同じ
//  登録済み停留所を参照できる)

const CUSTOM_STOPS_KEY = "buscoinnavi_custom_stops";

function getCustomStops() {
  try {
    const raw = localStorage.getItem(CUSTOM_STOPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addCustomStop({ id, nameJa, nameEn, lat, lng }) {
  const list = getCustomStops();
  list.push({
    id,
    name: { ja: nameJa, en: nameEn || nameJa },
    lat,
    lng,
    custom: true,
  });
  localStorage.setItem(CUSTOM_STOPS_KEY, JSON.stringify(list));
}

function removeCustomStop(id) {
  const list = getCustomStops().filter((s) => s.id !== id);
  localStorage.setItem(CUSTOM_STOPS_KEY, JSON.stringify(list));
}

// 組み込みの停留所(STOPS) + 登録済みのカスタム停留所 をまとめて返す
function getAllStops() {
  return STOPS.concat(getCustomStops());
}

// FARE_TABLEに存在しない区間(カスタム停留所など)向けの概算運賃
// 実運用ではODPTの実運賃データに置き換わるため、あくまで暫定の概算
function estimateFare(distMeters) {
  const km = distMeters / 1000;
  if (km <= 1) return 220;
  const extraKm = km - 1;
  return 220 + Math.ceil((extraKm * 30) / 10) * 10;
}

// 運賃を返す。FARE_TABLEにあればそれを、無ければ2停留所間の距離から概算する
function getFareOrEstimate(fromId, toId) {
  const known = getFare(fromId, toId);
  if (known != null) return { fare: known, estimated: false };

  const all = getAllStops();
  const from = all.find((s) => s.id === fromId);
  const to = all.find((s) => s.id === toId);
  if (!from || !to) return { fare: null, estimated: false };

  const dist = distanceMeters(from.lat, from.lng, to.lat, to.lng);
  return { fare: estimateFare(dist), estimated: true };
}
