// 引入所需模块：文件系统操作模块、路径处理模块、JavaScript混淆库
// node obfuscate.js dxm_super_logistics_tool
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// 从命令行参数获取目标目录（支持绝对路径或相对路径）
const inputDir = process.argv[2];
if (!inputDir) {
    console.error('请传入要混淆的目录路径作为参数（支持绝对路径或相对路径）');
    process.exit(1);
}

// 解析源目录路径：如果是绝对路径则直接使用，否则视为相对于当前脚本目录的路径
const sourceDir = path.isAbsolute(inputDir)
    ? inputDir
    : path.join(__dirname, inputDir);

// 验证源目录是否存在
if (!fs.existsSync(sourceDir)) {
    console.error(`源目录不存在：${sourceDir}`);
    process.exit(1);
}

// 目标目录名：在源目录名后加 "_obfuscated"（保持与原逻辑一致）
const sourceDirName = path.basename(sourceDir); // 获取源目录的最后一级名称
const targetDir = path.join(path.dirname(sourceDir), `${sourceDirName}_obfuscated`);


// 检查并创建目标目录（如果不存在）
// recursive: true 确保能创建多级目录
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 基础混淆配置（适用于大多数JS文件，兼顾兼容性）
const baseOptions = {
    compact: true,               // 压缩代码（去除空格和换行）
    simplify: true,              // 简化代码逻辑
    sourceMap: false,            // 不生成源映射文件（避免暴露原始代码）
    target: 'browser',           // 目标运行环境为浏览器
    identifierNamesGenerator: 'hexadecimal', // 标识符命名方式：十六进制（如0xabc123）
    reservedNames: [             // 保留关键字（不进行混淆，避免功能异常）
        // 保留Chrome插件API相关关键词，确保插件功能正常
        'chrome', 'browser', 'runtime', 'tabs', 'scripting',
        'webRequest', 'storage', 'onMessage', 'sendMessage',
        'addListener', 'removeListener', 'manifest'
    ],
    stringArray: true,           // 启用字符串数组（将字符串提取到数组中）
    stringArrayEncoding: ['base64'], // 字符串数组编码方式：base64
    stringArrayIndexShift: true, // 字符串数组索引偏移（增加破解难度）
    stringArrayThreshold: 0.8,   // 字符串提取阈值（80%的字符串会被处理）

    // 关闭可能导致兼容性问题的高级选项
    controlFlowFlattening: false,    // 控制流扁平化（可能影响执行效率）
    deadCodeInjection: false,        // 死代码注入（增加代码体积）
    debugProtection: true,          // 调试保护（防止调试工具调试）
    selfDefending: true,            // 自防御机制（防止被反混淆）
    transformObjectKeys: false,      // 对象键名转换（可能导致对象属性访问异常）
    numbersToExpressions: true,     // 数字转表达式（可能影响计算精度）
    unicodeEscapeSequence: true     // Unicode转义（增加代码可读性问题）
};

// 根据文件名获取对应的混淆配置（针对不同文件类型的特殊处理）
const getOptions = (filename) => {
    // background.js（服务工作线程）使用最保守配置
    // 原因：Service Worker有严格的执行环境限制，复杂混淆可能导致运行异常
    if (filename === 'background.js') {
        return {
            ...baseOptions,
            stringArray: false, // 完全关闭字符串数组（避免解析问题）
            // identifierNamesGenerator: 'mangled' // 可选：轻度混淆标识符（进一步提高兼容性）
        };
    }

    // content.js（内容脚本）可适度增强混淆
    // 原因：运行在网页环境，兼容性要求较低，可适当提高混淆强度
    if (filename === 'content.js') {
        return {
            ...baseOptions,
            controlFlowFlattening: true,         // 启用控制流扁平化
            controlFlowFlatteningThreshold: 0.5  // 控制流扁平化阈值（50%的代码块会被处理）
        };
    }

    // 其他文件（如popup.js等）使用基础配置
    return baseOptions;
};

// 递归处理目录下的所有文件和子目录
// 参数：
//   dir：当前要处理的源目录路径
//   targetDir：对应的目标目录路径
function processDirectory(dir, targetDir) {
    // 读取当前目录下的所有项目（文件/文件夹）
    const items = fs.readdirSync(dir);

    // 遍历处理每个项目
    items.forEach(item => {
        const itemPath = path.join(dir, item);       // 源项目完整路径
        const itemStats = fs.statSync(itemPath);     // 获取项目的状态信息
        const targetItemPath = path.join(targetDir, item); // 目标项目完整路径

        // 如果是目录，则递归处理子目录
        if (itemStats.isDirectory()) {
            // 确保目标目录存在
            if (!fs.existsSync(targetItemPath)) {
                fs.mkdirSync(targetItemPath);
            }
            // 递归处理子目录
            processDirectory(itemPath, targetItemPath);
        }
        // 如果是JS文件，则进行混淆处理
        else if (itemStats.isFile() && path.extname(item) === '.js') {
            try {
                console.log(`正在混淆: ${item}`);
                // 读取源JS文件内容
                const code = fs.readFileSync(itemPath, 'utf8');

                // 根据文件名获取对应的混淆配置
                const options = getOptions(item);

                // 执行代码混淆
                const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode();

                // 将混淆后的代码写入目标文件
                fs.writeFileSync(targetItemPath, obfuscatedCode);
                console.log(`已混淆: ${item}`);
            } catch (error) {
                // 处理出错时的降级策略：复制原始文件，保证流程继续
                console.error(`处理${item}时出错:`, error.message);
                fs.copyFileSync(itemPath, targetItemPath);
                console.log(`已复制原始文件: ${item}`);
            }
        }
        // 非JS文件（如HTML、CSS、图片等）直接复制到目标目录
        else {
            fs.copyFileSync(itemPath, targetItemPath);
            console.log(`已复制: ${item}`);
        }
    });
}

// 开始执行混淆处理流程
console.log('开始Chrome插件兼容模式混淆处理...');
processDirectory(sourceDir, targetDir);
console.log('混淆完成！结果保存在', targetDir);