export function isDesktop(): boolean {
  return typeof window !== "undefined" && !/Android/i.test(navigator.userAgent);
}
