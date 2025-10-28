// ==UserScript==
// @name         提取品牌词 - 店小秘 - 产品 - shein采集想
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  点击按钮提取标题中的品牌词并复制
// @author       刘根生
// @match        https://www.dianxiaomi.com/web/sheinProduct/draft*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/blob/main/plugins_yh/extract_brand_words.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/blob/main/plugins_yh/extract_brand_words.user.js
// ==/UserScript==


// 注入按钮和文本框的样式
GM_addStyle(`
    .extract-btn {
        position: fixed !important;
        top: 20px;
        right: 20px;
        z-index: 9999 !important;
        padding: 10px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .extract-btn:hover {
        background: #45a049;
    }
    .copy-textarea {
        position: fixed !important;
        top: -1000px !important;
        left: -1000px !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
`);

(function() {
    'use strict';

    // 创建并添加提取按钮
    function addExtractButton() {
        const btn = document.createElement('button');
        btn.className = 'extract-btn';
        btn.textContent = '提取品牌词并复制';
        btn.onclick = runExtract; // 点击按钮时执行提取逻辑
        document.body.appendChild(btn);
    }

    // 核心提取逻辑
    function runExtract() {
        // 查找元素
        const elements = document.querySelectorAll('.white-space');
        if (elements.length === 0) {
            alert('未找到.white-space元素，请确认页面已加载完成');
            return;
        }

        // 提取第一个单词
        const firstWords = [];
        elements.forEach(el => {
            const text = el.textContent.trim();
            const firstWord = text.split(/\s+/)[0];
            if (firstWord) firstWords.push(firstWord);
        });

        // 去重
        const uniqueWords = [...new Set(firstWords)];
        const result = uniqueWords.join('\n');

        // 复制到剪贴板
        let textarea = document.querySelector('.copy-textarea');
        if (!textarea) {
            textarea = document.createElement('textarea');
            textarea.className = 'copy-textarea';
            document.body.appendChild(textarea);
        }
        textarea.value = result;
        textarea.select();
        document.execCommand('copy');

        alert(`已提取 ${uniqueWords.length} 个品牌词，已复制到剪贴板`);
    }

    // 页面加载完成后添加按钮（避免过早注入）
    window.addEventListener('load', () => {
        setTimeout(addExtractButton, 1000); // 延迟1秒添加按钮，确保页面结构稳定
    });
})();