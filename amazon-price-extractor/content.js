function extractAndCopyUp1() {
    /**
     * 从当前页面URL中提取ASIN。
     * 亚马逊URL中ASIN通常跟在 /dp/ 或 /gp/product/ 后面。
     * @returns {string|null} 提取到的ASIN或null。
     */
    function getAsin() {
        const url = window.location.href;
        const asinMatch = url.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);
        return asinMatch ? asinMatch[2] : null;
    }

    /**
     * 使用XPath从页面中提取价格。
     * @returns {string|null} 清理后的价格字符串或null。
     */
    function getPrice() {
        const priceXPath = '//div[@id="corePrice_feature_div"]//span[contains(@class, "a-price") and contains(@class, "aok-align-center")]//span[@class="a-offscreen"]';
        const priceElement = document.evaluate(priceXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (priceElement && priceElement.textContent) {
            // 移除货币符号（如$）和多余的空格，只保留数字和小数点
            return priceElement.textContent.replace(/[^0-9.]/g, '').trim();
        }
        return null;
    }

    const asin = getAsin();
    const price = getPrice();
    const currentUrl = window.location.href.split('?')[0];

    if (asin && price) {
        const clipboardText = `${asin}\n${price}`;

        navigator.clipboard.writeText(clipboardText).then(() => {
            alert('成功复制到剪贴板！\n\n' + clipboardText);
        }).catch(err => {
            console.error('无法复制文本: ', err);
            alert('复制失败，请检查浏览器控制台获取更多信息。');
        });
    } else {
        let errorMessage = "未能提取所需信息：\n";
        if (!asin) {
            errorMessage += "- 无法从此URL中找到有效的ASIN。\n";
        }
        if (!price) {
            errorMessage += "- 无法在此页面上找到价格信息。\n";
        }
        alert(errorMessage);
    }
}


// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract-info") {
        extractAndCopyUp1();
        sendResponse({status: "done"});
    }
    return true; // for asynchronous response
});

// 创建并注入浮动按钮
(function() {
    const floatButton = document.createElement('button');
    floatButton.id = 'amazon-price-extractor-btn';

    // 使用一个简单的emoji或文字作为按钮图标
    floatButton.textContent = '👍'; // Clipboard emoji

    // 添加样式
    Object.assign(floatButton.style, {
        position: 'fixed',
        bottom: '75px',
        right: '20px',
        zIndex: '1000',
        width: '50px',
        height: '50px',
        backgroundColor: '#fff',
        color: '#000',
        border: '1px solid #ddd',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    });

    floatButton.addEventListener('click', extractAndCopyUp1);

    document.body.appendChild(floatButton);
})();


function extractAndCopy() {
    /**
     * 从当前页面URL中提取ASIN。
     * 亚马逊URL中ASIN通常跟在 /dp/ 或 /gp/product/ 后面。
     * @returns {string|null} 提取到的ASIN或null。
     */
    function getAsin() {
        const url = window.location.href;
        const asinMatch = url.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);
        return asinMatch ? asinMatch[2] : null;
    }

    /**
     * 使用XPath从页面中提取价格。
     * @returns {string|null} 清理后的价格字符串或null。
     */
    function getPrice() {
        const priceXPath = '//div[@id="corePrice_feature_div"]//span[contains(@class, "a-price") and contains(@class, "aok-align-center")]//span[@class="a-offscreen"]';
        const priceElement = document.evaluate(priceXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        
        if (priceElement && priceElement.textContent) {
            // 移除货币符号（如$）和多余的空格，只保留数字和小数点
            return priceElement.textContent.replace(/[^0-9.]/g, '').trim();
        }
        return null;
    }

    const asin = getAsin();
    const price = getPrice();
    const currentUrl = window.location.href.split('?')[0];

    if (asin && price) {
        const clipboardText = `${currentUrl}\n${asin}\n${price}`;
        
        navigator.clipboard.writeText(clipboardText).then(() => {
            alert('成功复制到剪贴板！\n\n' + clipboardText);
        }).catch(err => {
            console.error('无法复制文本: ', err);
            alert('复制失败，请检查浏览器控制台获取更多信息。');
        });
    } else {
        let errorMessage = "未能提取所需信息：\n";
        if (!asin) {
            errorMessage += "- 无法从此URL中找到有效的ASIN。\n";
        }
        if (!price) {
            errorMessage += "- 无法在此页面上找到价格信息。\n";
        }
        alert(errorMessage);
    }
}

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract-info") {
        extractAndCopy();
        sendResponse({status: "done"});
    }
    return true; // for asynchronous response
});

// 创建并注入浮动按钮
(function() {
    const floatButton = document.createElement('button');
    floatButton.id = 'amazon-price-extractor-btn';
    
    // 使用一个简单的emoji或文字作为按钮图标
    floatButton.textContent = '📋'; // Clipboard emoji
    
    // 添加样式
    Object.assign(floatButton.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '1000',
        width: '50px',
        height: '50px',
        backgroundColor: '#fff',
        color: '#000',
        border: '1px solid #ddd',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    });

    floatButton.addEventListener('click', extractAndCopy);
    
    document.body.appendChild(floatButton);
})();