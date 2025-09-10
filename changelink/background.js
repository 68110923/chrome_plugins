// 修改 background.js 中的请求头处理部分
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_REQUEST') {
        const targetUrl = message.url;

        // 1. 从浏览器获取目标域名的所有Cookie（包含亚马逊所需的关键Cookie）
        chrome.cookies.getAll({url: targetUrl}, (cookies) => {
            // 格式化Cookie为请求头格式
            const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

            // 2. 构造更贴近真实的请求头
            const headers = {
                ...message.headers,
                'Cookie': cookieStr,
                'User-Agent': message.userAgent,
                // 新增关键请求头
                'Accept': 'text/html,*/*',
                'Accept-Language': navigator.language || 'zh-CN,zh;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'X-Requested-With': 'XMLHttpRequest',
                // 移除可能引起问题的自定义头
                'origin': new URL(targetUrl).origin,
                'referer': message.referer || message.url
            };

            // 3. 发起带浏览器环境信息的请求
            fetch(targetUrl, {
                method: message.method || 'POST',
                headers: headers,
                body: message.body,
                mode: 'cors',
                credentials: 'include',
                // 新增请求优先级设置
                priority: 'high'
            })
                .then(response => {
                    // 处理响应Cookie并写入浏览器
                    const setCookieHeaders = response.headers.get('set-cookie');
                    if (setCookieHeaders) {
                        const urlObj = new URL(targetUrl);
                        setCookieHeaders.split(',').forEach(cookieStr => {
                            const cookieParts = cookieStr.split(';').map(p => p.trim());
                            const [nameValue] = cookieParts;
                            const [name, value] = nameValue.split('=').map(decodeURIComponent);

                            // 解析Cookie参数
                            const cookieParams = {};
                            cookieParts.slice(1).forEach(part => {
                                const [key, val] = part.split('=');
                                cookieParams[key.toLowerCase()] = val || true;
                            });

                            // 设置Cookie到浏览器
                            chrome.cookies.set({
                                url: `${urlObj.protocol}//${urlObj.host}`,
                                name: name,
                                value: value,
                                domain: cookieParams.domain || urlObj.hostname,
                                path: cookieParams.path || '/',
                                secure: cookieParams.secure || urlObj.protocol === 'https:',
                                httpOnly: cookieParams['httponly'] || false,
                                expirationDate: cookieParams.expires ? new Date(cookieParams.expires).getTime() / 1000 : null,
                                sameSite: cookieParams.samesite ? cookieParams.samesite.toLowerCase() : 'Lax'
                            });
                        });
                    }

                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    return response.text().then(text => {
                        try {
                            return JSON.parse(text);
                        } catch {
                            return text;
                        }
                    });
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

        return true;
    }
});