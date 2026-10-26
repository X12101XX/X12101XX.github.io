// Yun invokes this constructor at startup. Keep the site light even with a saved dark preference.
window.darken = class LightMode {
  constructor() { document.documentElement.classList.remove('dark'); }
};
document.documentElement.classList.remove('dark');
document.documentElement.style.colorScheme = 'light';
