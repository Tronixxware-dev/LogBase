// Light / dark theme. The choice is kept on this device. Until someone picks one, the app follows the device setting.

export const THEME_KEY = 'logbase_theme';

// Runs in the page <head> before anything is drawn, so a dark screen never flashes white first.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null; // storage blocked: fall back to the device setting
  }
}

export function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function currentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Saves the choice on this device and applies it straight away.
export function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // the choice still applies until the page is closed
  }
  window.dispatchEvent(new CustomEvent('logbase:theme-changed', { detail: theme }));
}
