// background.js

/**
 * 检查并激活已有标签页，如果不存在则创建新标签页
 * @param {string} url - 目标URL
 * @param {string} zipCode - 邮编
 */
async function handleTabNavigation(url, zipCode) {
    try {
        let targetTab;
        // 检查是否已有相同URL的标签页
        const existingTabs = await new Promise(resolve =>
            chrome.tabs.query({ url }, resolve)
        );

        if (existingTabs.length > 0) {
            // 激活已有标签页
            targetTab = await new Promise(resolve =>
                chrome.tabs.update(existingTabs[0].id, { active: true }, resolve)
            );
        } else {
            // 创建新标签页
            targetTab = await new Promise(resolve =>
                chrome.tabs.create({ url }, resolve)
            );
            if (!targetTab) {
                throw new Error('创建标签页失败');
            }
        }

        // 统一等待标签页加载完成
        await new Promise((resolve) => {
            const listener = (tabId, info) => {
                if (tabId === targetTab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);

            // 立即检查一次状态
            chrome.tabs.get(targetTab.id, (tab) => {
                if (tab.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            });

            // 超时保护
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }, 10000);
        });

        // 注入邮编设置脚本
        console.log('准备注入邮编设置脚本到标签页:', targetTab.id);
        await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: setAmazonZipCode,
            args: [zipCode],
            world: "MAIN"
        });
        console.log('脚本注入完成');

    } catch (error) {
        console.error('处理标签页导航失败:', error);
    }
}

/**
 * 在亚马逊页面设置邮编的函数
 * @param {string} zipCode - 要设置的邮编
 */
function setAmazonZipCode(zipCode) {
    // 等待元素加载的辅助函数
    const waitForElement = (selector, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                } else if (Date.now() - start > timeout) {
                    reject(new Error(`超时未找到元素: ${selector}`));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    };

    // 延迟函数
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 执行邮编设置流程
    (async () => {
        try {
            // 点击位置选择器
            const locationLink = await waitForElement('#nav-global-location-popover-link');
            locationLink.click();

            // 填写邮编
            const zipInput = await waitForElement('#GLUXZipUpdateInput');
            zipInput.value = zipCode;
            // 触发输入事件
            zipInput.dispatchEvent(new Event('input', { bubbles: true }));

            // 点击更新按钮
            const updateButton = await waitForElement('#GLUXZipUpdate input');
            await delay(200);
            updateButton.click();
            await delay(1300);

            // 点击完成按钮（如果存在）
            try {
                const doneButton = await waitForElement('[name="glowDoneButton"]', 100);
                doneButton.click();
            } catch (e) {
                console.log('未找到完成按钮，可能不需要:', e);
            }

            console.log('邮编设置成功');
        } catch (error) {
            console.error('自动设置邮编失败:', error);
            alert(`设置邮编时出错: ${error.message}\n您可能需要手动设置邮编`);
        }
    })();
}

// 监听特定的POST请求
chrome.webRequest.onCompleted.addListener(
    (details) => {
        // 只处理POST请求
        if (details.method === 'POST') {
            // 向当前激活的标签页发送消息
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'packageDetailLoaded'
                    });
                }
            });
        }
    },
    { urls: ["https://www.dianxiaomi.com/package/detail.htm"] }  // 监控的目标URL
);

// 消息监听部分
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'setupAmazonZipCode') {
        handleTabNavigation(message.url, message.zipCode);
        sendResponse({ status: 'received' });
    }
    else if (message.action === 'getZipCodeEnabled') {
        chrome.storage.sync.get(['zipCodeEnabled'], (result) => {
            sendResponse({ enabled: result.zipCodeEnabled !== false });
        });
        return true; // 保持异步响应
    }
});