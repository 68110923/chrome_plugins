// popup.js
document.addEventListener('DOMContentLoaded', () => {
    // 页面加载时，读取Chrome存储的API Key，填充到输入框
    chrome.storage.sync.get(['apiKey'], (items) => {
        if (items.apiKey) {
            document.getElementById('apiKey').value = items.apiKey;
        }
    });

    // 点击“保存配置”按钮，将API Key存入Chrome存储
    document.getElementById('saveBtn').addEventListener('click', () => {
        // 获取输入框的值
        const apiKey = document.getElementById('apiKey').value.trim();

        // 简单校验
        if (!apiKey) {
            alert('请输入GetTNShip API Key（来源：https://gettnship.com/api）');
            return;
        }

        // 存入Chrome存储
        chrome.storage.sync.set({ apiKey }, () => {
            // 保存成功提示（3秒后隐藏）
            const saveSuccess = document.getElementById('saveSuccess');
            saveSuccess.style.display = 'block';
            setTimeout(() => {
                saveSuccess.style.display = 'none';
                window.close(); // 保存后自动关闭弹窗
            }, 3000);
        });
    });
});