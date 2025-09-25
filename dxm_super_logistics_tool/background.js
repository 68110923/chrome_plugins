// 后台服务工作线程，用于监控网络请求

// 监听搜索订单的POST请求
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    // 只处理目标URL的POST请求
    if (details.method === 'POST' && details.url === 'https://www.dianxiaomi.com/package/searchPackage.htm') {
      try {
        // 发送消息给内容脚本，通知有新的响应
        await chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'SEARCH_PACKAGE_RESPONSE_AVAILABLE',
              requestId: details.requestId,
              url: details.url,
              timestamp: details.timeStamp
            });
          }
        });
      } catch (error) {
        console.error('监控搜索订单请求时出错:', error);
      }
    }
  },
  {
    urls: ['https://www.dianxiaomi.com/package/searchPackage.htm']
  }
);

// 监听内容脚本请求获取响应内容
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SEARCH_PACKAGE_RESPONSE') {
    // 由于Web Extension API限制，我们不能直接获取请求的响应体
    // 所以需要采用另一种方式：让内容脚本重新请求数据
    sendResponse({
      status: 'success',
      message: '请使用content script中的fetchRequest函数重新发起请求获取完整响应'
    });
    return true; // 保持消息通道开放
  }
});

// 添加HTTP请求代理功能
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROXY_HTTP_REQUEST') {
    // 从消息中获取请求信息
    const { url, method, headers, body } = message.request;
    
    // 构建请求选项
    const options = {
      method: 'POST',
      headers: headers || {},
      body: body || null
    };
    
    // 发起请求
    fetch(url, options)
      .then(response => {
        // 获取响应头
        const responseHeaders = {};
        for (const [key, value] of response.headers.entries()) {
          responseHeaders[key] = value;
        }
        
        // 尝试解析JSON响应
        return Promise.all([
          response.text(), // 获取响应文本
          Promise.resolve(response.status), // 获取状态码
          Promise.resolve(responseHeaders) // 获取响应头
        ]);
      })
      .then(([responseBody, status, headers]) => {
        try {
          // 尝试将响应文本解析为JSON
          const parsedBody = JSON.parse(responseBody);
          sendResponse({
            success: true,
            status: status,
            headers: headers,
            body: parsedBody
          });
        } catch (e) {
          // 如果不是有效的JSON，返回原始文本
          sendResponse({
            success: true,
            status: status,
            headers: headers,
            body: responseBody
          });
        }
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    
    return true; // 保持消息通道开放
  }
});

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('店小秘一键发物流插件已安装');
});