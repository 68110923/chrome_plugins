// ==UserScript==
// @name         shein商品列表
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  shein商品列表
// @author       大大怪将军
// @match        https://sellerhub.shein.com/#/spmp/commdities/list
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_notification
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_test.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_test.user.js
// ==/UserScript==


(function() {
    'use strict';
    // 监听 fetch 请求
    console.log(`子脚本开始执行*默认操作添加一个按钮********************************************************************`);
    setTimeout(() => {addButton();}, 2000);
    const sf_button_id = 'sf-load-all-btn'

    function addButton() {
        // 创建加载按钮
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
        // const totalPages = parseInt(document.querySelector('.so-pagination-links a:nth-last-child(2)').textContent.match(/\d+/)[0]);
        const totalPages = 1    // totalPages 测试用，实际应该把上面这一行取消注释
        console.log(`pageSize: ${pageSize}, totalPages: ${totalPages}`);
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            sf_button_element.textContent = `提取第${pageNum}页...`;
            const pageData = await postData(pageNum, pageSize);


            // 下面可以处理 pageData，例如提取 spu_name
            pageData.info.data.forEach(item => {
                console.log(`spu_name: ${item['spu_name']}`);
            })
            console.log(`pageData: ${JSON.stringify(pageData)}`);




        }
        sf_button_element.textContent = '提取全部SKC';
        sf_button_element.onclick = () => alert('已经提取完成, 请查看控制台日志');
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