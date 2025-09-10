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
async function triggerSyncRequest(zipCode, host, link) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now(); // 生成唯一请求ID

        // 获取当前浏览器的User-Agent
        const userAgent = navigator.userAgent;

        // 准备请求参数
        const params = new URLSearchParams({
            actionSource: 'glow',
        });

        const url = `https://${host}/portal-migration/hz/glow/address-change?${params.toString()}`;

        const json_data = {
            locationType: 'LOCATION_INPUT',
            zipCode: zipCode,
            deviceType: 'web',
            storeContext: ['apparel', 'luxury'][Math.floor(Math.random() * 2)],
            pageType: 'Detail',
            actionSource: 'glow',
        };

        const headers = {
            'accept': 'application/json',
            'content-type': 'application/json',
            'user-agent': userAgent,
            'origin': `https://${host}`,
            'referer': link,  // 模拟浏览器Referer
        };

        // 向background发送请求
        chrome.runtime.sendMessage({
            type: 'FETCH_REQUEST',
            id: requestId,
            url: url,
            method: 'POST',
            headers: headers,
            body: JSON.stringify(json_data),
            userAgent: userAgent
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('消息发送失败:', chrome.runtime.lastError);
                reject(new Error('无法连接到后台服务'));
                return;
            }

            console.log('url:', url);
            console.log('headers:', headers);
            console.log('json_data:', json_data);

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
const throttleInterval = 2000; // 2秒执行一次

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
