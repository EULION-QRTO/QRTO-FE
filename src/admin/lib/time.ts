/** epoch ms 를 HH:MM 로 */
export const clock = (ms: number): string =>
  new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

/** 경과 분 */
export const elapsedMin = (since: number, ref: number): number =>
  Math.max(0, Math.floor((ref - since) / 60000));

/** "N분 전" / "방금" */
export const agoLabel = (since: number, ref: number): string => {
  const m = elapsedMin(since, ref);
  if (m < 1) return "방금";
  return `${m}분 전`;
};

/** 픽업까지 남은 시간 라벨 */
export const untilLabel = (target: number, ref: number): string => {
  const m = Math.round((target - ref) / 60000);
  if (m <= 0) return "픽업 시간 임박";
  return `${m}분 후 픽업`;
};
