// background.js 完整版（支持读取浏览器Cookie和自定义User-Agent）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_REQUEST') {
        const targetUrl = message.url;
        const urlObj = new URL(targetUrl);

        // 1. 从浏览器获取目标域名的所有Cookie
        chrome.cookies.getAll({ url: targetUrl }, (cookies) => {
            // 格式化Cookie为请求头格式（name=value; name2=value2）
            const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

            // 2. 构造请求头（包含浏览器Cookie、User-Agent等）
            const headers = {
                ...message.headers,
                'Cookie': cookieStr,  // 注入浏览器Cookie
                'User-Agent': message.userAgent,  // 使用页面传递的User-Agent
                'Referer': urlObj.origin,  // 模拟浏览器Referer
                'Accept-Language': 'en-US,en;q=0.9'  // 模拟浏览器语言设置
            };

            // 3. 发起带浏览器环境信息的请求
            fetch(targetUrl, {
                method: message.method || 'POST',
                headers: headers,
                body: message.body,
                mode: 'cors',
                credentials: 'include'  // 保留跨域请求的凭证
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    // 处理可能的非JSON响应
                    return response.json().catch(() => response.text());
                })
                .then(result => {
                    sendResponse({
                        type: 'FETCH_RESPONSE',
                        id: message.id,
                        result: result
                    });
                })
                .catch(error => {
                    sendResponse({
                        type: 'FETCH_ERROR',
                        id: message.id,
                        error: error.message
                    });
                });
        });

        // 告知Chrome需要异步响应
        return true;
    }
});
