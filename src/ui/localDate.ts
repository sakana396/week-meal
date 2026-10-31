/** 現地の日付を UI で作る（DES-SHP-01）。 */
export function localDate(): string {
  const now = new Date();
  return `${now.getFullYear().toString().padStart(4, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
}
