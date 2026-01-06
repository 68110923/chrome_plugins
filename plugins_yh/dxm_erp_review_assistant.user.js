// ==UserScript==
// @name         店小秘审单助手 - ERP版
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  1)店小秘自动添加初始备注, 2)Amazon商品数据提取, 3) TikTok商品数据提取, 4) 1688商品数据提取
// @author       大大怪将军
// @match        https://www.dianxiaomi.com/web/order/*
// @match        https://www.amazon.com/*
// @match        https://www.tiktok.com/view/*
// @match        https://www.tiktok.com/shop/*
// @match        https://detail.1688.com/offer/*
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
        } else if (e.altKey && shortcut_keys.includes(e.key) && document.URL.match(/https:\/\/www\.tiktok\.com\/.*?\//)) {
            extractTiktokNotes();
        } else if (e.altKey && shortcut_keys.includes(e.key) && document.URL.match(/https:\/\/detail\.1688\.com\/offer\/\d+\.html/)) {
            extract1688Notes();
        }
    });

    function extract1688Notes() {
        const urlMatch = document.URL.match(/https:\/\/detail\.1688\.com\/offer\/(\d+)\.html/);
        const priceElement = document.querySelector('.total-price > strong');
        const price = priceElement ? priceElement.textContent.trim().match(/[0-9.]+/)[0].trim() : null;
        const specification1 = document.querySelector('#cartScrollBar > #skuSelection .active > .label-name');
        const specification1Name = specification1 ? specification1.textContent.trim() : null;
        const specification2s = document.querySelectorAll('#cartScrollBar > #skuSelection input[aria-valuenow]');
        const specificationLis = Array.from(specification2s).map(specification2 => {
            const specification2Name = specification2.closest('.expand-view-item').querySelector('.item-label').getAttribute('title').trim();
            const skuName = [specification1Name, specification2Name].filter(Boolean).join('|');
            return `${skuName}*${specification2.value}`;
        });
        console.log(specificationLis);
        const dataDict = {
            '  采购平台': '1688',
            '  商品链接': urlMatch ? urlMatch[0] : null,
            '  商品标识': specificationLis.join(','),
            '  商品价格': price,
        }
        const dataList = Object.entries(dataDict).map(([key, value]) => `${key}: ${value}`);
        copyToClipboard(dataList.join('\n'));
    }

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
        const dataDict = {
            '  采购平台': 'Amazon',
            '  商品链接': amazonGetUrl(),
            '  商品标识': amazonGetAsin(),
            '  商品价格': amazonGetPrice(),
        }
        const isAmazonDiscount = amazonGetDiscount();
        if (isAmazonDiscount) {
            dataDict['  优惠券'] = isAmazonDiscount;
        }
        const dataList = Object.entries(dataDict).map(([key, value]) => `${key}: ${value}`);
        copyToClipboard(dataList.join('\n'));
    }

    function extractTiktokNotes() {
        function tiktokGetUrl() {
            const urlObj = new URL(document.URL);
            let productId = urlObj.searchParams.get('product_id');
            if (!productId) {
                productId = urlObj.pathname.match(/\d{16,20}/)[0];
            }
            return `https://www.tiktok.com/view/product/${productId}`;
        }
        function tiktokGetLogo() {
            // 购买页面的商品标识
            let logoElement = document.querySelector('[class^="index-goods__specification--"]');
            if (logoElement) {
                return logoElement.textContent.trim();
            }

            // 商品详情页面的商品标识
            const logoElements = [...document.querySelectorAll('div.border-color-UIShapeNeutral > span')].map((element) => element.textContent.trim());
            return logoElements.join(', ');
        }
        function tiktokGetPrice() {
            // 购买页面的商品价格
            let priceElement = document.querySelector('[class^="index-goods__price__real--"]');
            if (priceElement) {
                return priceElement.textContent.trim();
            }
            // 商品详情页面的商品价格
            priceElement = document.querySelector('div.items-baseline > .items-baseline');
            if (priceElement) {
                return priceElement.textContent.trim().match(/[0-9.]+/)[0].trim();
            }
        }
        const dataDict = {
            '  采购平台': 'TikTok',
            '  商品链接': tiktokGetUrl(),
            '  商品标识': tiktokGetLogo(),
            '  商品价格': tiktokGetPrice(),
        }
        const dataList = Object.entries(dataDict).map(([key, value]) => `${key}: ${value}`);
        copyToClipboard(dataList.join('\n'));
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

    function showToast(message, animationEffectDuration=150, toastDuration=3000) {
        GM_addStyle(
            `/* 弹窗提示优化 */
            .sf_pop_up_message {
                position: fixed;
                top: 1%;
                right: 2%;
                padding: 12px 20px;
                box-shadow: 0 4px 20px rgba(50, 50, 80, 0.15);
                border-radius: 6px;
                z-index: 99999;
                font-size: 14px;
                font-weight: 500;
                opacity: 0;
                transform: translateX(100%);
                transition: all ${animationEffectDuration/1000}s cubic-bezier(0.4, 0, 0.2, 1);
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
        const sfPopUpMessageElement = document.createElement("div");
        // 随机弹窗和字体颜色
        // sfPopUpMessageElement.style.background = `rgba(${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)})`;
        // sfPopUpMessageElement.style.color = `rgba(${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)}, 0.95)`;
        // 白底黑字
        // sfPopUpMessageElement.style.background = `rgba(255,255,255,0.9)`;
        // sfPopUpMessageElement.style.color = `rgba(0,0,0)`;
        // 黑底白字
        sfPopUpMessageElement.style.background = `rgba(0,0,0,0.9)`;
        sfPopUpMessageElement.style.color = `rgba(255,255,255)`;
        sfPopUpMessageElement.className = className;
        sfPopUpMessageElement.innerHTML = message.replace(/\n/g, '<br>');
        document.body.appendChild(sfPopUpMessageElement);
        setTimeout(() => sfPopUpMessageElement.classList.add('show'), 0);
        setTimeout(() => {
            sfPopUpMessageElement.classList.remove('show');
            setTimeout(() => sfPopUpMessageElement.remove(), animationEffectDuration);
        }, toastDuration);
    }
})();