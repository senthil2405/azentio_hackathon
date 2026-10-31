/** Only same-origin relative paths are allowed as post-login destinations (open-redirect guard). */
export function safeNext(value: unknown, fallback = "/portal"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}
