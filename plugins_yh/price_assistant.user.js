// ==UserScript==
// @name         核价助手 - 店小秘
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  核价助手 - 店小秘
// @author       大大怪将军
// @match        https://www.dianxiaomi.com/web/order/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/price_assistant.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/price_assistant.user.js
// ==/UserScript==


(function() {
    'use strict';
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (url.includes('api/package/detail.json')) {
            const originalOnReadyStateChange = this.onreadystatechange;
            this.onreadystatechange = function () {if (this.readyState === 4 && this.status === 200) {
                if (originalOnReadyStateChange && typeof originalOnReadyStateChange === 'function') {originalOnReadyStateChange.apply(this, arguments)}
                setTimeout(() => {extractAsin(this.responseText)}, 100);
            }};
        }
        return originalXhrOpen.apply(this, [method, url, ...args]);
    }

    function extractAsin(responseText) {
        const country = JSON.parse(responseText).data.parentOrder.countryCN;
        let host = {
            '美国': 'www.amazon.com',
            '法国': 'www.amazon.fr',
            '中国': 'www.amazon.cn',
            '德国': 'www.amazon.de',
            '意大利': 'www.amazon.it',
            '西班牙': 'www.amazon.es',
            '日本': 'www.amazon.co.jp',
            '韩国': 'www.amazon.co.kr',
            '土耳其': 'www.amazon.com.tr',
            '波兰': 'www.amazon.pl',
            '荷兰': 'www.amazon.nl',
            '墨西哥': 'www.amazon.com.mx',
            '瑞典': 'www.amazon.se',
        }[country];
        // 处理span标签
        document.querySelectorAll('table.myj-table .order-sku__meta span[class="pointer"]').forEach((element) => {
            const asinMatch = element.textContent.trim().match(/(B0[A-Z0-9]{8})/);
            if (asinMatch) {
                const asin = asinMatch[1];
                const a = document.createElement('a');
                a.textContent = element.textContent;
                a.style = element.style;
                a.style.fontWeight = 'bold';
                a.href=host ? `https://${host}/dp/${asin}?th=1` : `未知国家[${country}]请联系脚本作者进行添加`;
                a.onclick = (event) => {
                    // 仅当未按住 Ctrl 键时阻止默认行为并触发悬浮窗口
                    if (!event.ctrlKey) {
                        event.preventDefault();
                        floatingOpen(a.href);
                    }
                };
                element.replaceWith(a);
                console.log(`span标签ASIN: ${asin}, 链接: ${a.href}`);
            }
        });
    }

    // 在悬浮窗口打开链接
    function floatingOpen(url) {
        // 如果已存在模态框，直接返回
        const existingModal = document.getElementById('price-assistant-modal');
        if (existingModal) return;
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'price-assistant-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = 'white';
        modal.style.border = '2px solid #ccc';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        modal.style.minWidth = '1050px'; // 调整模态框的最小宽度，可根据需要修改这个值
        modal.style.minHeight = '600px';
        modal.style.zIndex = '9999';
        modal.style.overflow = 'hidden';
        
        // 标题栏（用于拖动）
        const titleBar = document.createElement('div');
        titleBar.textContent = '核价助手 - 正在加载商品详情...';
        titleBar.style.padding = '10px';
        titleBar.style.backgroundColor = '#f0f0f0';
        titleBar.style.cursor = 'move';
        titleBar.style.borderBottom = '1px solid #ccc';
        titleBar.style.fontWeight = 'bold';
        
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '5px';
        closeBtn.style.right = '10px';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.color = '#666';
        closeBtn.onclick = () => modal.remove();
        
        // 内容区域
        const contentDiv = document.createElement('div');
        contentDiv.style.width = '100%';
        contentDiv.style.height = '100%';
        contentDiv.style.overflow = 'auto';
        contentDiv.style.padding = '10px';

        // 审核列表
        const reviewTable = document.createElement('table');
        reviewTable.style.width = '100%';
        reviewTable.style.borderCollapse = 'collapse';
        // 表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="border: 1px solid #ccc; padding: 8px;">🚗</th>
                <th style="border: 1px solid #ccc; padding: 8px;">主图</th>
                <th style="border: 1px solid #ccc; padding: 8px;">价格</th>
                <th style="border: 1px solid #ccc; padding: 8px;">颜色</th>
                <th style="border: 1px solid #ccc; padding: 8px;">尺寸</th>
            </tr>
        `;
        reviewTable.appendChild(thead);
        // 表体
        const tbody = document.createElement('tbody');
        tbody.innerHTML = `
            <tr>
                <td style="border: 1px solid #ccc; padding: 8px;">采购</td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="amazon_img"><img class="resizable-img" src='https://m.media-amazon.com/images/I/817S7Vf+gsL._AC_SX395_.jpg' alt="亚马逊主图"></td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="amazon_price">未识别</td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="amazon_color">未识别</td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="amazon_size">未识别</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ccc; padding: 8px;">售出</td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="dxm_img"><img class="resizable-img" src='https://m.media-amazon.com/images/I/817S7Vf+gsL._AC_SX395_.jpg' alt="店小秘图片"></td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="dxm_price">未识别</td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="dxm_color">未识别</td>
                <td style="border: 1px solid #ccc; padding: 8px;" id="dxm_size">未识别</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: black"><button id="review_success">审核通过</button></td>
                <td style="border: 1px solid #ccc; padding: 8px; color: black" id="review_img">暂不支持图片识别</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: black" id="review_price">?</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: black" id="review_color">?</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: black" id="review_size">?</td>
            </tr>
            <style>
                /* 默认样式：指定大小 */
                .resizable-img {
                  width: 30px; /* 初始宽度 */
                  height: 30px; /* 高度自适应 */
                  transition: all 0.3s ease; /* 平滑过渡动画 */
                }
                
                /* 点击后（复选框选中）：显示原始大小 */
                .resizable-img:checked {
                  width: auto; /* 恢复原始宽度 */
                  height: auto; /* 恢复原始高度 */
                  max-width: 90vw; /* 限制最大宽度，避免溢出 */
                  max-height: 90vh; /* 限制最大高度 */
                  position: relative;
                  z-index: 100;
                }
            </style>
        `;
        reviewTable.appendChild(tbody);

        // 加载提示
        const loadingText = document.createElement('div');
        loadingText.textContent = '正在通过后台请求亚马逊页面内容...';
        loadingText.style.textAlign = 'center';
        loadingText.style.padding = '20px';
        loadingText.style.color = '#666';
        contentDiv.appendChild(loadingText);
        
        // 组装模态框
        modal.appendChild(titleBar);
        modal.appendChild(closeBtn);
        modal.appendChild(reviewTable);
        modal.appendChild(contentDiv);
        document.body.appendChild(modal);
        
        // 拖动功能
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        titleBar.onmousedown = (e) => {
            // 移除transform属性并转换为实际的top/left坐标
            if (modal.style.transform === 'translate(-50%, -50%)') {
                const rect = modal.getBoundingClientRect();
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                
                // 计算实际的top/left位置
                modal.style.top = (viewportHeight / 2 - rect.height / 2) + 'px';
                modal.style.left = (viewportWidth / 2 - rect.width / 2) + 'px';
                modal.style.transform = 'none';
            }
            
            isDragging = true;
            dragOffset.x = e.clientX - modal.offsetLeft;
            dragOffset.y = e.clientY - modal.offsetTop;
            modal.style.cursor = 'move';
            
            // 阻止默认事件，防止点击时的意外行为
            e.preventDefault();
        };
        
        document.onmousemove = (e) => {
            if (isDragging) {
                modal.style.left = (e.clientX - dragOffset.x) + 'px';
                modal.style.top = (e.clientY - dragOffset.y) + 'px';
            }
        };
        
        document.onmouseup = () => {
            isDragging = false;
            modal.style.cursor = 'default';
        };
        
        // ESC键关闭
        document.onkeydown = (e) => {
            if (e.key === 'Escape') modal.remove();
        };
        
        // 通过后台请求亚马逊页面内容
        fetchAmazonContent(url, contentDiv, titleBar);
        // 点击审核通过按钮
        document.getElementById('review_success').addEventListener('click', handleReviewSuccess);
    }

    function handleReviewSuccess() {
        copyToClipboard(`${getUrl()}\n${getAsin()}\n${getPrice()}`);
        alert('该功能尚未开发, 已将商品信息复制到剪贴板, 请手动处理后续流程!!!!');
    }
    
    // 通过后台请求亚马逊页面内容
    function fetchAmazonContent(url, container, titleBar) {
        // 使用GM_xmlhttpRequest请求亚马逊页面（油猴脚本专用跨域请求）
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    // 成功获取到HTML内容
                    titleBar.textContent = '核价助手 - 商品详情';
                    
                    // 清空容器并显示HTML内容
                    container.innerHTML = '';
                    
                    // 创建iframe来显示HTML内容
                    const iframe = document.createElement('iframe');
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = 'none';
                    iframe.style.minHeight = '600px'; // 确保有足够的高度
                    iframe.style.display = 'block';
                    
                    // 将HTML内容写入iframe
                    iframe.onload = () => {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        iframeDoc.open();
                        
                        // 预处理HTML内容，确保占满空间
                        const modifiedHtml = response.responseText
                            .replace(/<head>/i, '<head><style>html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; min-height: 100% !important; }</style>');
                        
                        iframeDoc.write(modifiedHtml);
                        iframeDoc.close();

                    };
                    
                    container.appendChild(iframe);
                    console.log('亚马逊页面内容加载成功');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            },
            onerror: function(error) {
                console.error('请求亚马逊页面失败:', error);
                
                // 显示错误信息
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: #d32f2f;">
                        <h3>加载失败</h3>
                        <p>无法获取亚马逊页面内容</p>
                        <p style="font-size: 12px; color: #666;">错误信息: ${error.error || '网络请求失败'}</p>
                        <button onclick="window.open('${url}', '_blank')" style="margin-top: 20px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            在新标签页打开
                        </button>
                    </div>
                `;
                
                titleBar.textContent = '核价助手 - 加载失败';
            },
            ontimeout: function() {
                console.error('请求亚马逊页面超时');
                
                // 显示超时信息
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: #d32f2f;">
                        <h3>请求超时</h3>
                        <p>亚马逊页面请求超时，请检查网络连接</p>
                        <button onclick="window.open('${url}', '_blank')" style="margin-top: 20px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            在新标签页打开
                        </button>
                    </div>
                `;
                
                titleBar.textContent = '核价助手 - 请求超时';
            }
        });
    }

    // 获取价格
    function getPrice() {
        const host = window.location.host;
        let priceXPath = '//*[@id="apex_offerDisplay_desktop"]//*[contains(@class, "a-offscreen")]/text()[1]';
        const priceElement = document.evaluate(priceXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (priceElement && priceElement.textContent) {
            let price = priceElement.textContent.replace(/[^0-9.]/g, '').trim();
            if (['www.amazon.fr', 'www.amazon.de', 'www.amazon.it', 'www.amazon.es'].includes(host) && !price.includes('.')) {
                price = (parseInt(price) / 100).toString();
            }
            return price;
        } else {
            return null; // 如果没有找到价格，返回 null
        }
    }

    // 获取 ASIN
    function getAsin() {
        const asinMatch = window.location.href.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);
        return asinMatch ? asinMatch[2] : null;
    }

    // 获取 URL
    function getUrl() {
        const asin = getAsin();
        return asin ? `https://${window.location.host}/dp/${asin}?th=1&psc=1` : null;
    }

    // 复制到剪贴板
    function copyToClipboard(text) {
        return navigator.clipboard.writeText(text).then(() => {
            alert(`成功复制到剪贴板！\n\n${text}`);
        }).catch(err => {
            console.error('无法复制文本: ', err);
            alert('复制失败，请检查浏览器控制台获取更多信息。');
        });
    }

})();