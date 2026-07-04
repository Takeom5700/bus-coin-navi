// 日本の硬貨・紙幣のイラスト画像
// 「いらすとや」(irasutoya.com)の無料素材を使用。
// 財務省の見解では、通貨の画像を"画面表示のみ"で使う分には
// 通貨及証券模造取締法の取締り対象にはならないとされている
// (印刷を伴う場合は別途注意が必要)。実物写真の複製ではなく、
// 商用利用も許諾された素材のため、法的リスクを避けつつリアルな見た目にできる。

const COIN_IMAGES = {
  1: "images/coins/1.png",
  5: "images/coins/5.png",
  10: "images/coins/10.png",
  50: "images/coins/50.png",
  100: "images/coins/100.png",
  500: "images/coins/500.png",
  1000: "images/coins/1000.png",
};

function coinSVG(value) {
  const src = COIN_IMAGES[value];
  if (!src) return "";
  const isBill = value === 1000;
  const cls = isBill ? "coin-img coin-img-bill" : "coin-img";
  return `<img class="${cls}" src="${src}" alt="¥${value}" />`;
}
