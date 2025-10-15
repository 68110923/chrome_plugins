// 等待页面加载完成
// 页面加载完成后初始化
// 当DOM完全加载时，执行添加物流按钮的函数
window.addEventListener('load', () => { addLogisticsButton();});

// 向页面添加一键发物流按钮
function addLogisticsButton() {
    const buttonGroup = document.querySelector('[data-type="order"] div[class="normalBtnGroup"]');
    const newButton = document.createElement('button');
    newButton.textContent = '一键发物流';
    newButton.className = 'btn btn-primary';
    newButton.style.marginLeft = '5px';
    newButton.addEventListener('click', open_order_input_window);
    buttonGroup.appendChild(newButton);
    showNotification('一键发物流功能已注入');
}

// 处理一键发物流按钮的点击事件
async function open_order_input_window() {
    const user = await get_settings();
    if (!user.username || !user.password) { alert('请先点击插件图标，输入深孚账号和密码'); return; }

    const {overlay, order_input_txt, date_input_txt, yes_btn, no_btn, use_window} = create_order_input_window();

    const order_input = await new Promise((resolve) => {
        // 关闭页面事件 - 添加检查确保overlay元素存在于DOM中再移除，避免重复移除报错
        const close_window = () => {if (overlay.parentNode === document.body) {document.body.removeChild(overlay);}};

        // 确认按钮事件
        const yes_btn_click = () => {
            const all_order_input = order_input_txt.value.trim();
            const all_date_input = date_input_txt.value.trim();

            if (!all_order_input || !all_date_input) {alert('订单号和日期输入框都不能为空');return;}
            const temp_orders = parse_input_zip(all_order_input, all_date_input);
            if (temp_orders.error) {alert(temp_orders.error);return;}
            // 二次确认对话框，让用户确认是否继续操作
            const orders_length = Object.keys(temp_orders.orders).length
            if (temp_orders.input_count !== orders_length) {
                const is_confirmed = confirm(`订单号有 ${temp_orders.input_count - orders_length} 条重复，请悉知!\n\n输 入: ${temp_orders.input_count} 条\n解 析: ${orders_length} 条\n\n点击"确定"将开始处理。`);
                if (is_confirmed) {
                    resolve(temp_orders.orders);
                }
            } else if (confirm(`确定要为以下 ${orders_length} 个订单发货吗？\n\n点击"确定"将开始处理。`)) {
                resolve(temp_orders.orders);
            }
        };

        // 初始绑定事件监听器到各个交互元素
        yes_btn.addEventListener('click', yes_btn_click);
        no_btn.addEventListener('click', close_window);
        overlay.addEventListener('click', close_window);
        use_window.addEventListener('click', (e) => e.stopPropagation());
    });
    if (!order_input) return;

    document.body.removeChild(overlay);
    // 创建日志浮窗，用于显示处理过程中的日志信息
    const log_window_obj = create_log_window();
    const log_element = log_window_obj.content;
    add_log(log_element, `开始提交订单处理...`);
    const result = await process_orders(log_element, order_input, log_window_obj.progress);
    add_log(log_element, `所有订单处理完毕！ ${result.filter(order => order.success).length} 个成功，${result.filter(order => !order.success).length} 个失败`);
    
    // 生成CSV文件并自动下载
    generate_csv_and_download(result, log_element);
}

// 处理订单main逻辑
async function process_orders(log_element, orders, progress = null) {
    const all_results = [];
    // 获取并发数配置
    const user_settings = await get_settings();
    const concurrency_limit = parseInt(user_settings.concurrency_limit) || 15;
    
    // 将订单转换为数组，方便分批次处理
    const input_order_values = Object.values(orders);
    const total_orders = input_order_values.length;
    let processed_count = 0;
    
    add_log(log_element, `共 ${total_orders} 个订单需要处理，速度 ${concurrency_limit} `);
    
    // 初始化进度条
    if (progress) {
        progress.container.style.display = 'block';
        update_progress(progress, processed_count, total_orders);
    }
    
    // 分批次并行处理订单
    for (let i = 0; i < input_order_values.length; i += concurrency_limit) {
        const batch = input_order_values.slice(i, i + concurrency_limit);
        const batchPromises = batch.map(async (input_order_data) => {
            return await process_order(log_element, input_order_data, user_settings);
        });
        const batch_results = await Promise.all(batchPromises);

        for (const order_data_i of batch_results) {
            const order_data = await post_dxm(order_data_i);
            add_log(log_element, `${order_data.success} ${order_data.order ? order_data.order.order_number : 'N/A'}  ${order_data.success ? '' : order_data.message}`);
            all_results.push(order_data);
            processed_count++;
            if (progress) {
                update_progress(progress, processed_count, total_orders);
            }
        }
    }
    return all_results;
}

