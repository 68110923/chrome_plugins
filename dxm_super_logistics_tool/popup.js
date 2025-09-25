// 加载保存的设置
// 加载配置
chrome.storage.sync.get(['username', 'password', 'concurrency_limit'], (items) => {
    if (items.username) {
        document.getElementById('username').value = items.username;
    }
    if (items.password) {
        document.getElementById('password').value = items.password;
    }
    // 设置并发请求数，如果没有保存过则使用默认值15
    document.getElementById('concurrency_limit').value = items.concurrency_limit || 15;
});

// 保存设置
document.getElementById('saveBtn').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const concurrency_limit = parseInt(document.getElementById('concurrency_limit').value);

    if (!username || !password) {
        alert('请输入完整的账号和密码');
        return;
    }

    // 验证并发数在1-50之间
    if (isNaN(concurrency_limit) || concurrency_limit < 1 || concurrency_limit > 50) {
        alert('并发请求数必须在1到50之间');
        return;
    }

    chrome.storage.sync.set({ username, password, concurrency_limit }, () => {
        const saveSuccess = document.getElementById('saveSuccess');
        saveSuccess.style.display = 'block';
        setTimeout(() => {
            saveSuccess.style.display = 'none';
            window.close();
        }, 3000);
    });
});