// 等待页面加载完成
window.addEventListener('load', () => {
    // 添加一键发物流按钮
    addLogisticsButton();
});

// 用于标记按钮是否已添加
let buttonAdded = false;

// 向页面添加一键发物流按钮
function addLogisticsButton() {
    // 如果按钮已添加则直接返回
    if (buttonAdded) return;

    // 查找按钮组容器
    const buttonGroup = document.querySelector('[data-type="order"] div[class="normalBtnGroup"]');

    if (!buttonGroup) {
        // 如果没找到，稍后重试
        setTimeout(addLogisticsButton, 1000);
        return;
    }

    // 检查是否已有该按钮
    const existingButton = Array.from(buttonGroup.querySelectorAll('button')).find(btn => btn.textContent === '一键发物流');
    if (existingButton) {
        buttonAdded = true;
        return;
    }

    // 创建新按钮
    const newButton = document.createElement('button');
    newButton.textContent = '一键发物流';
    newButton.className = 'btn btn-primary'; // 使用页面现有按钮样式
    newButton.style.marginLeft = '5px';

    // 添加点击事件
    newButton.addEventListener('click', handleLogisticsClick);

    // 添加到按钮组
    buttonGroup.appendChild(newButton);
    buttonAdded = true;
}

// 处理一键发物流按钮点击
async function handleLogisticsClick() {
    // 禁用按钮防止重复点击
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = '处理中...';

    try {
        // 获取API设置
        const settings = await getSettings();

        // 验证API Key
        if (!settings.apiKey) {
            alert('请先点击插件图标，输入GetTNShip API Key（来源：https://gettnship.com/api）');
            return;
        }

        // 创建并显示订单输入窗口
        const orderInput = createOrderInputWindow();
        const { orderTextarea, dateTextarea, confirmBtn, cancelBtn, overlay } = orderInput;

        // 返回一个Promise，等待用户确认或取消
        const allOrderInput = await new Promise((resolve) => {
            // 统一移除事件监听器的函数
            const removeListeners = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                overlay.removeEventListener('click', handleOverlayClick);
            };

            const handleConfirm = () => {
                const orderInputVal = orderTextarea.value.trim();
                const dateInputVal = dateTextarea.value.trim();

                if (!orderInputVal || !dateInputVal) {
                    alert('订单号和日期输入框都不能为空');
                    return;
                }

                // 解析输入内容
                const parsedData = parseOrderInput(orderInputVal, dateInputVal);
                if (parsedData.error) {
                    alert(parsedData.error);
                    return;
                }

                // 显示二次确认对话框
                const isConfirmed = confirm(`确定要为以下 ${parsedData.orders.length} 个订单发货吗？\n\n点击"确定"将开始处理。`);
                if (isConfirmed) {
                    document.body.removeChild(overlay);
                    removeListeners();
                    resolve(parsedData.orders);
                } else {
                    // 用户取消二次确认时重新绑定事件
                    removeListeners();
                    setTimeout(() => {
                        confirmBtn.addEventListener('click', handleConfirm);
                        cancelBtn.addEventListener('click', handleCancel);
                        overlay.addEventListener('click', handleOverlayClick);
                    }, 0);
                }
            };

            const handleCancel = () => {
                document.body.removeChild(overlay);
                removeListeners();
                resolve(null);
            };

            const handleOverlayClick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    removeListeners();
                    resolve(null);
                }
            };

            // 初始绑定事件监听器
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleOverlayClick);
        });

        // 如果用户取消或关闭窗口
        if (!allOrderInput) return;

        // 创建日志浮窗
        const logWindow = createLogWindow();
        const logElement = logWindow.querySelector('.log-content');

        // 显示初始信息
        addLog(logElement, `正在准备处理 ${allOrderInput.length} 个订单...`);

        // 提前获取所有相关订单的列表数据（只执行一次）
        addLog(logElement, `获取所有相关订单基础数据...`);
        const allOrderDetails = await getAllOrderDetails(allOrderInput);
        if (!allOrderDetails || allOrderDetails.length === 0) {
            addLog(logElement, `错误：未获取到任何订单列表数据`);
            return;
        } else if (allOrderDetails.length != allOrderInput.length) {
            addLog(logElement, `错误：输入${allOrderInput.length}条订单号，获取到${allOrderDetails.length}条订单`);
            return;
        }
        addLog(logElement, `成功获取 ${allOrderDetails.length} 条订单列表数据`);

        // 逐个处理订单
        for (const orderDetails of allOrderDetails) {
            try {
                // 将提前获取的订单列表数据传入，避免重复请求
                await processSingleOrder(orderDetails, logElement, settings);
            } catch (error) {
                addLog(logElement, `处理出错: ${error.message}`);
            }
        }

        addLog(logElement, `\n所有订单处理完毕！`);

    } catch (error) {
        console.error('处理物流时出错:', error);
        alert('处理过程中发生错误: ' + error.message);
    } finally {
        // 恢复按钮状态
        button.disabled = false;
        button.textContent = originalText;
    }
}

