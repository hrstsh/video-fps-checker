document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle');
  const optionsLink = document.getElementById('options-link');

  chrome.storage.sync.get({ enabled: true }, (data) => {
    toggle.classList.toggle('on', data.enabled);
    toggle.setAttribute('aria-pressed', data.enabled);
  });

  toggle.addEventListener('click', () => {
    const isOn = toggle.classList.toggle('on');
    toggle.setAttribute('aria-pressed', isOn);
    chrome.storage.sync.set({ enabled: isOn });
  });

  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
