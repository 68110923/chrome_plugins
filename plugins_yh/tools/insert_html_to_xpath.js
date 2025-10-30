/**
 * 插入HTML并绑定事件
 * @param {string} xpath - 父元素XPath
 * @param {number} position - 插入位置
 * @param {string} html - 插入的HTML字符串
 * @param {Function} onClick - 点击事件回调（可选）
 * @returns {HTMLElement|null} 插入的元素
 */
function insertHtmlToXPath(xpath, position, html, onClick = null) {
    try {
        // 1. 获取父元素
        const parent = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        if (!parent) {
            console.error('未找到父元素:', xpath);
            return null;
        }

        // 2. 解析HTML
        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        const newElement = temp.firstElementChild;
        if (!newElement) {
            console.error('HTML解析失败:', html);
            return null;
        }

        // 3. 绑定点击事件（关键：用JS绑定，避开沙箱问题）
        if (typeof onClick === 'function') {
            newElement.addEventListener('click', onClick);
        }

        // 4. 插入元素
        const children = Array.from(parent.children);
        const insertPos = position === -1 ? children.length : position;
        const validPos = Math.max(0, Math.min(insertPos, children.length));
        validPos === children.length
            ? parent.appendChild(newElement)
            : parent.insertBefore(newElement, children[validPos]);

        return newElement;
    } catch (error) {
        console.error('插入失败:', error);
        return null;
    }
}