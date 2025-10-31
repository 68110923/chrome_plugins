// ==UserScript==
// @name         亚马逊一键加载全部商品
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  点击按钮加载亚马逊所有分页商品到当前页
// @author       大大怪将军
// @match        https://www.amazon.com/s?*
// @match        https://www.amazon.co.uk/s?*
// @match        https://www.amazon.de/s?*
// @match        https://www.amazon.com.mx/s?*
// @grant        none
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/amazon_all_products_on_one_page.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/amazon_all_products_on_one_page.user.js
// ==/UserScript==

(function() {
    'use strict';
    let isLoading = false;
    let totalPages = 1;
    let currentPage = 1;

    // 创建加载按钮
    function createLoadButton() {
        const button = document.createElement('button');
        button.textContent = '加载全部商品';
        button.style.position = 'fixed';
        button.style.top = '20px';
        button.style.right = '20px';
        button.style.zIndex = '9999';
        button.style.padding = '10px 20px';
        button.style.backgroundColor = '#febd69';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.onclick = loadAllPages;
        document.body.appendChild(button);
    }

    // 加载所有分页商品
    function loadAllPages() {
        if (isLoading) return;
        isLoading = true;
        const button = document.querySelector('button');
        button.textContent = '加载中...';
        // 先获取总页数
        const pageLinks = document.querySelectorAll('a.s-pagination-item:not(.s-pagination-next):not(.s-pagination-previous)');
        totalPages = pageLinks.length > 0 ? parseInt(pageLinks[pageLinks.length - 1].textContent) : 1;
        currentPage = 2;
        loadPage(currentPage);
    }

    // 加载指定页商品
    function loadPage(pageNum) {
        if (pageNum > totalPages) {
            const button = document.querySelector('button');
            button.textContent = '全部加载完成';
            isLoading = false;
            return;
        }
        const nextPageUrl = new URL(window.location.href);
        nextPageUrl.searchParams.set('page', pageNum);
        fetch(nextPageUrl.href)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const nextItems = doc.querySelectorAll('div.s-result-item');
                if (nextItems.length > 0) {
                    const container = document.querySelector('div.s-main-slot');
                    nextItems.forEach(item => {
                        container.appendChild(item);
                    });
                    const button = document.querySelector('button');
                    button.textContent = `已加载第${pageNum}/${totalPages}页`;
                    currentPage++;
                    loadPage(currentPage);
                }
            })
            .catch(error => {
                console.error('加载失败:', error);
                isLoading = false;
            });
    }

    createLoadButton();
})();