async function post_dxm(order_data) {
    if (!order_data.success) {
        return order_data;
    }
    let providerNames = null
    if (order_data.shipment.carrier === 'ups-v2'){
        providerNames = 'UPS'
    } else {
        // 其他情况，暂不支持
        order_data.success = false;
        order_data.message = `订单不支持 ${order_data.shipment.carrier} 快递`;
        return order_data;
    }
    // 构建URL编码格式的表单数据
    const form_data = new URLSearchParams();
    form_data.append('packageIds', order_data.order.dxm_order_number);
    form_data.append('tracingNumbers', order_data.shipment.tracking_number_reality);
    form_data.append('providerNames', providerNames);
    form_data.append('isShipStr', '1');
    form_data.append('trackUrls', '');
    form_data.append('serviceTypes', '');
    form_data.append('fProductCodes', '');
    form_data.append('fProductCodeNames', '');

    const response = await fetch(`https://www.dianxiaomi.com/package/withOutPrintShip.json`, {
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'user-agent': navigator.userAgent
        },
        body: form_data.toString(),
        redirect: "follow"
    });
    const dxm_response_json = await response.json()
    if (dxm_response_json.code === -1) {
        order_data.success = false;
        order_data.message = `订单提交失败: ${dxm_response_json.msg}`;
    } else if (dxm_response_json.code !== 0) {
        order_data.success = false;
        order_data.message = `订单提交失败,未知错误: ${dxm_response_json.msg}`;
    } else {
        order_data.success = true;
    }
    return order_data
}
// 单条订单处理，从后台获取快递单号等信息，提交到店小秘
async function process_order(log_element, input_order_data, user_settings) {
    // 从后台获取快递单号等信息
    const base64Credentials = btoa(`${user_settings.username}:${user_settings.password}`);
    const response_server = await fetch(`${SF_ERP_URL}/drf/spider/shipment-pre-dxm/buy_b_express/?order_number=${input_order_data.order_number}&expected_delivery=${input_order_data.expected_delivery}`, {
        method: 'GET',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'user-agent': navigator.userAgent,
            'authorization': `Basic ${base64Credentials}`,
        }
    });
    return await response_server.json()
}

