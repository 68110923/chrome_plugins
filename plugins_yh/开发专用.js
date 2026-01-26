// ==UserScript==
// @name         开发
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  开发专用连接脚本
// @match        *://*/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_addElement
// @grant        GM_log
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_getValues
// @grant        GM_deleteValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_setClipboard
// @grant        GM_getClipboard
// @grant        GM_openInTab
// @grant        GM_getTabs
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_unregisterMenuCommand
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @homepageURL  https://68110923.github.io/
// @icon64       data:image/svg+xml;base64,PHN2ZyB0PSIxNzY5Mzk0MDkyNTEwIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijg2OTUiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNNTA1LjA4OCA1MTMuMTI2NG0tNDUwLjgxNiAwYTQ1MC44MTYgNDUwLjgxNiAwIDEgMCA5MDEuNjMyIDAgNDUwLjgxNiA0NTAuODE2IDAgMSAwLTkwMS42MzIgMFoiIGZpbGw9IiNDNjVFREIiIHAtaWQ9Ijg2OTYiPjwvcGF0aD48cGF0aCBkPSJNNDQ0LjcyMzIgNDIwLjMwMDhoMTE4LjczMjhWNDcyLjU3Nkg0NDQuNzIzMnoiIGZpbGw9IiNGRkZGRkYiIHAtaWQ9Ijg2OTciPjwvcGF0aD48cGF0aCBkPSJNMzgyLjMxMDQgNDE1LjIzMnYtNi40NTEyYzAtMjguMDU3NiAyMi44MzUyLTUwLjg5MjggNTAuODkyOC01MC44OTI4aDE0MS43NzI4YzI4LjA1NzYgMCA1MC44OTI4IDIyLjgzNTIgNTAuODkyOCA1MC44OTI4djYuNDUxMmgxNzQuNzQ1NlYzMzUuMjU3NmMwLTM4LjA0MTYtMzAuODczNi02OC45MTUyLTY4LjkxNTItNjguOTE1MkgyNzguMTE4NGMtMzguMDQxNiAwLTY4LjkxNTIgMzAuODczNi02OC45MTUyIDY4LjkxNTJWNDE1LjIzMmgxNzMuMTA3MnoiIGZpbGw9IiNCRDUwRDMiIHAtaWQ9Ijg2OTgiPjwvcGF0aD48cGF0aCBkPSJNNjI1Ljg2ODggNDc3LjY0NDh2Ni40NTEyYzAgMjguMDU3Ni0yMi44MzUyIDUwLjg5MjgtNTAuODkyOCA1MC44OTI4SDQzMy4yMDMyYy0yOC4wNTc2IDAtNTAuODkyOC0yMi44MzUyLTUwLjg5MjgtNTAuODkyOHYtNi40NTEySDIwOS4yMDMydjIxOS4yODk2YzAgMzguMDQxNiAzMC44NzM2IDY4LjkxNTIgNjguOTE1MiA2OC45MTUyaDQ1My41Mjk2YzM4LjA0MTYgMCA2OC45MTUyLTMwLjg3MzYgNjguOTE1Mi02OC45MTUyVjQ3Ny42NDQ4aC0xNzQuNjk0NHpNNzMxLjY0OCAyNjYuMzQyNEgyNzguMTE4NGMtMzguMDQxNiAwLTY4LjkxNTIgMzAuODczNi02OC45MTUyIDY4LjkxNTJWNDE1LjIzMmgxNzMuMTA3MnYtNi40NTEyYzAtMjguMDU3NiAyMi44MzUyLTUwLjg5MjggNTAuODkyOC01MC44OTI4aDE0MS43NzI4YzI4LjA1NzYgMCA1MC44OTI4IDIyLjgzNTIgNTAuODkyOCA1MC44OTI4djYuNDUxMmgxNjMuMzc5MmE0NTIuNjg5OTIgNDUyLjY4OTkyIDAgMCAwIDguNzU1Mi05OC42NjI0Yy04LjE5Mi0yOC45NzkyLTM0Ljc2NDgtNTAuMjI3Mi02Ni4zNTUyLTUwLjIyNzJ6IiBmaWxsPSIjRkZGRkZGIiBwLWlkPSI4Njk5Ij48L3BhdGg+PC9zdmc+
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @require      https://cdn.jsdelivr.net/npm/pinyin-pro@3.27.0/dist/index.min.js
// @require      file:///C:\Users\admin\WebstormProjects\chrome_plugins\plugins_yh\dxm_erp_review_assistant.user.js
// ==/UserScript==
console.log('主脚本已执行');