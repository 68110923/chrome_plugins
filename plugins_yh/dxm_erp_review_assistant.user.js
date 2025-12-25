// ==UserScript==
// @name         店小秘审单助手 - ERP版
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  1)店小秘自动添加初始备注, 2)亚马逊商品数据提取
// @author       大大怪将军
// @match        https://www.dianxiaomi.com/web/order/*
// @match        https://www.amazon.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_notification
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/dxm_erp_review_assistant.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/dxm_erp_review_assistant.user.js
// ==/UserScript==


(function() {
    'use strict';
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._method = method;
        this._url = url;
        return originalXhrOpen.apply(this, [method, url, ...args]);
    };

    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
        if (this._url.includes('api/order/remark/config/getList.json') && this._method === 'POST' && data === 'type=sys_service') {
            setTimeout(() => {autoFillSku()}, 20);
        }
        return originalXhrSend.apply(this, arguments);
    };

    document.addEventListener('keydown', (e) => {
        const shortcut_keys = ['q', 'Q'];
        if (e.altKey && shortcut_keys.includes(e.key) && document.URL.match(/https:\/\/www\.amazon\..*?\/[0-9A-Z]{10}/)) {
            extractAmazonNotes();
        } else if (e.altKey && shortcut_keys.includes(e.key) && document.URL.match(/https:\/\/www\.amazon\..*?\/B0[0-9A-Z]{8}/)) {
            extractTiktokNotes();
        }
    });

    function extractAmazonNotes() {
        function amazonGetAsin() {
            const asinMatch = document.URL.match(/\/([A-Z0-9]{10})/);
            return asinMatch ? asinMatch[1] : null;
        }
        function amazonGetUrl() {
            const asin = amazonGetAsin();
            return asin ? `https://${document.location.hostname}/dp/${asin}?th=1&psc=1` : null;
        }
        function amazonGetPrice() {
            const host = document.location.hostname;
            let priceXPaths = [
                '//*[@id="mediamatrix_feature_div"]//*[@class="slot-price"]',
                '//*[@id="apex_offerDisplay_desktop"]//*[contains(@class, "a-offscreen")]',
            ];
            const priceElement = document.evaluate(priceXPaths.join(' | '), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            console.log('价格文本: ', priceElement.textContent)
            let price = priceElement.textContent.match(/[0-9.]+/)[0].trim();
            if (['www.amazon.fr', 'www.amazon.de', 'www.amazon.it', 'www.amazon.es'].includes(host) && !price.includes('.')) {
                price = (parseInt(price) / 100).toString();
            }
            return price;
        }
        function amazonGetDiscount() {
            const discountXpath = [
                '//*[@class="promoPriceBlockMessage"]//*[starts-with(@id, "couponTextpctch")]', // 白色背景绿色字体 勾选的
                // '//*[@class="promoPriceBlockMessage"]//*[starts-with(@id, "greenBadgepctch")]', // 绿色背景褐色字体的
            ]
            const existDiscount = document.evaluate(discountXpath.join(' | '), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
            // return existDiscount ? existDiscount.textContent.match(/[0-9.]+%/)[0].trim() : null;
            return existDiscount ? '有' : null
        }
        const dataInfo = [
            '  采购平台: Amazon',
            `  商品链接: ${amazonGetUrl()}`,
            `  商品标识: ${amazonGetAsin()}`,
            `  商品价格: ${amazonGetPrice()}`,
        ]
        const isAmazonDiscount = amazonGetDiscount();
        if (isAmazonDiscount) {
            dataInfo.push(`  优惠券: ${isAmazonDiscount}`);
        }
        copyToClipboard(dataInfo.join('\n'));
    }


    function extractTiktokNotes() {
        console.log('extractTiktokNotes 执行成功');
    }

    function copyToClipboard(text) {
        return navigator.clipboard.writeText(text).then(() => {
            showToast(text);
        }).catch(err => {
            alert(`复制失败，请联系Tom反馈!!!\n\n错误信息: ${err}, \n链接: ${document.URL}`);
        });
    }

    function autoFillSku(){
        const skuSet = new Set();
        document.querySelectorAll('.ant-modal-content .order-sku__attr').forEach((skuElement) => {
            const subSkuItems = [];
            skuElement.querySelectorAll(':scope > div > div').forEach((subSkuElement) => {
                subSkuItems.push(`${subSkuElement.textContent}`);
            });
            if (subSkuItems.length > 0) {skuSet.add(`${subSkuItems.join('')}:`);}
        });
        if (!skuSet.size) {
            skuSet.add('_:');
        }
        const inputElements = document.querySelectorAll('textarea[placeholder="请输入内容"]');
        inputElements.forEach((inputElement) => {
            inputElement.value = [...skuSet].join('\n\n') + '\n';}
        );
    }

    function showToast(message) {
        GM_addStyle(
            `/* 弹窗提示优化 */
            .sf_pop_up_message {
                position: fixed;
                top: 10px;
                right: 300px;
                padding: 12px 20px;
                background: #1e293b;
                color: #f8fafc;
                border-radius: 6px;
                z-index: 99999;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                font-size: 14px;
                font-weight: 500;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                line-height: 1.5;
                white-space: normal;
                word-wrap: break-word;
            }
            
            /* 弹窗显示状态（通过JS添加此类触发动画） */
            .sf_pop_up_message.show {
                opacity: 1;
                transform: translateX(0);
            }`
        )
        const className = 'sf_pop_up_message';
        const existingToast = document.querySelector(`.${className}`);
        if (existingToast) existingToast.remove();
        const sfPopUpMessageElement = document.createElement("div");
        sfPopUpMessageElement.className = className; // 使用优化后的类名
        sfPopUpMessageElement.innerHTML = message.replace(/\n/g, '<br>');
        document.body.appendChild(sfPopUpMessageElement);
        setTimeout(() => sfPopUpMessageElement.classList.add('show'), 1);
        setTimeout(() => {
            sfPopUpMessageElement.classList.remove('show');
            setTimeout(() => sfPopUpMessageElement.remove(), 1000);
        }, 3000);
    }
})();