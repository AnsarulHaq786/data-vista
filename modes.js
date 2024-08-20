let mode = document.getElementById('dark-mode-toggle');
let isDarkMode = false;
mode.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  isDarkMode = !isDarkMode;
});
