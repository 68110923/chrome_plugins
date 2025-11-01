// ==UserScript==
// @name         OVO养鸡场修复工具
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  OVO养鸡场修复工具
// @author       大大怪将军
// @match        https://ovocloud.cc/*
// @match        https://lio.vow.ovodisk.cc/*
// @match        https://yun.ovo.yangjichang.top/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_notification
// @downloadURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/ovo.user.js
// @updateURL https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/ovo.user.js
// ==/UserScript==


(function() {
    'use strict';
    setInterval(loadReplace, 2000);

    function loadReplace() {
        const currentHost = window.location.host;
        const aTags = document.querySelectorAll('a');
        const bugHost = 'speedtest.jhelbt92.tianschool.cn';
        aTags.forEach(tag => {
            if (tag.href.includes(bugHost)) {
                tag.href = tag.href.replace(bugHost, currentHost);
                console.log(`替换a标签href: ${tag.href}`);
            }
        })

        const preTags = document.querySelectorAll('pre');
        preTags.forEach(tag => {
            if (tag.textContent.includes(bugHost)) {
                tag.textContent = tag.textContent.replace(bugHost, currentHost);
                console.log(`替换pre标签文本: ${tag.textContent}`);
            }
        });
    }
})();