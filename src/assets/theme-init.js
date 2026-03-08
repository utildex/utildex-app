(function () {
  try {
    var saved = localStorage.getItem('utildex-state-theme');
    var isDark =
      saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (_err) {
  }
})();
