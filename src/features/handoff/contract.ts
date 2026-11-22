/**
 * Contract between Orbis Wetter and orbis-karten. The other side mirrors these two literals;
 * see docs/HANDOFF.md. Keep them in sync with the map repo.
 */

/** Both documents must use this exact view-transition-name on their map surface. */
export const WX_MAP_VT = 'wx-map';

/** sessionStorage key the map app reads to offer "Zurück zur Wetter-App". */
export const RETURN_KEY = 'orbis.wetter.returnTo';

/** Called by the fullscreen link before the browser navigates to the map. */
export function rememberReturnTo(): void {
  try {
    sessionStorage.setItem(RETURN_KEY, `${location.pathname}${location.search}${location.hash}`);
  } catch {
    /* storage disabled: the handoff still works, only the back chip is missing */
  }
}
