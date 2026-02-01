export function openPopupOrRedirect(url: string, features?: string) {
  // Some browsers block `window.open` in certain conditions.
  // If it's blocked, we fallback to a same-tab navigation.
  const feat = ["noopener", "noreferrer", features].filter(Boolean).join(",");
  const w = window.open(url, "_blank", feat);

  if (!w) {
    // If we're running inside an iframe (like the preview), redirect the top window when possible.
    try {
      if (window.top && window.top !== window) {
        window.top.location.assign(url);
        return { opened: false };
      }
    } catch {
      // ignore and fallback below
    }

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
