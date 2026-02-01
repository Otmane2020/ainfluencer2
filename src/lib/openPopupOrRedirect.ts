export function openPopupOrRedirect(url: string, features?: string) {
  // Some browsers block `window.open` in certain conditions.
  // If it's blocked, we fallback to a same-tab navigation.
  const feat = ["noopener", "noreferrer", features].filter(Boolean).join(",");
  const w = window.open(url, "_blank", feat);

  if (!w) {
    window.location.assign(url);
    return { opened: false };
  }

  try {
    w.focus();
  } catch {
    // ignore
  }

  return { opened: true };
}
