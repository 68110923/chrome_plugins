
// 监听background.js发送的搜索包响应可用消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEARCH_PACKAGE_RESPONSE_AVAILABLE') {
        initNetworkMonitor();
        sendResponse({ received: true });
    }
    return true;
});

// 初始化监控触发
async function initNetworkMonitor() {
    let orders = await parsePageData();
    // 发送请求上传数据
    const user = await get_settings();
    let batch_order_data = {orders: orders}
    const url = `${SF_ERP_URL}/drf/order/order/batch_create/`;
    const base64Credentials = btoa(`${user.username}:${user.password}`);
    await fetch(url, {
        method: 'POST',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Basic ${base64Credentials}`,
        },
        body: JSON.stringify(batch_order_data),
        credentials: 'include' // 包含跨域请求的cookie
    }).then(response => {
        // 无论状态码如何，先尝试解析 JSON
        return response.json().then(data => ({
            status: response.status,
            data: data
        }));
    }).then(({status, data}) => {
        // 这里可以获取到所有状态码的响应内容
        if (status === 401 || status === 403) {
            showNotification(`检测到 ${orders.length} 条订单， ${data.detail}`);
        }else if (status === 207) {
            showNotification(`检测到 ${orders.length} 条订单`);
        }else {
            showNotification(`检测到 ${orders.length} 条订单，出现未知错误`);
        }
    }).catch(error => {
        console.error('请求失败:', error);
    });
}

// 解析页面订单数据
async function parsePageData() {
    const all_tr = document.documentElement.querySelectorAll('tr[class^="orderId_"]');
    const all_tr_list = Array.from(all_tr);
    const orders = [];
    
    // 从设置中获取并发数，默认为15
    const userSettings = await get_settings();
    const concurrency_limit = parseInt(userSettings.concurrency_limit) || 15;
    for (let i = 0; i < all_tr_list.length; i += concurrency_limit) {
        // 截取当前批次的tr元素
        const batch = all_tr_list.slice(i, i + concurrency_limit);
        // 批次打包
        const batchPromises = batch.map(async (tr) => {return process_tr(tr);});
        // 批次运行
        const batch_orders = await Promise.all(batchPromises);
        orders.push(...batch_orders);
    }
    return orders;
}

// 处理单个tr数据的函数
async function process_tr(tr) {
    const dxm_id = tr.getAttribute('data-orderid').trim();
    // console.log(`解析店小秘订单ID：${dxm_id}`);
    const response = await fetch(`https://www.dianxiaomi.com/package/detail.htm?packageId=${dxm_id}`, {
        method: 'GET',
        headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml',
            'referer': 'https://www.dianxiaomi.com/order/index.htm?go=m101',
            'user-agent': navigator.userAgent
        }
    });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const created_at = tr.querySelector('td:nth-child(5) div:nth-child(1)').textContent.trim().match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)[0];
    return {
        dxm_order_number: dxm_id,
        order_number: tr.querySelector('a[class*="orderNumberSpan"]').textContent.trim(),
        created_at: `${created_at}:00`,
        shipping_zip_code: doc.getElementById('detailZip1').textContent.trim().split('-')[0],
        status: "processing",
    };
}

// 获取账号数据
async function get_settings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['username', 'password', 'concurrency_limit'], (items) => {
            resolve({
                username: items.username,
                password: items.password,
                concurrency_limit: items.concurrency_limit
            });
        });
    });
}

// 显示通知函数
function showNotification(message) {
    console.log(message);
    // 创建一个简单的通知元素
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.background = '#333';
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.fontSize = '14px';
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 3000);
}


