// ==UserScript==
// @name         shein商品列表
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  shein商品列表
// @author       大大怪将军
// @match        https://sellerhub.shein.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_notification
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_test.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_test.user.js
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// ==/UserScript==


(function() {
    'use strict';
    const sf_button_id = 'sf-load-all-btn'

    if (window.location.href.includes('/#/spmp/commdities/list')) {
        console.log(`子脚本开始执行*默认操作添加一个按钮********************************************************************`);
        setTimeout(() => {addButton();}, 2000);
    }

    function addButton() {
        if (!document.getElementById(sf_button_id)) {
            const button = document.createElement('button');
            button.id = sf_button_id;
            button.textContent = '提取全部SKC';
            button.style.position = 'fixed';
            button.style.top = '20px';
            button.style.right = '20px';
            button.style.zIndex = '9999';
            button.style.padding = '10px 20px';
            button.style.backgroundColor = '#febd69';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.onclick = clickButton;
            document.body.appendChild(button);
        }
    }

    async function clickButton() {
        const sf_button_element = document.getElementById(sf_button_id);
        const pageSize = parseInt(document.querySelector('.so-pagination-pagesize span[title]').textContent.match(/\d+/)[0]);
        const totalPages = parseInt(document.querySelector('.so-pagination-links a:nth-last-child(2)').textContent.match(/\d+/)[0]);
        console.log(`pageSize: ${pageSize}, totalPages: ${totalPages}`);

        const allItems = [];
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            sf_button_element.textContent = `提取第${pageNum}页...`;
            const pageData = await postData(pageNum, pageSize);
            allItems.push(...pageData.info.data);
        }
        sf_button_element.textContent = '正在生成Excel...';
        downloadExcel(allItems);
        sf_button_element.textContent = '已提取全部SKC';
        sf_button_element.onclick = () => alert(`已提取全部SKC, 共${allItems.length}条, 请在 下载Excel 中查看`);
    }

    function downloadExcel(items) {
        if (items.length === 0) {
            alert('没有可导出的数据');
            return;
        }
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(items);
        XLSX.utils.book_append_sheet(workbook, worksheet, '数据列表'); // '数据列表'是工作表名称
        const fileName = `商品列表_已上架_${new Date().getTime()}.xlsx`; // 文件名带时间戳
        XLSX.writeFile(workbook, fileName); // SheetJS内置的下载函数
    }


    async function postData(pageNum, pageSize) {
        const response = await fetch(`https://sellerhub.shein.com/spmp-api-prefix/spmp/product/list?page_num=${pageNum}&page_size=${pageSize}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "language": "en",
                "only_recommend_resell": false,
                "only_spmb_copy_product": false,
                "search_abandon_product": false,
                "search_illegal": false,
                "search_less_inventory": false,
                "shelf_type": "ON_SHELF",
                "sort_type": 1
            }),
        })
        return await response.json();
    }


})();