// 新增：获取所有相关订单的列表数据（只执行一次）
async function getAllOrderDetails(allOrderInput) {
    try {
        // 构建完整的请求参数（补全所有可能需要的参数）
        const formData = new URLSearchParams();
        formData.append('pageNo', '1');
        formData.append('pageSize', '1000'); // 增大分页大小，确保能获取所有需要的订单
        formData.append('state', 'approved');
        formData.append('shopId', '-1');
        formData.append('searchType', 'orderId');
        formData.append('content', allOrderInput.map(item => item.packageId).join(',')); // 一次性搜索多个订单号
        formData.append('isVoided', '0');
        formData.append('isRemoved', '0');
        formData.append('orderField', 'order_pay_time');
        formData.append('orderSearchType', '1');
        formData.append('startDate', ''); // 补全日期范围参数
        formData.append('endDate', '');
        formData.append('platformId', '-1'); // 平台ID，全部
        formData.append('warehouseId', '-1'); // 仓库ID，全部
        formData.append('shippingMethodId', '-1'); // 物流方式，全部
        formData.append('paymentMethod', '-1'); // 支付方式，全部
        formData.append('isGift', '-1'); // 是否礼品单，全部
        formData.append('hasRemark', '-1'); // 是否有备注，全部
        formData.append('isCombined', '-1'); // 是否合并订单，全部
        formData.append('isSplit', '-1'); // 是否拆分订单，全部
        formData.append('currency', '-1'); // 货币类型，全部
        formData.append('country', '-1'); // 国家，全部
        formData.append('isInsured', '-1'); // 是否投保，全部
        formData.append('isAllocated', '-1'); // 是否分配，全部
        formData.append('isPrinted', '-1'); // 是否打印，全部
        formData.append('isLack', '-1'); // 是否缺货，全部
        formData.append('tagId', '-1'); // 标签ID，全部
        formData.append('batchId', '-1'); // 批次ID，全部
        formData.append('userId', '-1'); // 用户ID，全部
        formData.append('ruleId', '-1'); // 规则ID，全部
        formData.append('sortType', 'desc'); // 排序方式

        // 发送请求
        const response = await fetch('https://www.dianxiaomi.com/package/searchPackage.htm', {
            method: 'POST',
            headers: {
                'accept': 'text/html, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                'referer': 'https://www.dianxiaomi.com/order/index.htm?go=m101',
                'user-agent': navigator.userAgent
            },
            body: formData.toString(),
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP错误，状态码: ${response.status}`);
        }

        const html = await response.text();

        // 解析HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 查找所有订单行
        const orderRows = doc.evaluate(
            `//tbody[@class="xianshishujudate"]/tr[contains(@class,"orderId_")]`,
            doc,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        const allOrderDetails = [];
        for (let i = 0; i < orderRows.snapshotLength; i++) {
            const row = orderRows.snapshotItem(i);

            // 提取订单信息（根据实际页面结构调整选择器）
            const getDetailId = row.getAttribute('class').match(/orderId_(\d+)/)[1];
            const packageId = row.querySelector('td.tableOrderId input').getAttribute('value');
            const expectedDate = allOrderInput.find(item => item.packageId === packageId).expectedDate;
            const placingDate = row.querySelector('td:nth-child(5) div:nth-child(1)').textContent.trim().match(/\d{4}-\d{2}-\d{2}/)[0];

            allOrderDetails.push({
                getDetailId,
                packageId,
                placingDate,
                expectedDate
            });
        }

        return allOrderDetails;
    } catch (error) {
        console.error('获取订单列表失败:', error);
        throw new Error(`获取订单列表失败: ${error.message}`);
    }
}

// 单个订单处理逻辑
async function processSingleOrder(orderDetails, logElement, settings) {
    addLog(logElement, `\n开始处理订单 ${JSON.stringify(orderDetails, null, 2)}`);

    // 1、从提前获取的订单列表中查找当前订单信息
    addLog(logElement, `步骤1/5：查找订单 ${orderDetails.packageId} 详细信息...`);
    const orderDetail = orderDetails.packageId;
    if (!orderDetail) {
        addLog(logElement, `步骤1/5：错误 - 未找到订单 ${orderDetails.packageId} 的详细信息`);
        return;
    }
    addLog(logElement, `步骤1/5：订单信息查询完成`);


    // 2、根据订单找到下单时间、收货地址编码和邮编等信息
    addLog(logElement, `步骤2/5：提取订单地址信息...`);
    const addressInfo = await getAddressInfo(orderDetail.orderId);
    if (!addressInfo || !addressInfo.zipCode) {
        addLog(logElement, `步骤2/5：错误 - 未找到收货地址信息或邮编`);
        return;
    }
    addLog(logElement, `步骤2/5：地址信息提取完成，邮编：${addressInfo.zipCode}，国家：${orderDetail.country}`);


    // 3、获取物流单号（使用邮编作为地址编码）
    addLog(logElement, `步骤3/5：获取物流单号...`);
    // 准备配置信息
    const config = getConfigForLogistics(expectedDate);

    // 尝试获取物流单号
    let trackingResult = await getTrackingNumberFromUSPS(addressInfo.zipCode, settings, config);
    if (!trackingResult.success) {
        addLog(logElement, `步骤3/5：USPS未找到，尝试UPS...`);
        trackingResult = await getTrackingNumberFromUPS(addressInfo.zipCode, settings, config);
    }

    if (!trackingResult.success) {
        addLog(logElement, `步骤3/5：错误 - 未找到合适物流单号`);
        return;
    }
    addLog(logElement, `步骤3/5：成功获取物流单号：${trackingResult.trackingNumber}（${trackingResult.carrier}）`);


    // 4、上传物流单号到店小秘
    addLog(logElement, `步骤4/5：上传物流单号到店小秘...`);
    const uploadSuccess = await uploadTrackingNumber(
        packageId,
        trackingResult.trackingNumber,
        trackingResult.carrier,
        config
    );

    addLog(logElement, `步骤4/5：${uploadSuccess ? '成功 - 物流单号已上传' : '错误 - 物流单号上传失败'}`);
}

// 获取订单详情
async function getOrderDetails(packageId) {
    try {
        // 构建请求参数
        const formData = new URLSearchParams();
        formData.append('pageNo', '1');
        formData.append('pageSize', '100');
        formData.append('state', 'approved');
        formData.append('shopId', '-1');
        formData.append('searchType', 'orderId');
        formData.append('content', packageId);
        formData.append('isVoided', '0');
        formData.append('isRemoved', '0');
        formData.append('orderField', 'order_pay_time');
        formData.append('orderSearchType', '1');
        // 添加其他必要参数

        // 发送请求
        const response = await fetch('https://www.dianxiaomi.com/package/searchPackage.htm', {
            method: 'POST',
            headers: {
                'accept': 'text/html, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                'referer': 'https://www.dianxiaomi.com/order/index.htm?go=m101',
                // 使用浏览器当前的user-agent
                'user-agent': navigator.userAgent
                // 不需要显式设置cookie，fetch会自动携带
            },
            body: formData.toString(),
            credentials: 'same-origin' // 确保发送同源cookie
        });

        if (!response.ok) {
            throw new Error(`HTTP错误，状态码: ${response.status}`);
        }

        const html = await response.text();

        // 解析HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 查找订单行
        const orderRows = doc.evaluate(
            `//tbody[@class="xianshishujudate"]/tr[contains(@class,"orderId_")]`,
            doc,
            null,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE,
            null
        );

        let orderRow = orderRows.iterateNext();
        while (orderRow) {
            // 查找订单号输入框
            const orderInput = doc.evaluate(
                `.//td[@class="tableOrderId"]/input`,
                orderRow,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (orderInput && orderInput.value === packageId) {
                // 提取orderId
                const orderClass = orderInput.className;
                const orderIdMatch = orderClass.match(/orderNumberSpan_(\d+)/);
                if (!orderIdMatch) {
                    throw new Error('无法提取orderId');
                }
                const orderId = orderIdMatch[1];

                // 提取国家
                const countryNode = doc.evaluate(
                    `.//td/span[2][contains(text(),"「")]`,
                    orderRow,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;

                const country = countryNode ? countryNode.textContent.trim() : '';

                return {
                    packageId,
                    orderId,
                    country
                };
            }

            orderRow = orderRows.iterateNext();
        }

        // 未找到订单
        return null;
    } catch (error) {
        console.error('获取订单详情失败:', error);
        throw new Error(`获取订单详情失败: ${error.message}`);
    }
}

// 新增函数：获取地址信息（包括邮编）
async function getAddressInfo(orderId) {
    try {
        // 构建请求参数
        const formData = new URLSearchParams();
        formData.append('orderId', orderId);
        formData.append('history', '');

        // 发送请求
        const response = await fetch('https://www.dianxiaomi.com/order/detail.htm', {
            method: 'POST',
            headers: {
                'accept': 'text/html, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                'referer': 'https://www.dianxiaomi.com/order/index.htm?go=m101',
                'user-agent': navigator.userAgent
            },
            body: formData.toString(),
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP错误，状态码: ${response.status}`);
        }

        const html = await response.text();

        // 解析HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 提取地址信息
        const addressInfo = {};
        const labels = doc.querySelectorAll('.form-horizontal.doNotSubmit label');

        labels.forEach(label => {
            const labelText = label.textContent.trim();
            const valueElement = label.nextElementSibling;
            if (valueElement) {
                const value = valueElement.textContent.trim();

                if (labelText.includes('收件人')) {
                    addressInfo.recipient = value;
                } else if (labelText.includes('电话')) {
                    addressInfo.phone = value;
                } else if (labelText.includes('邮编')) {
                    addressInfo.zipCode = value;
                }
            }
        });

        return addressInfo;
    } catch (error) {
        console.error('获取地址信息失败:', error);
        throw new Error(`获取地址信息失败: ${error.message}`);
    }
}

// 提取物流配置生成逻辑
function getConfigForLogistics(expectedDate) {
    const builtInConfig = {
        shippedFrom: "2023-09-01",
        shippedTo: "2023-09-30",
        dianxiaomiApiUrl: "https://www.dianxiaomi.com/package/uploadTracking.htm"
    };

    return {
        ...builtInConfig,
        shippedFrom: formatDateForAPI(expectedDate),
        shippedTo: formatDateForAPI(expectedDate)
    };
}

// 创建订单输入窗口的函数
function createOrderInputWindow() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'order-input-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;

    // 创建输入窗口
    const inputWindow = document.createElement('div');
    inputWindow.style.cssText = `
        width: 900px;
        max-width: 95%;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
        padding: 25px;
        box-sizing: border-box;
    `;

    // 添加标题
    const title = document.createElement('h3');
    title.textContent = '输入订单号和预计到货日期';
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: #333;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
    `;
    inputWindow.appendChild(title);

    // 创建输入框容器（左右布局）
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
        display: flex;
        gap: 20px;
        margin-bottom: 25px;
        width: 100%;
    `;

    // 订单号输入框
    const orderContainer = document.createElement('div');
    orderContainer.value =
    orderContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
    `;
    const orderLabel = document.createElement('label');
    orderLabel.textContent = '订单号（多个用分隔符分隔）：';
    orderLabel.style.cssText = `
        margin-bottom: 8px;
        color: #555;
        font-weight: 500;
        font-size: 14px;
    `;
    const orderTextarea = document.createElement('textarea');
    orderTextarea.value = '129025542722648';    //临时测试使用
    orderTextarea.style.cssText = `
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
        min-height: 300px; /* 从180px增加到300px */
        height: 220px;    /* 新增固定高度设置 */
        font-size: 14px;
        line-height: 1.5;
        transition: border-color 0.3s;
    `;
    orderTextarea.placeholder = '例如：ORD123, ORD456; ORD789\n支持逗号、分号、空格、换行、制表符分隔';
    orderTextarea.onfocus = function() {
        this.style.borderColor = '#4CAF50';
        this.style.outline = 'none';
    };
    orderTextarea.onblur = function() {
        this.style.borderColor = '#ddd';
    };
    orderContainer.appendChild(orderLabel);
    orderContainer.appendChild(orderTextarea);

    // 日期输入框
    const dateContainer = document.createElement('div');
    dateContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
    `;
    const dateLabel = document.createElement('label');
    dateLabel.textContent = '预计到货日期（和订单号一一对应）：';
    dateLabel.style.cssText = `
        margin-bottom: 8px;
        color: #555;
        font-weight: 500;
        font-size: 14px;
    `;
    const dateTextarea = document.createElement('textarea');
    dateTextarea.value = '2025/9/11';   //临时测试使用
    dateTextarea.style.cssText = `
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
        min-height: 300px; /* 从180px增加到220px */
        height: 220px;    /* 新增固定高度设置 */
        font-size: 14px;
        line-height: 1.5;
        transition: border-color 0.3s;
    `;
    dateTextarea.placeholder = `支持格式：
YYYY-MM-DD（如2023-12-31）
MM-DD（如12-31）
YYYY/MM/DD（如2023/12/31）
MM/DD（如12/31）
YYYY年MM月DD日（如2023年12月31日）
MM月DD日（如12月31日）`;
    dateTextarea.onfocus = function() {
        this.style.borderColor = '#4CAF50';
        this.style.outline = 'none';
    };
    dateTextarea.onblur = function() {
        this.style.borderColor = '#ddd';
    };
    dateContainer.appendChild(dateLabel);
    dateContainer.appendChild(dateTextarea);

    // 将输入框添加到容器（保持左右布局）
    inputContainer.appendChild(orderContainer);
    inputContainer.appendChild(dateContainer);
    inputWindow.appendChild(inputContainer);

    // 添加简要说明文字
    const note = document.createElement('div');
    note.style.cssText = `
        font-size: 12px;
        color: #666;
        margin-bottom: 20px;
        padding: 8px 10px;
        background-color: #f9f9f9;
        border-radius: 4px;
    `;
    note.textContent = '提示：订单号与日期数量需保持一致，将按顺序一一对应处理';
    inputWindow.appendChild(note);

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        text-align: right;
    `;

    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
        margin-right: 10px;
        padding: 9px 18px;
        border: 1px solid #ddd;
        background-color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    `;
    cancelBtn.onmouseover = function() {
        this.style.backgroundColor = '#f5f5f5';
    };
    cancelBtn.onmouseout = function() {
        this.style.backgroundColor = 'white';
    };

    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认';
    confirmBtn.style.cssText = `
        padding: 9px 18px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    `;
    confirmBtn.onmouseover = function() {
        this.style.backgroundColor = '#45a049';
    };
    confirmBtn.onmouseout = function() {
        this.style.backgroundColor = '#4CAF50';
    };

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    inputWindow.appendChild(buttonContainer);

    overlay.appendChild(inputWindow);
    document.body.appendChild(overlay);

    // 设置默认聚焦到订单号输入框（关键修改）
    setTimeout(() => {
        orderTextarea.focus();
    }, 0);

    return {
        overlay,
        orderTextarea,
        dateTextarea,
        confirmBtn,
        cancelBtn
    };
}

// 解析订单输入
function parseOrderInput(orderInput, dateInput) {
    try {
        // 使用正则表达式分割订单号，支持逗号、分号、空格、换行、制表符，多个分隔符视为一个
        const orderIds = orderInput
            .split(/[,; \n\t]+/)
            .map(id => id.trim())
            .filter(id => id);

        if (orderIds.length === 0) {
            return { error: '未找到有效的订单号，请检查输入' };
        }

        // 使用正则表达式分割日期，支持相同的分隔符
        const dateStrs = dateInput
            .split(/[,; \n\t]+/)
            .map(date => date.trim())
            .filter(date => date);

        if (dateStrs.length === 0) {
            return { error: '未找到有效的日期，请检查输入' };
        }

        // 检查订单号和日期数量是否匹配
        if (orderIds.length !== dateStrs.length) {
            return {
                error: `订单号数量（${orderIds.length}）与日期数量（${dateStrs.length}）不匹配`
            };
        }

        // 解析每个日期并生成订单数据
        const orders = [];
        for (let i = 0; i < orderIds.length; i++) {
            const parsedDate = parseDate(dateStrs[i]);
            if (!parsedDate) {
                return {
                    error: `第 ${i+1} 个日期格式错误: ${dateStrs[i]}\n请使用支持的格式`
                };
            }

            orders.push({
                packageId: orderIds[i],
                expectedDate: parsedDate
            });
        }

        return { orders };
    } catch (error) {
        return { error: error.message };
    }
}

// 解析日期函数 - 支持所有要求的格式
function parseDate(dateString) {
    // 去除首尾空格
    const trimmedDate = dateString.trim();

    // 1. 匹配 YYYY-MM-DD 格式
    const ymdDashMatch = trimmedDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdDashMatch) {
        const year = parseInt(ymdDashMatch[1], 10);
        const month = parseInt(ymdDashMatch[2], 10);
        const day = parseInt(ymdDashMatch[3], 10);

        if (isValidDate(year, month, day)) {
            return `${year}-${padZero(month)}-${padZero(day)}`;
        }
    }

    // 2. 匹配 MM-DD 格式 (自动补全当前年份)
    const mdDashMatch = trimmedDate.match(/^(\d{1,2})-(\d{1,2})$/);
    if (mdDashMatch) {
        const month = parseInt(mdDashMatch[1], 10);
        const day = parseInt(mdDashMatch[2], 10);

        if (isValidDate(new Date().getFullYear(), month, day)) {
            return `${new Date().getFullYear()}-${padZero(month)}-${padZero(day)}`;
        }
    }

    // 3. 匹配 YYYY/MM/DD 格式
    const ymdSlashMatch = trimmedDate.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (ymdSlashMatch) {
        const year = parseInt(ymdSlashMatch[1], 10);
        const month = parseInt(ymdSlashMatch[2], 10);
        const day = parseInt(ymdSlashMatch[3], 10);

        if (isValidDate(year, month, day)) {
            return `${year}-${padZero(month)}-${padZero(day)}`;
        }
    }

    // 4. 匹配 MM/DD 格式 (自动补全当前年份)
    const mdSlashMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (mdSlashMatch) {
        const month = parseInt(mdSlashMatch[1], 10);
        const day = parseInt(mdSlashMatch[2], 10);

        if (isValidDate(new Date().getFullYear(), month, day)) {
            return `${new Date().getFullYear()}-${padZero(month)}-${padZero(day)}`;
        }
    }

    // 5. 匹配 YYYY年MM月DD日 格式
    const chineseFullMatch = trimmedDate.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (chineseFullMatch) {
        const year = parseInt(chineseFullMatch[1], 10);
        const month = parseInt(chineseFullMatch[2], 10);
        const day = parseInt(chineseFullMatch[3], 10);

        if (isValidDate(year, month, day)) {
            return `${year}-${padZero(month)}-${padZero(day)}`;
        }
    }

    // 6. 匹配 MM月DD日 格式 (自动补全当前年份)
    const chineseMdMatch = trimmedDate.match(/^(\d{1,2})月(\d{1,2})日$/);
    if (chineseMdMatch) {
        const month = parseInt(chineseMdMatch[1], 10);
        const day = parseInt(chineseMdMatch[2], 10);

        if (isValidDate(new Date().getFullYear(), month, day)) {
            return `${new Date().getFullYear()}-${padZero(month)}-${padZero(day)}`;
        }
    }

    return null;
}

// 验证日期有效性
function isValidDate(year, month, day) {
    // 月份必须在1-12之间
    if (month < 1 || month > 12) return false;

    // 日必须在1-31之间，且考虑不同月份的天数
    const daysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= daysInMonth;
}

// 辅助函数：数字补零
function padZero(num) {
    return num.toString().padStart(2, '0');
}

// 格式化日期为API所需格式
function formatDateForAPI(dateString) {
    // dateString已经是YYYY-MM-DD格式
    return dateString;
}

// 创建日志窗口
function createLogWindow() {
    const overlay = document.createElement('div');
    overlay.className = 'log-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;

    const logWindow = document.createElement('div');
    logWindow.className = 'log-window';
    logWindow.style.cssText = `
        width: 600px;
        max-width: 90%;
        background-color: white;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    `;

    const title = document.createElement('div');
    title.className = 'log-title';
    title.style.cssText = `
        padding: 10px 15px;
        background-color: #f5f5f5;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    title.textContent = '处理日志';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'log-close';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
    `;
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    title.appendChild(closeBtn);

    const logContent = document.createElement('div');
    logContent.className = 'log-content';
    logContent.style.cssText = `
        padding: 15px;
        height: 300px;
        overflow-y: auto;
        font-family: monospace;
        white-space: pre-wrap;
    `;

    logWindow.appendChild(title);
    logWindow.appendChild(logContent);
    overlay.appendChild(logWindow);
    document.body.appendChild(overlay);

    return logWindow;
}

// 添加日志内容
function addLog(element, message) {
    const timestamp = new Date().toLocaleTimeString();
    element.textContent += `[${timestamp}] ${message}\n`;
    element.scrollTop = element.scrollHeight; // 自动滚动到底部
}

// 获取配置
async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['apiKey'], (items) => {
            resolve({
                apiKey: items.apiKey || ''
            });
        });
    });
}

// 以下为占位函数，实际实现需根据具体API文档
async function getAddressCode(packageId) {
    // 实际实现应该从页面或API获取地址编码
    return 'TEST_ADDRESS_CODE_' + packageId;
}

async function getTrackingNumberFromUSPS(addressCode, settings, config) {
    // 实际实现应该调用USPS API
    return {
        success: true,
        trackingNumber: 'USPS' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        carrier: 'USPS'
    };
}

async function getTrackingNumberFromUPS(addressCode, settings, config) {
    // 实际实现应该调用UPS API
    return {
        success: true,
        trackingNumber: 'UPS' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        carrier: 'UPS'
    };
}

async function uploadTrackingNumber(packageId, trackingNumber, carrier, config) {
    // 实际实现应该上传到店小秘
    return true;
}
