function waitForElement(selector, timeout = 5000, interval = 300) {
    const start = Date.now();
    let element;
    do {
        element = selector.startsWith('/')
            ? document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
            : document.querySelector(selector);
        if (element) return element;
        const waitEnd = Date.now() + interval; // 先记录等待结束时间
        while (Date.now() < waitEnd);
    } while (Date.now() - start < timeout);
    return null;
}