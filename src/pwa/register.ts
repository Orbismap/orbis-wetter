/** Registriert den Service Worker – nur im Produktionsbau, damit dev/hot reload sauber bleiben. */

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  // BASE_URL ist root-relativ (z. B. "/wetter/"), daher kein new URL() als Basis.
  const url = `${import.meta.env.BASE_URL}sw.js`;
  const start = () => {
    navigator.serviceWorker.register(url).catch((error: unknown) => {
      console.warn('[pwa] Service Worker konnte nicht registriert werden:', error);
    });
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
