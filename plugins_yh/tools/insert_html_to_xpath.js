/**
 * 创建并插入HTML内容到指定XPath位置
 * @param {string} xpath - 目标父元素的XPath
 * @param {number} position - 插入位置（0：第一个，-1：最后一个，其他数字：对应索引）
 * @param {string} html - 要插入的HTML字符串（可包含class、onclick等属性）
 * @returns {HTMLElement|null} 插入的元素（失败返回null）
 * 用法：
 * insertHtmlToXPath('//div[@id="container"]', 0, '<button class="extract-btn" onclick="extractBrandWords()">提取品牌</button>');
 */
function insertHtmlToXPath(xpath, position, html) {
    try {
        // 1. 通过XPath获取父元素
        const parent = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        if (!parent) {
            console.error('未找到XPath对应的父元素:', xpath);
            return null;
        }

        // 2. 创建临时容器解析HTML
        const temp = document.createElement('div');
        temp.innerHTML = html.trim(); // 解析HTML字符串
        const newElement = temp.firstElementChild; // 获取解析后的元素

        if (!newElement) {
            console.error('HTML字符串解析失败，未找到有效元素:', html);
            return null;
        }

        // 3. 处理插入位置
        const children = Array.from(parent.children);
        const insertPos = position === -1 ? children.length : position;
        const validPos = Math.max(0, Math.min(insertPos, children.length)); // 边界修正

        // 4. 插入元素
        if (validPos === children.length) {
            parent.appendChild(newElement); // 插入到最后
        } else {
            parent.insertBefore(newElement, children[validPos]); // 插入到指定位置
        }

        console.log(`HTML已插入到XPath: ${xpath} 的第 ${validPos} 个位置`);
        return newElement;
    } catch (error) {
        console.error('插入HTML失败:', error);
        return null;
    }
}

