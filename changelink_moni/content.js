// 主函数：提取商品信息并插入链接
function extractProductInfo() {
    const xpath = '//td[@class="productInfo"]//*[@class="pairProInfoSku"]';
    const amazonMapping = {
        "US": "www.amazon.com", "UK": "www.amazon.co.uk", "DE": "www.amazon.de",
        "FR": "www.amazon.fr", "JP": "www.amazon.co.jp", "CA": "www.amazon.ca",
        "CN": "www.amazon.cn", "IN": "www.amazon.in", "IT": "www.amazon.it",
        "ES": "www.amazon.es", "MX": "www.amazon.com.mx", "BR": "www.amazon.com.br",
        "AU": "www.amazon.com.au", "NL": "www.amazon.nl", "SE": "www.amazon.se",
        "PL": "www.amazon.pl", "SG": "www.amazon.sg"
    };

    try {
        // 获取国家代码（默认US）
        let countryCode = 'US';
        try {
            const countryEl = document.querySelector('[role="tabpanel"] #detailCountry1');
            if (countryEl?.dataset.country) countryCode = countryEl.dataset.country;
        } catch (e) {
            console.warn('获取国家代码失败，使用默认值US:', e);
        }
        const host = amazonMapping[countryCode] || amazonMapping.US;

        // 获取邮编（默认00000）
        let zipCode = '00000';
        try {
            const zipEl = document.getElementById('detailZip1');
            if (zipEl?.textContent) {
                zipCode = zipEl.textContent.split('-')[0].trim();
            }
        } catch (e) {
            alert('获取邮编失败！ 无法正常跳转邮编！');
        }

        // 处理匹配的元素
        const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        let processedCount = 0;

        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            if (!element) continue;

            // 匹配ASIN（B0开头的10位编码）
            const asinMatch = element.textContent.trim().match(/(B0[A-Z0-9]{8})/);
            if (!asinMatch) continue;
            const asin = asinMatch[1];

            // 避免重复处理
            if (element.querySelector(`a[href*="${asin}"]`)) continue;
            processedCount++;
            console.log('处理ASIN:', asin);

            // 创建链接元素
            const link = document.createElement('a');
            link.href = `https://${host}/dp/${asin}?th=1&psc=1`;
            link.target = "_blank";
            link.textContent = asin;
            link.style.cssText = 'color:#165DFF;text-decoration:underline;font-weight:bold';
            link.title = `查看亚马逊${countryCode}站点商品`;
            // 存储数据供点击事件使用
            Object.assign(link.dataset, { asin, country: countryCode, zipcode: zipCode });

            // 替换文本节点中的ASIN为链接
            Array.from(element.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(asin)) {
                    const [before, after] = [
                        node.textContent.substring(0, node.textContent.indexOf(asin)),
                        node.textContent.substring(node.textContent.indexOf(asin) + asin.length)
                    ];
                    // 插入新节点并移除原节点
                    node.parentNode.insertBefore(document.createTextNode(before), node);
                    node.parentNode.insertBefore(link, node);
                    node.parentNode.insertBefore(document.createTextNode(after), node);
                    node.parentNode.removeChild(node);
                }
            });
        }
        console.log(`共处理 ${processedCount} 个ASIN`);
    } catch (error) {
        console.error('处理ASIN时发生错误:', error);
    }
}

// 事件委托：处理所有ASIN链接点击
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-asin]');
    if (!link) return;

    const { asin, zipcode } = link.dataset;
    console.log('触发ASIN链接点击:', asin);

    chrome.runtime.sendMessage({ action: 'getZipCodeEnabled' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('获取开关状态失败:', chrome.runtime.lastError);
            return;
        }
        const isEnabled = response?.enabled !== false;
        if (isEnabled && zipcode && zipcode !== '00000') {
            e.preventDefault();
            chrome.runtime.sendMessage({
                action: 'setupAmazonZipCode',
                url: link.href,
                zipCode: zipcode
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('发送设置邮编请求失败:', chrome.runtime.lastError);
                    window.open(link.href, '_blank');
                } else {
                    console.log('发送设置邮编请求成功', response?.status !== false);
                }
            });
        }
    });
});

// 节流控制与DOM监听
let lastProcessTime = 0;
const minInterval = 500;

const throttleProcess = () => {
    const now = Date.now();
    if (now - lastProcessTime >= minInterval) {
        lastProcessTime = now;
        extractProductInfo();
    }
};

// 消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'packageDetailLoaded') {
        const popup = document.querySelector('[role="tabpanel"]');
        if (popup && !popup.hidden) throttleProcess();
    }
});

// DOM变化监听
const observer = new MutationObserver(mutations => {
    if (mutations.some(m => m.addedNodes.length > 0)) throttleProcess();
});

observer.observe(document.querySelector('[role="tabpanel"]') || document.body, {
    childList: true,
    subtree: true
});

// 初始化执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', throttleProcess);
} else {
    throttleProcess();
}
