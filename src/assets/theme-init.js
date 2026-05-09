(function () {
  try {
    var appId = (document.querySelector('meta[name="app-id"]') || {}).content || 'utildex';
    var saved = localStorage.getItem(appId + '-state-theme');
    var isDark =
      saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (_err) {
  }
})();
