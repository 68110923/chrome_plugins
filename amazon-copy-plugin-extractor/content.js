function createFloatingButtonGroup() {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = "button-group";
    buttonGroup.style.position = 'fixed'; // 设置位置为固定
    buttonGroup.style.right = localStorage.getItem('buttonRight') || '-35px'; // 从本地存储获取右侧位置
    buttonGroup.style.bottom = localStorage.getItem('buttonBottom') || '20px'; // 从本地存储获取底部位置
    buttonGroup.style.zIndex = '9999'; // 设置层级
    buttonGroup.style.display = 'flex'; // 使用 flexbox
    buttonGroup.style.flexDirection = 'column'; // 垂直排列
    buttonGroup.style.alignItems = 'flex-start'; // 左对齐

    // 创建按钮数组，设置不同的默认颜色
    const buttons = [
        { content: '🚀 标准提取', action: () => handleExtraction(false), color: '#ef9013' }, // 橙色
        { content: '📋 简易提取', action: () => handleExtraction(true), color: '#054bcd' }  // 蓝色
    ];

    // 生成按钮并添加到按钮组
    buttons.forEach((btn, index) => {
        const button = createButton(btn.content, index, btn.action, btn.color);
        buttonGroup.appendChild(button);
    });

    document.body.appendChild(buttonGroup);

    // 拖动功能
    initializeDrag(buttonGroup);

    // 添加快捷键监听
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            if (['q', 'Q'].includes(e.key)) {
                e.preventDefault(); // 阻止默认行为
                handleExtraction(false); // 标准提取
            } else if (['w', 'W'].includes(e.key)) {
                e.preventDefault(); // 阻止默认行为
                handleExtraction(true); // 简易提取
            }
        }
    });
}

function createButton(content, index, action, backgroundColor) {
    const button = document.createElement('button');
    button.className = "floating-button";
    button.type = "button";
    button.id = `amazon-price-extractor-btn-${index}`;

    // 设置按钮样式
    button.style.backgroundColor = backgroundColor;  // 使用传入的背景颜色
    button.style.color = 'white'; // 按钮文本颜色
    button.style.border = 'none'; // 去除按钮边框
    button.style.borderRadius = '5px'; // 设置按钮圆角
    button.style.padding = '8px 12px'; // 按钮内边距
    button.style.fontSize = '12px'; // 按钮文本字体大小
    button.style.cursor = 'pointer'; // 鼠标悬停时显示为手形
    button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'; // 添加阴影效果
    button.style.marginBottom = '5px'; // 按钮间距
    button.style.transition = 'transform 0.3s, background-color 0.3s'; // 添加过渡效果

    button.textContent = content;

    // 悬停效果
    button.onmouseover = () => {
        button.style.backgroundColor = lightenColor(backgroundColor, 0.3); // 悬停时变淡
        button.style.transform = 'translateX(-38px)'; // 向左移动 10px
    };
    button.onmouseout = () => {
        button.style.backgroundColor = backgroundColor; // 恢复默认颜色
        button.style.transform = 'translateX(0)'; // 恢复到原位
    };

    button.addEventListener('click', action);
    return button;
}

// 变淡颜色的函数
function lightenColor(color, amount) {
    const hex = color.replace(/^#/, '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + Math.round(255 * amount));
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + Math.round(255 * amount));
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + Math.round(255 * amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 初始化拖动功能
function initializeDrag(buttonGroup) {
    let isDragging = false;
    let startY;

    buttonGroup.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        buttonGroup.style.transition = 'none';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        buttonGroup.style.transition = 'transform 0.3s';
        localStorage.setItem('buttonRight', buttonGroup.style.right);
        localStorage.setItem('buttonBottom', buttonGroup.style.bottom);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaY = e.clientY - startY;
            const newBottom = Math.max(0, parseInt(buttonGroup.style.bottom) - deltaY);
            buttonGroup.style.bottom = `${newBottom}px`;
            startY = e.clientY;
        }
    });
}

// 获取价格
function getPrice() {
    const host = window.location.host;
    let priceXPath = '//*[@id="apex_offerDisplay_desktop"]//*[contains(@class, "a-offscreen")]/text()[1]';
    const priceElement = document.evaluate(priceXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

    if (priceElement && priceElement.textContent) {
        let price = priceElement.textContent.replace(/[^0-9.]/g, '').trim();
        if (['www.amazon.fr', 'www.amazon.de', 'www.amazon.it', 'www.amazon.es'].includes(host) && !price.includes('.')) {
            price = (parseInt(price) / 100).toString();
        }
        return price;
    } else {
        return null; // 如果没有找到价格，返回 null
    }
}

// 获取 ASIN
function getAsin() {
    const asinMatch = window.location.href.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);
    return asinMatch ? asinMatch[2] : null;
}

// 获取 URL
function getUrl() {
    const asin = getAsin();
    return asin ? `https://${window.location.host}/dp/${asin}?th=1&psc=1` : null;
}

// 复制到剪贴板
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => {
        alert(`成功复制到剪贴板！\n\n${text}`);
    }).catch(err => {
        console.error('无法复制文本: ', err);
        alert('复制失败，请检查浏览器控制台获取更多信息。');
    });
}

// 处理提取
function handleExtraction(isSub) {
    const asin = getAsin();
    const price = getPrice();
    const currentUrl = getUrl();

    if (asin && price) {
        const clipboardText = isSub ? `${asin}\n${price}` : `${currentUrl}\n${asin}\n${price}`;
        copyToClipboard(clipboardText);
    } else {
        let errorMessage = "未能提取所需信息：\n";
        if (!asin) {
            errorMessage += "- 无法从此URL中找到有效的ASIN。\n";
        }
        if (!price) {
            errorMessage += "- 无法在此页面上找到价格信息。\n";
        }
        alert(errorMessage);
    }
}

// 创建按钮组
createFloatingButtonGroup();