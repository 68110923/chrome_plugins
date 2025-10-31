function waitForElement(selector, timeout = 5000, interval = 300) {
    return new Promise((resolve) => {
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return element;
            }
            return null;
        };

        // 立即检查一次
        if (checkElement()) return;

        const timer = setInterval(() => {
            if (checkElement() || Date.now() - start > timeout) {
                clearInterval(timer);
                if (Date.now() - start > timeout) resolve(null);
            }
        }, interval);

        const start = Date.now();
    });
}