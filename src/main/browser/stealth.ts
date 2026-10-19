/**
 * Stealth Anti-Fingerprint & Evasion Scripts
 * Injected before page scripts execute via context.addInitScript()
 */

export const STEALTH_INIT_SCRIPT = `
(() => {
  // 1. Remove navigator.webdriver flag
  try {
    if (typeof Navigator !== 'undefined' && Navigator.prototype) {
      delete Navigator.prototype.webdriver;
    }
  } catch (e) {}

  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: function() { return undefined; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  // 2. Emulate window.chrome properties
  try {
    if (!window.chrome) {
      window.chrome = {};
    }
    window.chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
      RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
    };
    window.chrome.csi = function() { return {}; };
    window.chrome.loadTimes = function() {
      return {
        requestTime: Date.now() / 1000 - 1,
        startLoadTime: Date.now() / 1000 - 0.8,
        commitLoadTime: Date.now() / 1000 - 0.5,
        finishDocumentLoadTime: Date.now() / 1000 - 0.2,
        finishLoadTime: Date.now() / 1000,
        firstPaintTime: Date.now() / 1000 - 0.3,
        firstPaintAfterLoadTime: 0,
        navigationType: 'Other',
        wasFetchedViaSpdy: false,
        wasNpnNegotiated: false,
        npnNegotiatedProtocol: '',
        wasAlternateProtocolAvailable: false,
        connectionInfo: 'http/1.1'
      };
    };
    window.chrome.runtime = {
      OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
      OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
      PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
      PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
      RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' }
    };
  } catch (e) {}

  // 3. Emulate navigator.plugins and mimeTypes
  try {
    const fakePlugins = [
      {
        name: 'PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        length: 1,
        item: function(index) { return this[index]; },
        namedItem: function(name) { return null; }
      },
      {
        name: 'Chrome PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        length: 1,
        item: function(index) { return this[index]; },
        namedItem: function(name) { return null; }
      },
      {
        name: 'Chromium PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        length: 1,
        item: function(index) { return this[index]; },
        namedItem: function(name) { return null; }
      }
    ];

    Object.defineProperty(Navigator.prototype, 'plugins', {
      get: function() { return fakePlugins; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  // 4. Emulate Hardware Concurrency & Device Memory
  try {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      get: function() { return 8; },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(Navigator.prototype, 'deviceMemory', {
      get: function() { return 8; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  // 5. Emulate Vietnamese / English language preferences
  try {
    Object.defineProperty(Navigator.prototype, 'languages', {
      get: function() { return ['vi-VN', 'vi', 'en-US', 'en']; },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(Navigator.prototype, 'language', {
      get: function() { return 'vi-VN'; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  // 6. Fix navigator.permissions.query for Notification
  try {
    if (window.navigator && window.navigator.permissions && window.navigator.permissions.query) {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = function(parameters) {
        if (parameters && parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery.apply(this, [parameters]);
      };
    }
  } catch (e) {}

  // 7. WebGL Vendor & Renderer spoofing
  try {
    if (typeof WebGLRenderingContext !== 'undefined') {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0';
        }
        return getParameter.apply(this, [parameter]);
      };
    }

    if (typeof WebGL2RenderingContext !== 'undefined') {
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0';
        }
        return getParameter2.apply(this, [parameter]);
      };
    }
  } catch (e) {}
})();
`;

export const BROWSER_OPTIMIZED_ARGS = [
  // Disable automation indicators
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--exclude-switches=enable-automation',

  // Performance, RAM & CPU optimization
  '--disable-webgl',
  '--disable-3d-apis',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-webrtc',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-extensions-with-background-pages',
  '--disable-extensions',
  '--disable-features=TranslateUI,BlinkGenPropertyTrees',
  '--disable-ipc-flooding-protection',
  '--disable-renderer-backgrounding',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--password-store=basic',
  '--use-mock-keychain',
];
