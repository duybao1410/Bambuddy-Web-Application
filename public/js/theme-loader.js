// Global theme loader - applies theme on page load
(function() {
  'use strict';
  
  // Load theme from server-side data or localStorage
  function loadTheme() {
    const bodyElement = document.body;
    const serverTheme = (bodyElement.className || '').trim();
    const storedTheme = localStorage.getItem('userTheme');

    if (serverTheme && serverTheme !== 'null' && serverTheme !== 'undefined') {
      // Always respect server-provided theme and sync storage
      bodyElement.className = serverTheme;
      localStorage.setItem('userTheme', serverTheme);
      return;
    }

    // Fallback to stored theme
    const fallback = storedTheme || 'light';
    bodyElement.className = fallback;
  }
  
  // Apply theme when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTheme);
  } else {
    loadTheme();
  }
})();
