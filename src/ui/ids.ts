let localIdCounter = 0;

/**
 * 登録した食材や手入力の食品の ID を作る（DES-UI-14）。
 * 接頭辞＋現在時刻＋連番で、同じミリ秒に続けて作っても重ならない。
 * crypto.randomUUID は HTTPS か localhost でしか使えず、スマートフォンから
 * LAN 経由（http）で開くと失敗するため使わない。
 */
export function localId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${Date.now()}-${localIdCounter}`;
}
