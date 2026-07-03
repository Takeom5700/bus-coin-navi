// 日本の硬貨・紙幣を模したSVGイラスト
// ※実物の券面デザイン(肖像・模様)の複製ではなく、
//   色・大きさ・穴の有無など「識別に必要な特徴」だけを再現した簡易イラストです。

function coinSVG(value) {
  const specs = {
    1:    { type: "coin", size: 44, fill: "#e7e9ea", stroke: "#c3c7c9", hole: false, label: "1" },
    5:    { type: "coin", size: 46, fill: "#c9a24b", stroke: "#a9843a", hole: true,  label: "5" },
    10:   { type: "coin", size: 48, fill: "#b97a4e", stroke: "#8f5c39", hole: false, label: "10" },
    50:   { type: "coin", size: 50, fill: "#d7dadc", stroke: "#aeb3b6", hole: true,  label: "50" },
    100:  { type: "coin", size: 52, fill: "#d3d6d8", stroke: "#a9adaf", hole: false, label: "100" },
    500:  { type: "coin", size: 58, fill: "#c8a24e", stroke: "#9c7c37", hole: false, label: "500" },
    1000: { type: "bill", w: 100, h: 46, fill: "#8fbf9f", stroke: "#5f9a74", label: "1000" },
  };
  const s = specs[value];
  if (!s) return "";

  if (s.type === "bill") {
    return `
      <svg viewBox="0 0 ${s.w} ${s.h}" width="${s.w}" height="${s.h}" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="${s.w - 2}" height="${s.h - 2}" rx="4"
              fill="${s.fill}" stroke="${s.stroke}" stroke-width="2"/>
        <rect x="7" y="7" width="${s.w - 14}" height="${s.h - 14}" rx="2"
              fill="none" stroke="${s.stroke}" stroke-width="1" stroke-dasharray="3,2"/>
        <circle cx="${s.w - 22}" cy="${s.h / 2}" r="10" fill="none" stroke="${s.stroke}" stroke-width="1.5"/>
        <text x="14" y="${s.h / 2 + 5}" font-size="11" font-weight="bold" fill="#2c4a37">¥${s.label}</text>
      </svg>`;
  }

  const r = s.size / 2;
  const holeR = s.hole ? r * 0.28 : 0;
  return `
    <svg viewBox="0 0 ${s.size} ${s.size}" width="${s.size}" height="${s.size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2"/>
      <circle cx="${r}" cy="${r}" r="${r - 5}" fill="none" stroke="${s.stroke}" stroke-width="0.8" opacity="0.6"/>
      ${s.hole ? `<circle cx="${r}" cy="${r}" r="${holeR}" fill="#ffffff" stroke="${s.stroke}" stroke-width="1.5"/>` : ""}
      <text x="${r}" y="${s.hole ? r - holeR - 4 : r + 4}" text-anchor="middle"
            font-size="${s.size * 0.22}" font-weight="bold" fill="#3a3a3a">${s.label}</text>
    </svg>`;
}
