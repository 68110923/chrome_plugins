// ==UserScript==
// @name         核价助手 - 店小秘
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  核价助手 - 店小秘
// @author       大大怪将军
// @match        https://www.dianxiaomi.com/web/order/paid?go=m100*
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
    // 重写XMLHttpRequest的send方法来捕获表单数据
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
        // 检查URL是否包含目标路径，并且表单数据包含'&state=paid&'
        if (this._url && (this._url.includes('api/package/list.json') || this._url.includes('api/package/searchPackage.json')) && data && data.toString().includes('&state=paid&')) {
            const originalOnReadyStateChange = this.onreadystatechange;
            this.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    if (originalOnReadyStateChange && typeof originalOnReadyStateChange === 'function') {
                        originalOnReadyStateChange.apply(this, arguments);
                    }
                    console.log('检测到目标请求,开始注入内容');
                    setTimeout(() => {extractAsin()}, 500);
                }
            };
        }
        return originalXhrSend.apply(this, arguments);
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._url = url;
        return originalXhrOpen.apply(this, [method, url, ...args]);
    };

    function extractAsin() {
        let hostMapping = {
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
        };
        // 处理span标签
        document.querySelectorAll('.vxe-table--body-wrapper tr[class="vxe-body--row"]').forEach((element) => {
            const asinElement = element.querySelector('.order-sku__meta a.order-sku__name')
            const asinMatch = asinElement.textContent.trim().match(/(B0[A-Z0-9]{8})/)
            if (!asinMatch) {
                console.log(`未找到ASIN: ${element.textContent.trim()}`);
                return
            }
            const col_country = element.querySelector('.col_13');
            const country = col_country.textContent.trim().match(/「(.*?) 」/)[1];
            const host = hostMapping[country];
            const asin = asinMatch[1];

            // if (!asinElement.textContent.includes(' - 审核助手')) {
            //     asinElement.textContent += ' - 审核助手';
            // }
            asinElement.style.fontWeight = 'bold';
            asinElement.style.color = '#b7a4da';
            asinElement.href=host ? `https://${host}/dp/${asin}?th=1&psc=1` : `未知国家[${country}]请联系脚本作者进行添加`;
            asinElement.onclick = (event) => {
                if (!event.ctrlKey) {
                    event.preventDefault();
                    const order_price = element.querySelector('.order-price__total').textContent.trim()
                    const orderData = {
                        'order_asin': asin,
                        'order_country': country,
                        'order_host': host,
                        'order_link': asinElement.href,
                        'order_price': order_price,
                        'order_price_float': parseFloat(order_price.match(/[\d.]+/)[0]),
                    }
                    floatingOpen(asinElement.href, orderData);
                }
            };
            // console.log(`span标签ASIN: ${asin}, 链接: ${asinElement.href}`);
        });
    }

    // 在悬浮窗口打开链接
    function floatingOpen(url, orderData) {
        console.log('检测到点击ASIN:', orderData);
        const existingModal = document.getElementById('price-assistant-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
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
        // 表体
        const reviewTbody = document.createElement('tbody');
        let tbodyInnerHTML = `
            <style>
                /* 默认样式：指定大小 */
                .sf_img {
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
        `
        let tdNumber = 1
        const rowNumber = 1;
        const colNumber = 10;
        for (let _ = 0; _ < rowNumber; _++) {
            tbodyInnerHTML += '<tr>'
            for (let _ = 0; _ < colNumber; _++) {
                tbodyInnerHTML += `<td id="sf_td_${tdNumber}"></td>`
                tdNumber ++
            }
            tbodyInnerHTML += '</tr>'
        }
        reviewTbody.innerHTML = tbodyInnerHTML
        reviewTable.appendChild(reviewTbody);

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
            if (modal.style.transform === 'translate(-50%, -50%)') {
                const rect = modal.getBoundingClientRect();
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

                modal.style.top = (viewportHeight / 2 - rect.height / 2) + 'px';
                modal.style.left = (viewportWidth / 2 - rect.width / 2) + 'px';
                modal.style.transform = 'none';
            }
            
            isDragging = true;
            dragOffset.x = e.clientX - modal.offsetLeft;
            dragOffset.y = e.clientY - modal.offsetTop;
            modal.style.cursor = 'move';
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
        document.getElementById('sf_td_3').textContent = `订单金额: ${orderData.order_price_float}`;

        fetchAmazonContent(url, contentDiv, titleBar, orderData);

        const reviewSuccessBtn = document.createElement('button');
        reviewSuccessBtn.textContent = '审核通过';
        reviewSuccessBtn.style.backgroundColor = '#4CAF50';
        reviewSuccessBtn.data = orderData;
        reviewSuccessBtn.onclick = handleReviewSuccess;
        reviewSuccessBtn.style.color = 'white';
        reviewSuccessBtn.style.borderRadius = '5px';
        reviewSuccessBtn.style.cursor = 'pointer';
        reviewSuccessBtn.style.fontSize = '15px';
        document.getElementById('sf_td_10').appendChild(reviewSuccessBtn);
    }

    function handleReviewSuccess(event) {
        let orderData = event.target.data
        let remark_text = `${orderData.order_link}\n${orderData.order_asin}\n${orderData.purchase_price_float}`
        copyToClipboard(remark_text)
        alert('该功能尚未开发, 已将商品信息复制到剪贴板, 请手动处理后续流程!!!!');
    }
    
    // 通过后台请求亚马逊页面内容
    function fetchAmazonContent(url, container, titleBar, orderData) {
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
                    titleBar.textContent = '核价助手 - 商品详情';
                    container.innerHTML = '';
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');

                    const iframe = document.createElement('iframe');
                    iframe.id = 'amazon_detail_iframe';
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = 'none';
                    iframe.style.minHeight = '550px';
                    iframe.style.display = 'block';
                    iframe.onload = function() {
                        iframe.contentDocument.open();
                        iframe.contentDocument.write(doc.documentElement.innerHTML);
                        iframe.contentDocument.close();
                    }
                    container.appendChild(iframe);

                    // 添加价格和预计到货日期到页面
                    const sf_td_1_element = document.getElementById('sf_td_1');
                    const sf_td_2_element = document.getElementById('sf_td_2');
                    const sf_td_4_element = document.getElementById('sf_td_4');

                    // 采购价
                    let purchasePriceElement = doc.querySelector(`#apex_offerDisplay_desktop[data-csa-c-asin="${orderData.order_asin}"] .a-offscreen`);
                    // 备用方案: 如果主方案失败, 尝试使用XPath
                    // if (!purchasePriceElement) {
                    //     purchasePriceElement = doc.evaluate(
                    //         ``,
                    //         doc,
                    //         null,
                    //         XPathResult.FIRST_ORDERED_NODE_TYPE,
                    //         null
                    //     ).singleNodeValue;
                    // }
                    if (purchasePriceElement) {
                        const purchase_price_float = parseFloat(purchasePriceElement.textContent.trim().match(/[\d.]+/)[0]);
                        const purchase_total_price_float = (purchase_price_float * 1.064 + 1).toFixed(2);
                        sf_td_1_element.textContent = `采购价: ${purchase_price_float}`;
                        sf_td_2_element.textContent = `采购总成本: ${purchase_total_price_float}`;
                        sf_td_4_element.textContent = `利润: ${(orderData.order_price_float - purchase_total_price_float).toFixed(2)}    利润率: ${((orderData.order_price_float - purchase_total_price_float) / orderData.order_price_float * 100).toFixed(2)}%`;

                        if (orderData.order_price_float > purchase_total_price_float) {
                            sf_td_4_element.style.color = '#4CAF50';
                        } else {
                            sf_td_4_element.style.color = '#d32f2f';
                        }
                        orderData.purchase_price_float = purchase_price_float;
                        orderData.purchase_total_price_float = purchase_total_price_float;
                    } else {
                        sf_td_1_element.style.color = '#d32f2f';
                        sf_td_1_element.textContent = `无法识别采购价,点击跳转至商品详情页`;
                        sf_td_1_element.style.cursor = 'pointer';
                        sf_td_1_element.onclick = function() {
                            window.open(`https://${orderData.order_host}/dp/${orderData.order_asin}`, '_blank');
                        }
                    }
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            },
            onerror: function(error) {
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