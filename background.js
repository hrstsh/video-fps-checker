// 初期設定を保存（初回インストール時）
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['enabled', 'position', 'textColor'], (data) => {
    const defaults = {
      enabled: data.enabled ?? true,
      position: data.position ?? 'top-right',
      textColor: data.textColor ?? '#00ff00'
    };
    chrome.storage.sync.set(defaults);
  });
});
