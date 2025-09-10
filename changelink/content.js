// 主函数：提取商品信息并插入链接（使用a标签替代button）
function extractProductInfo() {
    // 使用 XPath 选择元素
    const processedAsins = new Set(); // 存储已处理的 ASINs
    const xpath = '//*[@class="pairProInfoSku"]';
    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    const amazonMapping = {
        "US": "www.amazon.com",
        "UK": "www.amazon.co.uk",
        "DE": "www.amazon.de",
        "FR": "www.amazon.fr",
        "JP": "www.amazon.co.jp",
        "CA": "www.amazon.ca",
        "CN": "www.amazon.cn",
        "IN": "www.amazon.in",
        "IT": "www.amazon.it",
        "ES": "www.amazon.es",
        "MX": "www.amazon.com.mx",
        "BR": "www.amazon.com.br",
        "AU": "www.amazon.com.au",
        "NL": "www.amazon.nl",
        "SE": "www.amazon.se",
        "PL": "www.amazon.pl",
        "SG": "www.amazon.sg"
    };

    // 获取国家代码
    const countryElement = document.querySelector('[role="tabpanel"] #detailCountry1');
    const countryCode = countryElement ? countryElement.dataset.country : 'US';
    const host = amazonMapping[countryCode] || amazonMapping['US'];

    for (let i = 0; i < result.snapshotLength; i++) {
        const element = result.snapshotItem(i);
        let text = element.textContent.trim();
        const asinMatch = text.match(/(B0[A-Z0-9]{8})/);

        // 确保匹配到ASIN再处理
        if (!asinMatch) continue;

        const asin = asinMatch[1];
        if (processedAsins.has(asin)) continue;

        processedAsins.add(asin);
        console.log('处理ASIN:', asin);

        // 创建a标签（替代button）
        let linkAnchor = document.createElement('a');
        linkAnchor.href = "#"; // 设置href="#"
        linkAnchor.h_href = `https://${host}/dp/${asin}?th=1&psc=1`; // 保留实际链接地址
        linkAnchor.textContent = asin;
        linkAnchor.style.color = '#165DFF'; // 链接颜色
        linkAnchor.style.textDecoration = 'underline'; // 下划线样式

        // 点击事件处理（阻止默认跳转，保留原有逻辑）
        linkAnchor.onclick = async function(event) {
            event.preventDefault(); // 阻止a标签默认跳转行为
            const zipCodeElement = document.getElementById('detailZip1');
            const zipCode = zipCodeElement ? zipCodeElement.textContent.split('-')[0].trim() : '00000';

            try {
                // 先发送邮编设置请求，成功后再打开链接
                await triggerSyncRequest(zipCode, host, linkAnchor.h_href);
                window.open(linkAnchor.h_href, '_blank');
            } catch (error) {
                console.error('请求失败，仍尝试打开链接:', error);
                window.open(linkAnchor.h_href, '_blank');
            }
        };

        // 处理剩余文本并构建DOM
        const remainingText = text.replace(asin, '').trim();
        const container = document.createElement('div');
        container.appendChild(linkAnchor);

        if (remainingText) {
            const textNode = document.createTextNode(remainingText);
            container.appendChild(textNode);
        }

        element.innerHTML = '';
        element.appendChild(container);
    }
}

// 异步请求函数 - 通过background转发
// 修改 content.js 中的请求参数部分
async function triggerSyncRequest(zipCode, host, link) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        const userAgent = navigator.userAgent;
        const origin = `https://${host}`;

        // 生成更真实的请求参数
        const params = new URLSearchParams({
            actionSource: 'glow',
            // 新增随机参数防止缓存
            'random': Math.random().toString(36).substring(2, 12)
        });

        const url = `https://${host}/portal-migration/hz/glow/address-change?${params.toString()}`;

        // 更贴近真实的请求体
        const json_data = {
            locationType: 'LOCATION_INPUT',
            zipCode: zipCode,
            deviceType: 'web',
            // 更合理的storeContext值
            storeContext: ['apparel', 'luxury', 'kitchen', 'electronics'][Math.floor(Math.random() * 4)],
            pageType: 'Detail',
            actionSource: 'glow'
        };

        // 获取浏览器的sec-ch-*等现代浏览器头信息
        const secHeaders = {};
        if (navigator.deviceMemory) secHeaders['device-memory'] = navigator.deviceMemory;
        if (window.devicePixelRatio) secHeaders['dpr'] = window.devicePixelRatio;
        if (navigator.connection) {
            secHeaders['downlink'] = navigator.connection.downlink;
            secHeaders['ect'] = navigator.connection.effectiveType;
            secHeaders['rtt'] = navigator.connection.rtt;
        }

        // 先解析版本
        const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)[1];

        const headers = {
            'accept': 'text/html,*/*',
            'accept-language': navigator.language || 'zh-CN,zh;q=0.9',
            'content-type': 'application/json',
            'user-agent': userAgent,
            'origin': origin,
            'referer': link,
            'dnt': '1', // 防追踪标识
            'priority': 'u=1, i',
            'viewport-width': window.innerWidth,
            'x-requested-with': 'XMLHttpRequest',
            ...secHeaders,
            // 动态生成sec-ch-ua相关头
            'sec-ch-ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`,
            'sec-ch-ua-mobile': navigator.userAgent.includes('Mobile') ? '?1' : '?0',
            'sec-ch-ua-platform': `"${navigator.platform}"`,
            'sec-ch-viewport-width': window.innerWidth.toString()
        };

        // 向background发送请求
        chrome.runtime.sendMessage({
            type: 'FETCH_REQUEST',
            id: requestId,
            url: url,
            method: 'POST',
            headers: headers,
            body: JSON.stringify(json_data),
            userAgent: userAgent,
            referer: link
        }, (response) => {
            // 保持原有的回调处理逻辑
            if (chrome.runtime.lastError) {
                console.error('消息发送失败:', chrome.runtime.lastError);
                reject(new Error('无法连接到后台服务'));
                return;
            }

            if (response.type === 'FETCH_RESPONSE') {
                console.log(`邮编设置成功:`, zipCode);
                resolve(response.result);
            } else if (response.type === 'FETCH_ERROR') {
                console.error('请求错误:', response.error);
                reject(new Error(response.error));
            }
        });
    });
}

// 执行频率控制 - 使用requestAnimationFrame实现节流
let lastExecutionTime = 0;
const throttleInterval = 3000; // 2秒执行一次

function checkAndProcess() {
    const now = Date.now();

    // 检查是否达到执行间隔
    if (now - lastExecutionTime >= throttleInterval) {
        extractProductInfo();
        lastExecutionTime = now;
    }

    // 继续监听
    requestAnimationFrame(checkAndProcess);
}

// 启动监控
checkAndProcess();
