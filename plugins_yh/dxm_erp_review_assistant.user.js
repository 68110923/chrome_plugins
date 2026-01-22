// ==UserScript==
// @name         店小秘审单助手 - ERP版
// @namespace    http://tampermonkey.net/
// @version      1.3.5
// @description  1)店小秘自动添加初始备注, 2)Amazon商品数据提取, 3) TikTok商品数据提取, 4) 1688商品数据提取
// @author       大大怪将军
// @match        https://www.dianxiaomi.com/web/order/*
// @match        https://www.amazon.com/*
// @match        https://www.tiktok.com/view/*
// @match        https://www.tiktok.com/shop/*
// @match        https://detail.1688.com/offer/*
// @match        https://www.dianxiaomi.com/dxmCommodityProduct/*
// @match        https://www.dianxiaomi.com/dxmPurchasingNote/edit.htm*
// @match        https://www.dianxiaomi.com/dxmPurchasePlan/purchasePlan.htm*
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

    // xhr POST触发
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._method = method;
        this._url = url;
        return originalXhrOpen.apply(this, [method, url, ...args]);
    };
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
        if (this._url.includes('api/order/remark/config/getList.json') && this._method === 'POST' && data === 'type=sys_service') {
            setTimeout(() => { autoFillSku()}, 20);
        }
        if (this._url === '/api/dxmCommodityProduct/getProductsOrderPageList.json') {
            const paramDict = Object.fromEntries(new URLSearchParams(data));
            if (!paramDict.searchSelectValue) {setTimeout(() => {copyToClipboard(paramDict.vid.trim())}, 100);}
        }
        if (this._url.includes('/purchasingProposal/getTreeForCreateNoteAddPro.json')) {
            setTimeout(() => {stockMate()}, 100);
        }
        if (this._url.includes('dxmSupplier/getSupplierPage.htm')) {
            setTimeout(() => {procurementPlanMate()}, 100);
        }
        if (this._url.includes('alibabaProduct/getAlibabaSourceUrl.json')) {
            setTimeout(() => {procurementPlan1688SkuMate()}, 1800);
        }

        // 监听response数据
        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = function(...args) {
            if (this._url.includes('h5/mtop.1688.moga.pc.shopcard/1.0/') && document.URL.endsWith('kj_agent_plugin=dxmerp')) {
                GM_setValue('dxmCurrent1688ShopName', JSON.parse(this.responseText).data.model.shopName)
            }

            if (typeof originalOnReadyStateChange === 'function') {
                originalOnReadyStateChange.apply(this, args);
            }
        };
        return originalXhrSend.apply(this, arguments);
    };


    // 按键触发
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
            const isGroup = document.querySelector('#goodsInfo > div:not(.hide) [uid="groupSkuSelect"]')
            if (isGroup) {enterStockInfoToDxmCombination()} else {enterStockInfoToDxm()}
        } else if (e.altKey && shortcut_keys_c.includes(e.key) && regular1688) {
            createDxmProduct();
        }
    });

    function procurementPlan1688SkuMate(){
        const skuStrOri = document.querySelector('#goodsDetailInfo .commodity .no-new-line2:nth-child(2)').textContent.trim()
        const skuStr = skuStrOri.split(' >> ').pop().split('*')[0]
        document.querySelector(`.boxContentMater > [data-value="${skuStr}"]`).click()

    }

    function procurementPlanMate(){
        const dxmCurrent1688ShopName = GM_getValue('dxmCurrent1688ShopName')
        if (!dxmCurrent1688ShopName){return}
        const inputElement = document.querySelector('input#searchValueForChooseSupplier');
        setTimeout(() => {
            inputElement.value = dxmCurrent1688ShopName;
            inputElement.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
            document.querySelector('button#btnSearch').click();
            }, 100
        );
        setTimeout(() => {
            const tempElement = document.querySelector('[class="in-table"] > tbody > tr.content:first-child > td:first-child')
            if (tempElement && tempElement.textContent.trim().includes(dxmCurrent1688ShopName)){
                document.querySelector('[class="in-table"] > tbody > tr.content:first-child > td:nth-child(2) > a').click();
                showToast(`已更换`, undefined, undefined, 'success')
            } else {
                document.querySelector('.open .custom-modal-head a[data-close="modal"]').click();
                showToast(`************ 未识别到符合要求的供货商 ************`, undefined, undefined, 'warning')
            }
        }, 1000);
        GM_deleteValue('dxmCurrent1688ShopName')
    }

    function stockMate(){
        const href = document.querySelector('#pairProductModal.open [uid="name"] a').getAttribute('href').trim();
        document.querySelector('#addFromProModalSkuId').click();
        document.querySelector('#search1688Mode').click();
        document.querySelector('#search1688Mode > [value="0"]').click();
        const inputElement = document.querySelector('#addFromProValue');
        inputElement.value = href.match(/\/(\d+)\.html/)[1]
        inputElement.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        document.querySelector('#btnSelectSearch').click();
        setTimeout(() => {
            const options1Element = document.querySelector('#pairProductModal.open #goodsContent tbody > tr.content > td > a');
            if (options1Element) {
                options1Element.click();
                document.querySelector('#confirmChangeRelationModal [name="changeRelation"][value="1"]').click();
            }
        }, 100);
    }

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

    function enterStockInfoToDxmCombination() {
        const groupSku = []
        const groupElements = document.querySelectorAll('#goodsInfo > div:not(.hide) [uid="groupSkuSelect"] tr')
        if (groupElements.length === 0) {
            showToast('请先添加组合的商品!', undefined,undefined,'error');
            return;
        }
        for (let i = 0; i < groupElements.length; i++) {
            const skuText = groupElements[i].querySelector('.f-black').textContent.replace('SKU：', '')
            const count = groupElements[i].querySelector('input#num').value
            if (!count) {
                showToast(`${skuText} 请输入数量!`, undefined,undefined,'error');
                return;
            }
            const skuDict = {
                sku: skuText,
                code_ori: skuText.split('-')[0],
                code_1688: skuText.split('-')[1],
                code_a: skuText.split('-')[2],
                title: groupElements[i].querySelector('.gray-c').textContent.trim(),
                count: parseInt(groupElements[i].querySelector('input#num').value),
                img: groupElements[i].querySelector('#goodsInfo > div:not(.hide) [uid="groupSkuSelect"] img').getAttribute('src'),
            }
            groupSku.push(skuDict)
        }

        // 商品信息
        document.querySelector('[uid="goodsInfo"]').click();
        // 商品SKU
        const skuElement = document.querySelector('input#proSku');
        skuElement.value = 'ZH-' + groupSku.map(sku => `${sku.code_a}*${sku.count}`).join(',');
        // 商品分类：
        const categorySelectElement = document.querySelector('#catagoryFullName');
        categorySelectElement.click();
        document.querySelector('[title="家居日用"]').click();
        // 中文名称
        const titleZHElement = document.querySelector('input#proName');
        titleZHElement.value = '组合共' + groupSku.reduce((total, item) => total + item.count, 0) + '件';
        titleZHElement.value += ' || ' + groupSku.map(sku => `${sku.title}*${sku.count}`).join(',');
        // 识别码
        const identifierElement = document.querySelector('input#proSbm');
        identifierElement.value = skuElement.value;

        // 来源URL
        const existSourceCount = document.querySelectorAll('input[name="sourceUrl"]').length
        const needsAddSourceCount = groupSku.length - existSourceCount;
        const alsoAddSourceCount = 5 - existSourceCount;
        const addSourceCount = needsAddSourceCount > alsoAddSourceCount ? alsoAddSourceCount : needsAddSourceCount;
        console.log(`需要添加${needsAddSourceCount}个来源URL, 还能添加${alsoAddSourceCount}个, 本次会添加${addSourceCount}个`)
        if (addSourceCount >= 0) {
            for (let i = 0; i < addSourceCount; i++) {document.querySelector('.addSourceUrl').click();}
        } else {
            for (let i = 0; i < -addSourceCount; i++) {document.querySelector('.removeSourceUrl').click();}
        }
        document.querySelectorAll('input[name="sourceUrl"]').forEach((inputElement, index) => {
            inputElement.value = `https://detail.1688.com/offer/${groupSku[index].code_1688}.html`;
        })

        // 添加图片, 默认组合的第一个图片
        // if (parseInt(document.querySelector('#curImgNum').textContent) === 0) {
        //     document.querySelector('[onclick="webUrlModal();"]').click();
        //     document.querySelector('textarea#webImgUrl').value = groupSku.map(sku => sku.img).join('\n');
        //     document.querySelector('button[onclick="addWebUrl();"]').click();
        // }

        // 点击:物流与包装
        const category = categorySelectElement.textContent;
        document.querySelector('[uid="logisticsPackaging"]').click();

        // 报关中文名
        const customNameZhElement = document.querySelector('input#nameCn');
        customNameZhElement.value = category;

        // 报关英文名
        const customNameEnElement = document.querySelector('input#nameEn');
        customNameEnElement.value = 'necessary'

        // 申报金额 0.1-1.5
        const declarePriceElement = document.querySelector('input#cusPrice');
        declarePriceElement.value = (Math.random() * (1.5 - 0.1) + 0.1).toFixed(2);

        // 申报重量 15-35 克
        const declareWeightElement = document.querySelector('input#cusWeight');
        declareWeightElement.value = (Math.random() * (35 - 15) + 15).toFixed(2);

        // 返回首页
        document.querySelector('[uid="goodsInfo"]').click();
        showToast(`组合商品信息已自动录入`, undefined,undefined,'success');
    }

    function enterStockInfoToDxm() {
        const productInfo = GM_getValue('dxmProductInfo');
        if (!productInfo) {
            showToast('请先提取1688详情页信息!', undefined,undefined,'warning');
        }
        // 点击商品信息
        document.querySelector('[uid="goodsInfo"]').click();
        // 商品SKU
        const hiddenInfo = document.querySelector('input#hiddenInfo');
        const dataVid = hiddenInfo.getAttribute('data-vid')
        const skuElement = document.querySelector('input#proSku');
        skuElement.value = `${dataVid}-${productInfo.urlCode}-A${Date.now().toString().slice(-4)}`;

        // 商品分类:
        const categorySelectElement = document.querySelector('#catagoryFullName');
        categorySelectElement.click();
        document.querySelector('[title="家居日用"]').click();

        // 中文名称
        const titleZHElement = document.querySelector('input#proName');
        titleZHElement.value = `${productInfo.title} >> ${productInfo.sku}`;

        // 识别码
        const identifierElement = document.querySelector('input#proSbm');
        identifierElement.value = skuElement.value;

        // 来源URL
        if (document.querySelectorAll('input[name="sourceUrl"]').length < 2) {
            document.querySelector('.addSourceUrl').click();
        }
        const sourceUrlElements = document.querySelectorAll('input[name="sourceUrl"]');
        const sourceUrls = [`https://www.ozon.ru/product/${dataVid}/`, productInfo.url];
        sourceUrls.forEach((sourceUrl, index) => {
            sourceUrlElements[index].value = sourceUrl;
        });

        // 点击物流与包装
        document.querySelector('[uid="logisticsPackaging"]').click();

        // 报关中文名
        const customNameZhElement = document.querySelector('input#nameCn');
        customNameZhElement.value = categorySelectElement.textContent;

        // 报关英文名
        const customNameEnElement = document.querySelector('input#nameEn');
        customNameEnElement.value = 'necessary'
        // customNameEnElement.value = pinyinPro.convert(category, {
        //     toneType: 'none',
        //     type: 'pinyin',
        //     letterCase: 'firstUpper'
        // });

        // 申报金额 0.1-1.5
        const declarePriceElement = document.querySelector('input#cusPrice');
        declarePriceElement.value = (Math.random() * (1.5 - 0.1) + 0.1).toFixed(2);

        // 申报重量 15-35 克
        const declareWeightElement = document.querySelector('input#cusWeight');
        declareWeightElement.value = (Math.random() * (35 - 15) + 15).toFixed(2);

        // 点击质检与供货
        document.querySelector('[uid="qualityInspectionSupply"]').click();

        // 采购参考价
        const purchasePriceElement = document.querySelector('input#proPrice');
        purchasePriceElement.value = productInfo.averagePrice;

        // 返回首页
        document.querySelector('[uid="goodsInfo"]').click();
        showToast(`商品信息已自动录入`, undefined,undefined,'success');
        GM_deleteValue('dxmProductInfo');
    }

    function createDxmProduct(){
        alert('alt+c 是直接创建库存商品功能, 暂未开发, 需要等手动创建商品稳定了再考虑开发该功能');
    }

    function extract1688CreateStockInfo() {
        const urlMatch = document.URL.match(/https:\/\/detail\.1688\.com\/offer\/(\d+)\.html/);
        const totalPrice = get1688TotalPrice();

        const skuAndCount = get1688ProductSku();
        if (!skuAndCount || skuAndCount.split(',').length > 1) {showToast('请先选择商品型号和数量, 不能同时选择多个型号', undefined,undefined,'error');return;}
        const lastStarIndex = skuAndCount.lastIndexOf('*');
        const [sku, count] = lastStarIndex === -1 ? [skuAndCount, ''] : [skuAndCount.slice(0, lastStarIndex), skuAndCount.slice(lastStarIndex + 1)];

        const titleElement = document.querySelector('.title-content h1') || document.querySelector('[class="title-text"]');
        const title = titleElement ? titleElement.textContent.trim() : null;
        if (!title) {showToast('提取商品标题失败, 请发网页截图和链接给IT修复插件', undefined,undefined,'error');return;}

        const dxmProductInfo = {
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
        return parseFloat(price).toFixed(2);
    }
    function get1688TotalFreight(){
        const freightElements = Object.values({
            '常规': document.querySelector('#submitOrder .total-freight-fee .currency'),
            'https://detail.1688.com/offer/927463287246.html': document.querySelector('.delivery-box > span > span'),
            'https://detail.1688.com/offer/746259328464.html': document.querySelector('.postage-value > .value'),
            'https://detail.1688.com/offer/735420835508.html': document.querySelector('.delivery-info .delivery-value'),
        }).filter(Boolean)
        const freight = freightElements.length > 0 ? freightElements[0].textContent.trim().match(/[0-9.]+/)[0].trim() : 0;
        return parseFloat(freight).toFixed(2);
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
            '商品价格': get1688TotalPrice() + get1688TotalFreight(),
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
            showToast(text, undefined,undefined,'info');
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

    function showToast(message, animationEffectDuration=150, toastDuration=3000, colorType='info') {
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
        if (colorType === 'success') {
            sfPopUpMessageElement.style.background = `rgba(40,180,99,0.9)`;
            sfPopUpMessageElement.style.color = `rgba(255,255,255)`;
        } else if (colorType === 'error') {
            sfPopUpMessageElement.style.background = `rgba(230,57,57,0.9)`;
            sfPopUpMessageElement.style.color = `rgba(255,255,255)`;
        } else if (colorType === 'warning') {
            sfPopUpMessageElement.style.background = `rgba(255,165,0,0.9)`;
            sfPopUpMessageElement.style.color = `rgba(255,255,255)`;
        } else if (colorType === 'info') {
            sfPopUpMessageElement.style.background = `rgba(0,0,0,0.9)`;
            sfPopUpMessageElement.style.color = `rgba(255,255,255)`;
        }
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