// 生成CSV文件并自动下载
function generate_csv_and_download(results, log_element) {
    try {
        // CSV头部
        const headers = [
            '订单号',
            '输入的日期',
            '状态',
            '收件邮编',
            '下单时间',
            '预计到货日期',
            '快递单号',
            '快递创建时间',
            '快递预计到达时间',
            '错误信息'
        ];
        
        // CSV数据行
        const rows = results.map(order => {
            const order_data = order.order || {};
            const shipment = order.shipment || {};
            
            return [
                order_data.order_number || '',
                order_data.expected_delivery ? new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(order_data.expected_delivery)) : '',
                order.success ? '成功' : '失败',
                order_data.shipping_zip_code || '',
                order_data.order_created_at || '',
                order_data.expected_delivery || '',
                shipment.tracking_number_reality || '',
                shipment.label_created || '',
                shipment.expected_delivery || '',
                order.error || order.message || ''
            ];
        });
        
        // 组合CSV内容
        const csv_content = [
            headers.join(','),
            ...rows.map(row => row.map(field => {
                // 处理字段中的逗号和引号
                const field_str = String(field || '');
                if (field_str.includes(',') || field_str.includes('"') || field_str.includes('\n')) {
                    return '"' + field_str.replace(/"/g, '""') + '"';
                }
                return field_str;
            }).join(','))
        ].join('\n');
        
        // 创建Blob对象
        const blob = new Blob(['\ufeff' + csv_content], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        // 创建下载链接
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `订单处理结果_${new Date().toISOString().slice(0, 10)}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 释放URL对象
        URL.revokeObjectURL(url);
        
        add_log(log_element, `CSV文件已生成并下载完成`);
    } catch (error) {
        add_log(log_element, `生成CSV文件失败: ${error.message}`);
        console.error('CSV生成错误:', error);
    }
}

// 解析输入的内容
function parse_input_zip(all_order_input, all_date_input) {
    try {
        // 使用正则表达式分割订单号，支持逗号、分号、空格、换行、制表符，多个分隔符视为一个
        const orderIds = all_order_input
            .split(/[,; \n\t]+/)
            .map(id => id.trim())
            .filter(id => id);

        if (orderIds.length === 0) {
            return { error: '未找到有效的订单号，请检查输入' };
        }

        // 使用正则表达式分割日期，支持相同的分隔符
        const dateStrs = all_date_input
            .split(/[,; \n\t]+/)
            .map(date => date.trim())
            .filter(date => date);

        if (dateStrs.length === 0) {
            return { error: '未找到有效的日期，请检查输入' };
        }

        // 检查订单号和日期数量是否匹配
        if (orderIds.length !== dateStrs.length) {
            return {error: `订单号与日期数量不一致!\n\n订单号:${orderIds.length}\n日  期:${dateStrs.length}`};
        }

        // 解析每个日期并生成订单数据
        const orders = {};
        for (let i = 0; i < orderIds.length; i++) {
            const parsedDate = parse_date(dateStrs[i]);
            if (!parsedDate) {return {error: `第 ${i+1} 个日期格式错误: ${dateStrs[i]}\n请使用支持的格式`};}

            orders[orderIds[i]] = {
                order_number: orderIds[i],
                expected_delivery: parsedDate
            };
        }

        return  {orders, input_count: orderIds.length};
    } catch (error) {
        return { error: error.message };
    }
}

// 创建订单输入窗口
function create_order_input_window() {
    // 创建遮罩层，用于覆盖整个页面并居中显示输入窗口
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

    // 主体容器
    const use_window = document.createElement('div');
    use_window.style.cssText = `
        width: 50%;
        background-color: #fff;
        border-radius: 10px;
        box-shadow: #c6dbc7 0px 3px 15px;
        padding: 2.2%;
    `;
    overlay.appendChild(use_window);

    // 主体标题
    const use_window_title = document.createElement('h3');
    use_window_title.textContent = '输入订单号和预计到货日期';
    use_window_title.style.cssText = `
        margin: 0 0 20px 0;
        color: #333;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
    `;
    use_window.appendChild(use_window_title);

    // 输入框容器
    const input_window = document.createElement('div');
    input_window.style.cssText = `
        display: flex;
        gap: 3.5%;
        margin-bottom: 2%;
        width: 100%;
    `;
    use_window.appendChild(input_window);
    const {input: order_input, input_txt: order_input_txt} = f_input(
        '订单号（多个用分隔符分隔）:',
        '例如:ORD123, ORD456; ORD789\n支持逗号、分号、空格、换行、制表符分隔',
        // 'GSU13B20000MKJB',     // 临时测试使用的默认值
    );

    const {input: date_input, input_txt: date_input_txt} = f_input(
        '预计到货日期（多个用分隔符分隔）:',
        '例如:2023/12/31, 2024-01-01; 2024年01月02日 8月20日\n支持逗号、分号、空格、换行、制表符分隔',
        // '2025-09-30',     // 临时测试使用的默认值
    );
    input_window.appendChild(order_input);
    input_window.appendChild(date_input);

    // 订单号自动注入
    const temp_search_value = document.querySelector('#searchContent').value.trim()
    if (temp_search_value) {
        order_input_txt.value = temp_search_value.split(/[,; \n\t]+/).join("\n");
        setTimeout(() => { date_input_txt.focus();}, 0);
    } else {
        setTimeout(() => { order_input_txt.focus();}, 0);
    }

    //生成输入框的函数
    function f_input(label, placeholder, value='') {
        const input = document.createElement('div');
        input.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
    `;

        const input_label = document.createElement('label');
        input_label.textContent = label;
        input_label.style.cssText = `
        margin-bottom: 8px;
        color: #555;
        font-weight: 500;
        font-size: 14px;
    `;
        input.appendChild(input_label);

        const input_txt = document.createElement('textarea');
        input_txt.value = value;
        input_txt.placeholder = placeholder;
        input_txt.style.cssText = `
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
        input_txt.onfocus = function() {
            this.style.borderColor = '#4CAF50';
            this.style.outline = 'none';
        };
        input_txt.onblur = function() {
            this.style.borderColor = '#ddd';
        };
        input.appendChild(input_txt);
        return {input, input_txt};
    }

    // 按钮容器
    const button_window = document.createElement('div');
    button_window.style.cssText = `
        text-align: right;
    `;
    use_window_title.appendChild(button_window);

    // 取消按钮
    const no_btn = document.createElement('button');
    no_btn.textContent = '取消';
    no_btn.style.cssText = `
        margin-right: 10px;
        padding: 9px 18px;
        border: 1px solid #ddd;
        background-color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    `;
    no_btn.onmouseover = function() {this.style.backgroundColor = '#f5f5f5';};
    no_btn.onmouseout = function() {this.style.backgroundColor = 'white';};
    button_window.appendChild(no_btn);

    // 确认按钮
    const yes_btn = document.createElement('button');
    yes_btn.textContent = '确认';
    yes_btn.style.cssText = `
        padding: 9px 18px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    `;
    yes_btn.onmouseover = function() {this.style.backgroundColor = '#45a049';};
    yes_btn.onmouseout = function() {this.style.backgroundColor = '#4CAF50';};
    button_window.appendChild(yes_btn);

    document.body.appendChild(overlay);
    return {overlay, order_input_txt, date_input_txt, yes_btn, no_btn, use_window}
}

// 创建日志窗口
function create_log_window() {
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

    // 进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.style.cssText = `
        padding: 10px 15px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #ddd;
        display: none; /* 初始隐藏 */
    `;
    
    const progressLabel = document.createElement('div');
    progressLabel.style.cssText = `
        font-size: 12px;
        color: #666;
        margin-bottom: 5px;
        display: flex;
        justify-content: space-between;
    `;
    progressLabel.innerHTML = '<span>处理进度</span><span class="progress-text">0/0 (0%)</span>';
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        width: 100%;
        height: 8px;
        background-color: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
    `;
    
    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
        height: 100%;
        background-color: #4CAF50;
        width: 0%;
        transition: width 0.5s ease-in-out;
        background-image: linear-gradient(45deg, rgba(255, 255, 255, .15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .15) 50%, rgba(255, 255, 255, .15) 75%, transparent 75%, transparent);
        background-size: 1rem 1rem;
    `;
    
    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressLabel);
    progressContainer.appendChild(progressBar);

    const logContent = document.createElement('div');
    logContent.className = 'log-content';
    logContent.style.cssText = `
        padding: 15px;
        height: 250px;
        overflow-y: auto;
        font-family: monospace;
        white-space: pre-wrap;
    `;

    logWindow.appendChild(title);
    logWindow.appendChild(progressContainer);
    logWindow.appendChild(logContent);
    overlay.appendChild(logWindow);
    document.body.appendChild(overlay);

    // 返回包含进度条元素的对象，方便后续更新
    return { 
        window: logWindow, 
        content: logContent,
        progress: {
            container: progressContainer,
            label: progressLabel.querySelector('.progress-text'),
            fill: progressFill
        }
    };
}

// 添加日志内容
function add_log(element, message) {
    const timestamp = new Date().toLocaleTimeString();
    element.textContent += `[${timestamp}] ${message}\n`;
    element.scrollTop = element.scrollHeight; // 自动滚动到底部
}

// 更新进度条
function update_progress(progress, current, total) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    progress.label.textContent = `${current}/${total} (${percentage}%)`;
    progress.fill.style.width = `${percentage}%`;
    
    // 当进度完成时，改变进度条颜色为绿色
    if (percentage === 100) {
        progress.fill.style.backgroundColor = '#28a745';
    }
}

// 解析日期函数
function parse_date(dateString) {
    let str_data = dateString.replace('日', '').trim();   // 去掉日期中的“日”
    str_data = str_data.replace(/年|月|[-/]/g, '-');  // 替换日期中的“年”、“月”、“-”或“/”为“-”
    if (str_data.match(/^\d{1,2}-\d{1,2}$/)) {
        str_data = `${new Date().getFullYear()}-${str_data}`
    }
    const match = str_data.match(/^(\d{4})(?:年(\d{1,2})月(\d{1,2})日|[-/](\d{1,2})[-/](\d{1,2}))$/);
    if (match) {
        const year = is_valid(match[1], 'year');
        const month = is_valid(match[2] || match[4], 'month');
        const day = is_valid(match[3] || match[5], 'day');
        return `${year}-${month}-${day}`;
    }else {
        return null;
    }
    function is_valid(value, type) {
        if (type === 'date') {
            if (parseInt(value) > 31 || parseInt(value) < 1) {
                return false;
            }
        } else if (type === 'month') {
            if (parseInt(value) > 12 || parseInt(value) < 1) {
                return false;
            }
        }
        if (type === 'year') {
            return value.toString()
        } else if (type === 'month') {
            return value.toString().padStart(2, '0');
        } else if (type === 'day') {
            return value.toString().padStart(2, '0');
        } else {
            return false;
        }
    }
}




