// 主函数：提取商品信息并插入链接（逻辑不变）
function extractProductInfo() {
    const processedAsins = new Set();
    const xpath = '//*[@class="pairProInfoSku"]';

    try {
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

        let countryCode = 'US';
        try {
            const countryElement = document.querySelector('[role="tabpanel"] #detailCountry1');
            if (countryElement && countryElement.dataset.country) {
                countryCode = countryElement.dataset.country;
            }
        } catch (e) {
            console.warn('获取国家代码失败，使用默认值US:', e);
        }

        const host = amazonMapping[countryCode] || amazonMapping['US'];

        let zipCode = '00000';
        try {
            const zipCodeElement = document.getElementById('detailZip1');
            if (zipCodeElement && zipCodeElement.textContent) {
                zipCode = zipCodeElement.textContent.split('-')[0].trim();
            }
        } catch (e) {
            console.warn('获取邮编失败，使用默认值:', e);
        }

        let processedCount = 0;
        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            if (!element) continue;

            let text = element.textContent.trim();
            const asinMatch = text.match(/(B0[A-Z0-9]{8})/);
            if (!asinMatch) continue;

            const asin = asinMatch[1];
            if (processedAsins.has(asin)) continue;

            processedAsins.add(asin);
            processedCount++;
            console.log('处理ASIN:', asin);

            let linkAnchor = document.createElement('a');
            linkAnchor.href = `https://${host}/dp/${asin}?th=1&psc=1`;
            linkAnchor.target = "_blank";
            linkAnchor.textContent = asin;
            linkAnchor.style.color = '#165DFF';
            linkAnchor.style.textDecoration = 'underline';
            linkAnchor.title = `查看亚马逊${countryCode}站点商品`;
            linkAnchor.style.fontWeight = 'bold'; // 设置加粗

            // 修改点击事件处理部分
            linkAnchor.addEventListener('click', (e) => {
                // 发送消息获取开关状态
                console.log('触发点击事件')
                chrome.runtime.sendMessage({ action: 'getZipCodeEnabled' }, (response) => {
                    // 处理可能的通信错误
                    console.log('开关状态:',response);
                    if (chrome.runtime.lastError) {
                        console.error('获取开关状态失败:', chrome.runtime.lastError);
                        return; // 出错时使用默认行为
                    }
                    // 明确设置默认启用状态
                    const isEnabled = response?.enabled !== false;
                    if (isEnabled && zipCode && zipCode !== '00000') {
                        chrome.runtime.sendMessage({
                            action: 'setupAmazonZipCode',
                            url: linkAnchor.href,
                            zipCode: zipCode
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('发送设置邮编请求失败:', chrome.runtime.lastError);
                                e.preventDefault();
                                window.open(linkAnchor.href, '_blank'); // 失败时手动打开
                            } else {
                                console.log('发送设置邮编请求成功', response?.status !== false);
                            }
                        });
                        e.preventDefault();
                    }
                });
            });

            const remainingText = text.replace(asin, '').trim();
            const container = document.createElement('div');
            container.style.display = 'inline';
            container.appendChild(linkAnchor);

            if (remainingText) {
                const textNode = document.createTextNode(remainingText);
                container.appendChild(textNode);
            }

            Array.from(element.attributes).forEach(attr => {
                container.setAttribute(attr.name, attr.value);
            });

            element.parentNode.replaceChild(container, element);
        }
    } catch (error) {
        console.error('处理ASIN时发生错误:', error);
    }
}

// 节流控制：限制最短执行间隔（500ms）
let lastProcessTime = 0;
const minInterval = 500; // 最短处理间隔，避免频繁执行

function throttleProcess() {
    const now = Date.now();
    if (now - lastProcessTime < minInterval) {
        return; // 间隔过短，跳过
    }
    lastProcessTime = now;
    extractProductInfo();
}

// 定时器检查（保留原有逻辑，但延长间隔）
let isProcessing = false;
const throttleInterval = 1000; // 延长定时器间隔到5秒

function checkAndProcess() {
    if (isProcessing) return;

    isProcessing = true;
    setTimeout(() => {
        try {
            const orderDetailPopup = document.querySelector('[role="tabpanel"]');
            if (orderDetailPopup && !orderDetailPopup.hidden) {
                throttleProcess(); // 使用节流后的处理函数
            }
        } finally {
            isProcessing = false;
        }
        requestAnimationFrame(checkAndProcess);
    }, throttleInterval);
}

// 页面加载完成后启动定时器检查
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndProcess);
} else {
    checkAndProcess();
}

// 监听DOM变化（添加节流，避免频繁触发）
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
            throttleProcess(); // 用节流函数处理
        }
    });
});

// 缩小监听范围（只监听订单弹窗相关区域，减少触发次数）
const targetNode = document.querySelector('[role="tabpanel"]') || document.body;
observer.observe(targetNode, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
});