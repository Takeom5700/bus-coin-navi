// 乗車停留所の自動判定ロジック
//
// 考え方:
//  1. 「まだバスの走行速度に達していない」かつ「既知の停留所に近い」間は
//     ずっと「今そこにいる」候補として更新し続ける
//     (完全に静止していなくてもよい。駆け込み乗車のように走って
//      バス停に到着し、そのまま即発車するケースも拾うため)
//  2. 速度がバスの走行速度まで上がったことが連続して確認できたら、
//     直前の"候補だった停留所"を乗車停留所として確定・固定する
//  3. GPSはこの瞬間に監視を止めるので、以後どの停留所の座標を
//     通過しても上書きされない
//
// navigator.geolocationに直接依存しない純粋なロジックにして、
// Node上でも合成データでテストできるようにしてある。

const BOARD_MOVING_SPEED_MS = 4.0;     // 約14.4km/h以上は「バス走行中」とみなす
const BOARD_STOP_RADIUS_M = 120;       // 停留所とみなす半径(m)
const BOARD_MOVING_CONFIRM_COUNT = 3;  // 走行速度が連続何回続いたら確定するか

function createBoardingDetector(stops) {
  let lastPos = null; // { lat, lng, t }
  let lastStationaryStopId = null;
  let movingStreak = 0;
  let locked = false;

  function reset() {
    lastPos = null;
    lastStationaryStopId = null;
    movingStreak = 0;
    locked = false;
  }

  // sample: { lat, lng, t(ms), speed(m/s, optional) }
  // 戻り値: { status: "waiting"|"locked"|"no-candidate", stopId, nearestStopId, speedMs }
  function feed(sample) {
    if (locked) return { status: "locked", stopId: lastStationaryStopId };

    let speedMs = typeof sample.speed === "number" ? sample.speed : null;
    if (speedMs == null && lastPos) {
      const dist = distanceMeters(lastPos.lat, lastPos.lng, sample.lat, sample.lng);
      const dt = (sample.t - lastPos.t) / 1000;
      speedMs = dt > 0 ? dist / dt : 0;
    }
    lastPos = { lat: sample.lat, lng: sample.lng, t: sample.t };

    if (speedMs == null) {
      return { status: "waiting", stopId: lastStationaryStopId, speedMs: null };
    }

    const { stop, distanceMeters: dist } = findNearestStop(sample.lat, sample.lng, stops);

    // 走行速度未満(徒歩〜駆け足程度も含む)で、かつ停留所の近くにいる間は候補を更新し続ける
    if (speedMs < BOARD_MOVING_SPEED_MS && dist < BOARD_STOP_RADIUS_M) {
      lastStationaryStopId = stop.id;
      movingStreak = 0;
      return { status: "waiting", stopId: lastStationaryStopId, nearestStopId: stop.id, speedMs };
    }

    if (speedMs > BOARD_MOVING_SPEED_MS) {
      movingStreak++;
      if (movingStreak >= BOARD_MOVING_CONFIRM_COUNT) {
        if (lastStationaryStopId) {
          locked = true;
          return { status: "locked", stopId: lastStationaryStopId, speedMs };
        }
        return { status: "no-candidate", stopId: null, speedMs };
      }
      return { status: "waiting", stopId: lastStationaryStopId, speedMs };
    }

    movingStreak = 0;
    return { status: "waiting", stopId: lastStationaryStopId, speedMs };
  }

  return { feed, reset };
}
