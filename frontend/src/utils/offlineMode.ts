const MODE_KEY = 'wordquest_force_offline';
const MODE_CACHE = 'wordquest-mode';
const MODE_URL = '/__wordquest_offline_mode__';
const PENDING_KEY = 'wordquest_pending_offline_switch';
const SWITCH_ERROR_KEY = 'wordquest_offline_switch_error';

export const isForcedOffline = (): boolean => localStorage.getItem(MODE_KEY) === 'true';

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

async function supportsOfflineMode(worker: ServiceWorker | null): Promise<boolean> {
  if (!worker) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, 2500);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(event.data === 'ready');
    };
    try {
      worker.postMessage('WORDQUEST_OFFLINE_CAPABILITY', [channel.port2]);
    } catch {
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(false);
    }
  });
}

async function currentPageIsControlled(): Promise<boolean> {
  if (await supportsOfflineMode(navigator.serviceWorker.controller)) return true;
  if (navigator.serviceWorker.controller) return false;
  await new Promise<void>((resolve) => {
    const onChange = () => {
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve();
    }, 4000);
    navigator.serviceWorker.addEventListener('controllerchange', onChange, { once: true });
  });
  return supportsOfflineMode(navigator.serviceWorker.controller);
}

async function ensureOfflineWorkerReady(): Promise<void> {
  const serviceWorker = navigator.serviceWorker;
  if (!serviceWorker || !window.isSecureContext) {
    throw new Error('Connection not secure. Please ensure the local HTTPS certificate is trusted.');
  }

  // Surface registration failures directly instead of waiting forever on ready.
  const existingRegistration = await serviceWorker.getRegistration();
  if (!existingRegistration) {
    try {
      await serviceWorker.register('/sw.js', { scope: '/' });
    } catch (error) {
      throw new Error(`Offline worker registration failed: ${error instanceof Error ? error.message : 'Check HTTPS certificate'}`);
    }
  }

  const registration = await Promise.race([
    serviceWorker.ready,
    wait(15000).then(() => { throw new Error('Offline worker failed to activate. Please stay online and refresh.'); }),
  ]);
  if (await supportsOfflineMode(registration.active)) return;

  // A previous worker can still control the current page after a deployment.
  // Ask the browser to update it, then wait for the new active worker.
  await Promise.race([registration.update().catch(() => undefined), wait(10000)]);
  for (let attempt = 0; attempt < 12; attempt++) {
    if (await supportsOfflineMode(registration.active)) return;
    await wait(500);
  }
  throw new Error('Offline worker update incomplete. Please stay online and refresh.');
}

export async function setForcedOffline(enabled: boolean): Promise<void> {
  if (enabled) {
    await ensureOfflineWorkerReady();
    if (!await currentPageIsControlled()) {
      // Safari may activate a worker without controlling the first open page.
      // Reload online once, then enable offline only after the new page is controlled.
      sessionStorage.setItem(PENDING_KEY, 'true');
      window.location.reload();
      return;
    }
  }
  const cache = await caches.open(MODE_CACHE);
  if (enabled) {
    await cache.put(MODE_URL, new Response('offline'));
    localStorage.setItem(MODE_KEY, 'true');
  } else {
    await cache.delete(MODE_URL);
    localStorage.removeItem(MODE_KEY);
  }
  window.location.reload();
}

export function consumeOfflineSwitchError(): string | null {
  const error = sessionStorage.getItem(SWITCH_ERROR_KEY);
  sessionStorage.removeItem(SWITCH_ERROR_KEY);
  return error;
}

export async function finishPendingOfflineSwitch(): Promise<void> {
  if (sessionStorage.getItem(PENDING_KEY) !== 'true') return;
  sessionStorage.removeItem(PENDING_KEY);
  try {
    await ensureOfflineWorkerReady();
    if (!await currentPageIsControlled()) {
      throw new Error('Offline worker failed to control page. Check HTTPS certificate and reload.');
    }
    await setForcedOffline(true);
  } catch (error) {
    sessionStorage.setItem(
      SWITCH_ERROR_KEY,
      error instanceof Error ? error.message : 'Failed to start offline mode. Please stay online and retry.'
    );
    window.location.reload();
  }
}
