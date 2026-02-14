document.addEventListener('DOMContentLoaded', () => {
  const positionSelect = document.getElementById('position');
  const colorPicker = document.getElementById('colorPicker');
  const textColorInput = document.getElementById('textColor');
  const preview = document.getElementById('preview');
  const saveBtn = document.getElementById('save');

  chrome.storage.sync.get({ position: 'top-right', textColor: '#00ff00' }, (data) => {
    positionSelect.value = data.position;
    const color = data.textColor;
    colorPicker.value = color;
    textColorInput.value = color;
    preview.style.color = color;
  });

  function updatePreview() {
    let color = textColorInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      colorPicker.value = color;
      preview.style.color = color;
    } else if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
      colorPicker.value = color;
      preview.style.color = color;
    }
  }

  colorPicker.addEventListener('input', () => {
    textColorInput.value = colorPicker.value;
    preview.style.color = colorPicker.value;
  });

  textColorInput.addEventListener('input', updatePreview);
  textColorInput.addEventListener('change', updatePreview);

  saveBtn.addEventListener('click', () => {
    let color = textColorInput.value.trim();
    if (!/^#[0-9A-Fa-f]{3,6}$/.test(color)) {
      color = '#00ff00';
    }
    chrome.storage.sync.set({
      position: positionSelect.value,
      textColor: color
    }, () => {
      saveBtn.textContent = '保存しました！';
      setTimeout(() => { saveBtn.textContent = '保存'; }, 2000);
    });
  });
});
