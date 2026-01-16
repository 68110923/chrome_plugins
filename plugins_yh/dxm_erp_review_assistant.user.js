// ==UserScript==
// @name         店小秘审单助手 - ERP版
// @namespace    http://tampermonkey.net/
// @version      1.1.8
// @description  1)店小秘自动添加初始备注, 2)Amazon商品数据提取, 3) TikTok商品数据提取, 4) 1688商品数据提取
// @author       大大怪将军
// @match        https://www.dianxiaomi.com/web/order/*
// @match        https://www.amazon.com/*
// @match        https://www.tiktok.com/view/*
// @match        https://www.tiktok.com/shop/*
// @match        https://detail.1688.com/offer/*
// @match        https://www.dianxiaomi.com/dxmCommodityProduct/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://cdn.jsdelivr.net/npm/pinyin-pro@3.27.0/dist/index.min.js
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/dxm_erp_review_assistant.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/dxm_erp_review_assistant.user.js
// ==/UserScript==

(function() {
    'use strict';
    window.pinyinPro = pinyinPro;

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
        const shortcut_keys_q = ['q', 'Q'];
        const shortcut_keys_e = ['e', 'E'];
        const shortcut_keys_c = ['c', 'C'];
        const regularTiktok = document.URL.includes('https://www.tiktok.com/')
        const regularAmazon = document.URL.includes('https://www.amazon.')
        const regular1688 = document.URL.includes('https://detail.1688.com/offer/')
        const regulaDxmCreateProduct = document.URL.includes('https://www.dianxiaomi.com/dxmCommodityProduct/')

        if (e.altKey && [...shortcut_keys_q, ...shortcut_keys_e, ...shortcut_keys_c].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (e.altKey && shortcut_keys_q.includes(e.key) && regularAmazon) {
            extractAmazonNotes();
        } else if (e.altKey && shortcut_keys_q.includes(e.key) && regularTiktok) {
            extractTiktokNotes();
        } else if (e.altKey && shortcut_keys_q.includes(e.key) && regular1688) {
            extract1688Notes();
        } else if (e.altKey && shortcut_keys_e.includes(e.key) && regular1688) {
            extract1688CreateStockInfo();
        } else if (e.altKey && shortcut_keys_e.includes(e.key) && regulaDxmCreateProduct){
            enterStockInfoToDxm()
        } else if (e.altKey && shortcut_keys_c.includes(e.key) && regular1688) {
            createDxmProduct();
        }
    });

    const dxmProductInfoMapping = {
        url: '商品链接',
        productImgUrl: '主图链接',
        urlCode: '商品唯一识别码',
        sku: '型号唯一识别码',
        totalPrice: '总价',
        averagePrice: '均格',
        count: '数量',
        title: '商品标题',
    }

    function enterStockInfoToDxm() {
        const productInfo = GM_getValue('dxmProductInfo');
        if (productInfo) {
            const productName = Object.entries(productInfo).map(([key, value]) => `${dxmProductInfoMapping[key]}: ${value}`).join('\n')
            showToast(`自动输入商品信息:\n\n${productName}`);
        } else {
            showToast('请先到商品详情页提取商品信息!');
        }

        // 商品信息
        document.querySelector('[uid="goodsInfo"]').click();
        // 随机生成仓位
        const storehouse_code = 'A';
        const storehouse_shelves = Math.floor(Math.random() * 15) + 1;
        const storehouse_level = Math.floor(Math.random() * 5) + 1;
        const storehouse_z_y = ['Z', 'Y'][Math.floor(Math.random() * 2)];
        const storehouse_box = Math.floor(Math.random() * 8) + 1;
        const storehouse_position = `${storehouse_code}${storehouse_shelves}_${storehouse_z_y}${storehouse_level}_${storehouse_box}`;

        // 商品SKU
        const skuElement = document.querySelector('input#proSku');
        const skuOriginal = skuElement.value
        const skuStart = skuOriginal.split('-')[0];
        const ozonId = isPureInt(skuStart) ? skuStart : 'unusual';
        skuElement.value = `${ozonId}-${productInfo.urlCode}-A${Date.now().toString().slice(-4)}`;

        document.querySelector('#catagoryFullName').click();
        document.querySelector('[title="家居日用"]').click();

        // 中文名称
        const titleZHElement = document.querySelector('input#proName');
        titleZHElement.value = `${productInfo.title} >> ${productInfo.sku}*1`;

        // 识别码
        const identifierElement = document.querySelector('input#proSbm');
        identifierElement.value = `${skuElement.value}-${storehouse_position}`;

        // 来源URL
        if (document.querySelectorAll('input[name="sourceUrl"]').length < 2) {
            document.querySelector('.addSourceUrl').click();
        }
        const sourceUrlElements = document.querySelectorAll('input[name="sourceUrl"]');
        const sourceUrls = [`https://www.ozon.ru/product/${ozonId}/`, productInfo.url];
        sourceUrls.forEach((sourceUrl, index) => {
            sourceUrlElements[index].value = sourceUrl;
        });

        // 商品分类
        const categoryElement = document.querySelector('#catagoryFullName');
        const category = categoryElement.textContent;

        document.querySelector('[uid="logisticsPackaging"]').click();

        // 报关中文名
        const customNameZhElement = document.querySelector('input#nameCn');
        customNameZhElement.value = category;

        // 报关英文名
        const customNameEnElement = document.querySelector('input#nameEn');
        customNameEnElement.value = 'necessary'
            // customNameEnElement.value = pinyinPro.convert(category, {
        //     toneType: 'none',
        //     type: 'pinyin',
        //     letterCase: 'firstUpper'
        // });
        console.log(customNameEnElement.value)

        // 申报金额 0.1-1.5
        const declarePriceElement = document.querySelector('input#cusPrice');
        declarePriceElement.value = (Math.random() * (1.5 - 0.1) + 0.1).toFixed(2);

        // 申报重量 15-35 克
        const declareWeightElement = document.querySelector('input#cusWeight');
        declareWeightElement.value = (Math.random() * (35 - 15) + 15).toFixed(2);

        // 质检与供货
        document.querySelector('[uid="qualityInspectionSupply"]').click();

        // 采购参考价
        const purchasePriceElement = document.querySelector('input#proPrice');
        purchasePriceElement.value = productInfo.averagePrice;
    }

    function createDxmProduct(){
        alert('alt+c 是直接创建库存商品功能, 暂未开发, 需要等手动创建商品稳定了再考虑开发该功能');
    }

    function extract1688CreateStockInfo() {
        const urlMatch = document.URL.match(/https:\/\/detail\.1688\.com\/offer\/(\d+)\.html/);
        const totalPrice = get1688TotalPrice();

        const skuAndCount = get1688ProductSku();
        if (!skuAndCount || skuAndCount.split(',').length > 1) {showToast('请先选择商品型号和数量, 不能同时选择多个型号');return;}
        const lastStarIndex = skuAndCount.lastIndexOf('*');
        const [sku, count] = lastStarIndex === -1 ? [skuAndCount, ''] : [skuAndCount.slice(0, lastStarIndex), skuAndCount.slice(lastStarIndex + 1)];

        const titleElement = document.querySelector('.title-content h1') || document.querySelector('[class="title-text"]');
        const title = titleElement ? titleElement.textContent.trim() : null;
        if (!title) {showToast('提取商品标题失败, 请发网页截图和链接给IT修复插件');return;}

        // const productImgElement1 = document.querySelector('.detail-gallery-img[ind="0"]');    // 我自己账号登录的
        // const productImgElement2 = document.querySelector('.od-scroller-list .v-image-cover');    // 测试账号登陆的
        // let productImgUrl = null;
        // if (productImgElement1) {
        //     productImgUrl = productImgElement1.getAttribute('src');
        // } else if (productImgElement2) {
        //     // background-image: url(&quot;https://cbu01.alicdn.com/img/ibank/O1CN01xcxV041u4ijrgljvv_!!4214345984-0-cib.jpg_b.jpg&quot;);
        //     productImgUrl = productImgElement2.getAttribute('style').match(/background-image: url.*?(https:.*?)"/)[1];
        // } else {showToast('提取商品图片失败, 请发网页截图和链接给IT修复插件');return;}

        const dxmProductInfo = {
            // productImgUrl: productImgUrl,   // 不需要图片
            url: urlMatch[0],
            title: title,
            urlCode: urlMatch[1],
            sku: sku,
            count: count,
            totalPrice: totalPrice,
            averagePrice: (parseFloat(totalPrice) / parseInt(count)).toFixed(2),
        }
        GM_setValue('dxmProductInfo', dxmProductInfo);
        showToast(Object.entries(dxmProductInfo).map(([key, value]) => `${dxmProductInfoMapping[key]}: ${value}`).join('\n'));
    }

    function get1688TotalPrice() {
        const priceElements = Object.values({
            '常规': document.querySelector('#submitOrder .total-price > strong'),
            'https://detail.1688.com/offer/927463287246.html': document.querySelector('.gyp-order-price-text'),
            'https://detail.1688.com/offer/746259328464.html': document.querySelector('.total-price > div > .value'),
            'https://detail.1688.com/offer/735420835508.html': document.querySelector('.list-bar > [class="float-left"]:nth-of-type(2) > .num'),
        }).filter(Boolean)
        console.log(priceElements)
        const price = priceElements.length > 0 ? priceElements[0].textContent.trim().match(/[0-9.]+/)[0].trim() : 0;

        const freightElements = Object.values({
            '常规': document.querySelector('#submitOrder .total-freight-fee .currency'),
            'https://detail.1688.com/offer/927463287246.html': document.querySelector('.delivery-box > span > span'),
            'https://detail.1688.com/offer/746259328464.html': document.querySelector('.postage-value > .value'),
            'https://detail.1688.com/offer/735420835508.html': document.querySelector('.delivery-info .delivery-value'),
        }).filter(Boolean)
        const freight = freightElements.length > 0 ? freightElements[0].textContent.trim().match(/[0-9.]+/)[0].trim() : 0;

        return (parseFloat(price) + parseFloat(freight)).toFixed(2);
    }

    function get1688ProductSku(){
        // 常规方案
        const allPropertyElements = document.querySelectorAll('#cartScrollBar > #skuSelection .active > .label-name');
        const allProperty = Array.from(allPropertyElements).map(skuElement => skuElement.textContent.trim()).filter(Boolean);
        const sku2Elements = document.querySelectorAll('#cartScrollBar > #skuSelection input[aria-valuenow]');
        let skuList = Array.from(sku2Elements).map(sku2 => {
            console.log('常规方案')
            const sku2NameElementClosest = sku2.closest('.expand-view-item') || sku2.closest('.ant-table-row');
            const sku2NameElement = sku2NameElementClosest.querySelector('.item-label') || sku2NameElementClosest.querySelector('.gyp-pro-table-title > p')
            if (sku2NameElement){
                const sku2Name = sku2NameElement.getAttribute('title') || sku2NameElement.textContent.trim();
                return `${[...allProperty, sku2Name].filter(Boolean).join('|')}*${sku2.value}`;
            }
        });

        // https://detail.1688.com/offer/927463287246.html
        // https://detail.1688.com/offer/858885203091.html
        if (skuList.filter(Boolean).length === 0) {
            console.log('927463287246')
            const allPropertyElements = document.querySelectorAll('.sku-props-list > .item-selected > .prop-item-text')
            const allProperty = Array.from(allPropertyElements).map(skuElement => skuElement.textContent.trim());
            const countElements = document.querySelectorAll('.sku-list-item:has(input:not([value="0"]))');
            skuList = Array.from(countElements).map(countElement => {
                const subSku = countElement.querySelector('.sku-item-name-text').getAttribute('title');
                const count = countElement.querySelector('input').value;
                return `${allProperty.join('|')}|${subSku}*${count}`
            });
        }

        // https://detail.1688.com/offer/746259328464.html
        if (skuList.filter(Boolean).length === 0) {
            console.log('746259328464')
            const skuFixedElement = document.querySelector('.prop-item-inner-wrapper.active > .prop-name');
            const skuFixedText = skuFixedElement ? skuFixedElement.getAttribute('title').trim() : null;
            const skuElements = document.querySelectorAll('#sku-count-widget-wrapper > .sku-item-wrapper');
            skuList = Array.from(skuElements).map(skuElement => {
                const countElement = skuElement.querySelector('input');
                if (countElement && countElement.value > 0) {
                    const skuName = skuElement.querySelector('.sku-item-name').textContent.trim();
                    return `${[skuFixedText, skuName].filter(Boolean).join('|')}*${countElement.value}`;
                }
            });
        }

        // https://detail.1688.com/offer/735420835508.html
        if (skuList.filter(Boolean).length === 0) {
            console.log('735420835508')
            const skuFixedElements = document.querySelectorAll('.filters > .radio-list li.selected > button');
            const skuFixedText = Array.from(skuFixedElements).map(skuElement => skuElement.getAttribute('title').trim()).join('_');
            const skuElements = document.querySelectorAll('.next-table-lock > .next-table-inner > .next-table-body tr');
            skuList = Array.from(skuElements).map(skuElement => {
                const countElement = skuElement.querySelector('input');
                if (countElement && countElement.value > 0) {
                    const skuName = skuElement.querySelector('td.first').textContent.trim();
                    return `${skuFixedText}|${skuName}*${countElement.value}`;
                }
            });
        }

        // https://detail.1688.com/offer/1008362318683.html 补充:单规格商品
        if (skuList.filter(Boolean).length === 0) {
            console.log('1008362318683')
            const skuElement = document.querySelector('.single-sku-title > .single-sku-item > span:nth-child(2)') || document.querySelector('.industry-pro-sku-selection-props-panel li:nth-child(1) > span:nth-child(2)');
            const skuContentElement = document.querySelector('.single-price-warp .price-title input') || document.querySelector('.gyp-pro-table-only-one-sku .ant-input-number-input-wrap > input');
            if (skuElement && skuContentElement) {
                skuList.push(`${skuElement.textContent.trim()}*${skuContentElement.value}`);
            }
        }
        console.log(skuList);
        return skuList.filter(Boolean).join(',')
    }

    function extract1688Notes() {
        const urlMatch = document.URL.match(/https:\/\/detail\.1688\.com\/offer\/(\d+)\.html/);
        const dataDict = {
            '采购平台': '1688',
            '商品链接': urlMatch ? urlMatch[0] : null,
            '商品标识': get1688ProductSku(),
            '商品价格': get1688TotalPrice(),
        }
        const dataList = Object.entries(dataDict).map(([key, value]) => `  ${key}: ${value}`);
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
            return logoElements.join(',');
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
        // 有型号取型号
        document.querySelectorAll('.ant-modal-content .order-sku__attr').forEach((skuElement) => {
            const subSkuItems = [];
            skuElement.querySelectorAll(':scope > div > div').forEach((subSkuElement) => {
                subSkuItems.push(`${subSkuElement.textContent}`);
            });
            if (subSkuItems.length > 0) {skuSet.add(`${subSkuItems.join('')}:`);}
        });

        if (!skuSet.size) {
            // 无型号取SKU
            document.querySelectorAll('.ant-modal-content .w280 .pointer').forEach((skuElement) => {
                const subSkuItems = [];
                subSkuItems.push(skuElement.textContent.trim());
                if (subSkuItems.length > 0) {skuSet.add(`${subSkuItems.join('')}:`);}
            });
        }
        if (skuSet.size) {
            const inputElements = document.querySelectorAll('textarea[placeholder="请输入内容"]');
            inputElements.forEach((inputElement) => {
                inputElement.value = [...skuSet].join('\n\n') + '\n';}
            );
        }
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

    function isPureInt(str) {
        return /^\d+$/.test(str);
    }

})();