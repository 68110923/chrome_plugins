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
        const requestId = Date.now();
        const userAgent = navigator.userAgent;
        const origin = `https://${host}`;

        // 1. 构建POST请求参数（原地址设置请求）
        const postParams = new URLSearchParams({
            actionSource: 'glow',
            'random': Math.random().toString(36).substring(2, 12)
        });
        const postUrl = `https://${host}/portal-migration/hz/glow/address-change?${postParams.toString()}`;

        const postData = {
            locationType: 'LOCATION_INPUT',
            zipCode: zipCode,
            deviceType: 'desktop', // 修正为desktop匹配curl
            storeContext: ['apparel', 'luxury', 'kitchen', 'electronics', 'home-garden'][Math.floor(Math.random() * 5)],
            pageType: 'Detail',
            actionSource: 'glow'
        };

        // 2. 构建GET请求参数（新增的刷新请求）
        const getParams = new URLSearchParams({
            triggerFeature: 'AddressList',
            deviceType: 'desktop',
            pageType: 'Detail',
            storeContext: postData.storeContext, // 与POST保持一致
            locker: '{}',
            'random': Math.random().toString(36).substring(2, 12)
        });
        const getUrl = `https://${host}/portal-migration/hz/glow/condo-refresh-html?${getParams.toString()}`;

        // 公共请求头（同时用于POST和GET）
        const secHeaders = {};
        if (navigator.deviceMemory) secHeaders['device-memory'] = navigator.deviceMemory;
        if (window.devicePixelRatio) secHeaders['dpr'] = window.devicePixelRatio;
        if (navigator.connection) {
            secHeaders['downlink'] = navigator.connection.downlink;
            secHeaders['ect'] = navigator.connection.effectiveType;
            secHeaders['rtt'] = navigator.connection.rtt;
        }
        const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '140';
        const headers = {
            'accept': 'text/html,*/*',
            'accept-language': navigator.language || 'zh-CN,zh;q=0.9',
            'user-agent': userAgent,
            'origin': origin,
            'referer': link,
            'dnt': '1',
            'priority': 'u=1, i',
            'viewport-width': window.innerWidth,
            'x-requested-with': 'XMLHttpRequest',
            ...secHeaders,
            'sec-ch-ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`,
            'sec-ch-ua-mobile': navigator.userAgent.includes('Mobile') ? '?1' : '?0',
            'sec-ch-ua-platform': `"${navigator.platform}"`,
            'sec-ch-viewport-width': window.innerWidth.toString(),
            'cache-control': 'no-cache', // 新增缓存控制
            'pragma': 'no-cache'
        };

        // 3. 先发送POST请求，成功后再发送GET请求
        chrome.runtime.sendMessage({
            type: 'FETCH_REQUEST',
            id: requestId,
            url: postUrl,
            method: 'POST',
            headers: { ...headers, 'content-type': 'application/json;charset=UTF-8' }, // 修正Content-Type
            body: JSON.stringify(postData),
            userAgent: userAgent,
            referer: link
        }, (postResponse) => {
            if (chrome.runtime.lastError) {
                console.error('POST消息发送失败:', chrome.runtime.lastError);
                reject(new Error('POST请求失败'));
                return;
            }

            if (postResponse.type === 'FETCH_RESPONSE') {
                console.log('邮编设置POST请求成功，开始发送GET刷新请求');
                // POST成功后发起GET请求
                chrome.runtime.sendMessage({
                    type: 'FETCH_REQUEST',
                    id: requestId + 1, // 避免ID冲突
                    url: getUrl,
                    method: 'GET', // GET请求
                    headers: headers, // 无需Content-Type
                    body: null, // GET无请求体
                    userAgent: userAgent,
                    referer: link
                }, (getResponse) => {
                    if (chrome.runtime.lastError) {
                        console.error('GET消息发送失败:', chrome.runtime.lastError);
                        reject(new Error('GET请求失败'));
                        return;
                    }
                    if (getResponse.type === 'FETCH_RESPONSE') {
                        console.log('地址刷新GET请求成功');
                        resolve(getResponse.result); // 最终返回GET结果
                    } else {
                        console.error('GET请求错误:', getResponse.error);
                        reject(new Error('GET请求错误: ' + getResponse.error));
                    }
                });
            } else {
                console.error('POST请求错误:', postResponse.error);
                reject(new Error('POST请求错误: ' + postResponse.error));
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
