
GM_addStyle(`
/* 弹窗提示优化 */
.toast-notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    background: #1e293b; /* 深灰底色更高级 */
    color: #f8fafc; /* 浅色文字 */
    border-radius: 6px;
    z-index: 99999;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); /* 柔和阴影 */
    font-size: 14px;
    font-weight: 500;
    opacity: 0; /* 初始透明 */
    transform: translate(-50%, -10px); /* 初始位置上移 */
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 缓动动画 */
}

/* 弹窗显示状态（通过JS添加此类触发动画） */
.toast-notification.show {
    opacity: 1;
    transform: translate(-50%, 0);
}
`)

// 创建顶部通知条
function showToast(message) {
    // 先移除已存在的弹窗（避免重复）
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    // 创建新弹窗
    const toast = document.createElement("div");
    toast.className = "toast-notification"; // 使用优化后的类名
    toast.textContent = message;
    document.body.appendChild(toast);

    // 触发显示动画（延迟10ms确保DOM已插入）
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒后自动消失
    setTimeout(() => {
        toast.classList.remove('show'); // 触发隐藏动画
        setTimeout(() => toast.remove(), 300); // 等待动画结束后移除
    }, 3000);
}