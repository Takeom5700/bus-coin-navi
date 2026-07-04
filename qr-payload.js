// QRコードのペイロード形式(運転手側の表示・乗客側の読み取り両方で共通利用)
//
// 形式: COINNAVI:STOP:<id>|<lat>|<lng>|<encodeURIComponent(nameJa)>|<encodeURIComponent(nameEn)>
//
// IDだけでなく緯度経度・名前そのものをQRに埋め込むことで、
// 読み取る端末側が事前にその停留所を知らなくても(オンライン同期やlocalStorage共有なしに)
// スキャンした瞬間に停留所情報を復元できるようにしている。

function buildStopQrPayload(stop) {
  const nameJa = encodeURIComponent(stop.name.ja);
  const nameEn = encodeURIComponent(stop.name.en || stop.name.ja);
  return `COINNAVI:STOP:${stop.id}|${stop.lat}|${stop.lng}|${nameJa}|${nameEn}`;
}

// 戻り値: { id, lat, lng, nameJa, nameEn } または 旧形式(IDのみ)の場合は { id }、不正な場合は null
function parseStopQrPayload(text) {
  const m = /^COINNAVI:STOP:(.+)$/.exec(text.trim());
  if (!m) return null;

  const body = m[1];
  const parts = body.split("|");

  if (parts.length === 1) {
    // 旧形式(IDのみ)との互換性のために残す
    return { id: parts[0] };
  }

  const [id, lat, lng, nameJaEnc, nameEnEnc] = parts;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;

  let nameJa, nameEn;
  try {
    nameJa = decodeURIComponent(nameJaEnc || "");
    nameEn = decodeURIComponent(nameEnEnc || nameJaEnc || "");
  } catch (e) {
    nameJa = nameJaEnc || "";
    nameEn = nameEnEnc || nameJaEnc || "";
  }

  return { id, lat: latNum, lng: lngNum, nameJa, nameEn };
}
