// ==UserScript==
// @name         一键下架 - 已售罄 - SHEIN
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  一键下架 - 已售罄 - SHEIN
// @author       大大怪将军
// @match        https://sellerhub.shein.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_notification
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_removed_shelves.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_removed_shelves.user.js
// ==/UserScript==


(function() {
    'use strict';
    const sf_button_num = 1;
    const sf_button_id = `sf-removed-shelves-btn-${sf_button_num}`

    if (window.location.href.includes('/#/spmp/commdities/list')) {
        setTimeout(() => {addButton()}, 500);
    }
    function addButton() {
        if (!document.getElementById(sf_button_id)) {
            const button = document.createElement('button');
            button.id = sf_button_id;
            button.textContent = '一键下架 - 寸草不生';
            button.style.position = 'fixed';
            console.log(`添加按钮${sf_button_num}`);
            button.style.top = `${20 + sf_button_num * 40}px`;
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
        const button_log = document.getElementById(sf_button_id);
        const siteMapping = {
            "法国站": {"site_abbr": "shein-fr", "store_type": 1},
            "西班牙站": {"site_abbr": "shein-es", "store_type": 1},
            "德国站": {"site_abbr": "shein-de", "store_type": 1},
            "意大利站": {"site_abbr": "shein-it", "store_type": 1},
            "荷兰站": {"site_abbr": "shein-nl", "store_type": 1},
            "瑞典站": {"site_abbr": "shein-se", "store_type": 1},
            "波兰站": {"site_abbr": "shein-pl", "store_type": 1},
            "葡萄牙站": {"site_abbr": "shein-pt", "store_type": 1},
            "美国站": {"site_abbr": "shein-us", "store_type": 1}
        };
        const inputSites = prompt("请输入下架的站（逗号分隔）：", "法国站,西班牙站,德国站,意大利站,荷兰站,瑞典站,波兰站,葡萄牙站,美国站");
        if (inputSites === null) {return;}
        const sites = inputSites.split(',')
            .map(item => item.trim())
            .filter(siteName => siteMapping[siteName])
            .map(siteName => siteMapping[siteName]);

        const skcNameList = await getAllSKC(button_log)
        for (let i = 0; i < skcNameList.length; i += 50) {
            button_log.textContent = `正在下架第${i + 1}到${i + 50}个SKC`;
            const batch = skcNameList.slice(i, i + 50);
            await remove(batch, sites);
        }
        button_log.textContent = `已下架${skcNameList.length}个SKC`;
    }
    // 获取全部页数据
     async function getAllSKC(button_log) {
        const allSKC = []
        const pageSize = 100
        let totalPage = 1
        let currentPage = 1

        while (currentPage <= totalPage) {
            button_log.textContent = totalPage === 1 ? `正在读取第${currentPage}页数据` : `正在读取第${currentPage}/${totalPage}页数据`;
            await fetch(`https://sellerhub.shein.com/spmp-api-prefix/spmp/product/list?page_num=${currentPage}&page_size=${pageSize}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "language": "de",
                    "only_recommend_resell": false,
                    "only_spmb_copy_product": false,
                    "search_abandon_product": false,
                    "search_illegal": false,
                    "search_less_inventory": false,
                    "shelf_type": "SOLD_OUT",
                    "sort_type": 1
                })
            })
                .then(async response => {
                    const data = await response.json();
                    allSKC.push(...data.info.data.flatMap(item => item.skc_info_list.map(skc => skc.skc_name)));
                    totalPage = Math.ceil(data.info.meta.count / pageSize);
                })
                .catch(err => console.error(err));
            currentPage++;
        }
        return allSKC;
    }


    // 下架商品
    async function remove(skcNameList, sites) {

        await fetch('https://sellerhub.shein.com/spmp-api-prefix/spmp/product/batch_operate_Shelf_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "shelf_state":2,
                "sites":sites,
                "skc_names":skcNameList
            })
        })
            .then(async response => {
                const data = await response.json();
                if (data.msg === 'OK') {
                    console.log(`下架${skcNameList.length}个SKC成功`);
                } else {
                    console.error(`下架${skcNameList.length}个SKC失败: ${data.info.meta.message}`);
                }
            })
            .catch(err => console.error(err))
    }
})();