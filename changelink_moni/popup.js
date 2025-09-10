document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('zipCodeToggle');

    // 读取状态时添加更明确的默认值处理
    chrome.storage.sync.get(['zipCodeEnabled'], (result) => {
        const isEnabled = result.zipCodeEnabled !== undefined ? result.zipCodeEnabled : true;
        toggle.checked = isEnabled;
        // 存储默认值（如果是首次使用）
        if (result.zipCodeEnabled === undefined) {
            chrome.storage.sync.set({ zipCodeEnabled: true });
        }
    });

    toggle.addEventListener('change', (e) => {
        chrome.storage.sync.set({ zipCodeEnabled: e.target.checked }, () => {
            console.log('开关状态已保存:', e.target.checked);
        });
    });
});