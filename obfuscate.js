const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// 源文件夹和目标文件夹路径
const sourceDir = path.join(__dirname, 'changelink_moni');
const targetDir = path.join(__dirname, 'changelink_moni_obfuscated');

// 创建目标目录（如果不存在）
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 针对Chrome插件Service Worker优化的混淆配置
const obfuscationOptions = {
    // 基础配置
    compact: true,
    simplify: true,
    sourceMap: false,
    target: 'browser',

    // 标识符混淆（保留chrome相关API）
    identifierNamesGenerator: 'hexadecimal',
    reservedNames: [
        'chrome',
        'browser',
        'runtime',
        'tabs',
        'scripting',
        'webRequest',
        'storage'
    ],

    // 控制流混淆（适度开启，避免太复杂）
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.7,

    // 字符串处理（兼容Service Worker）
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayWrappersCount: 1, // 降低复杂度
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.8,

    // 禁用可能导致Service Worker出错的选项
    debugProtection: false, // 关闭调试保护（Service Worker不兼容）
    // 移除debugProtectionInterval或设置为0
    deadCodeInjection: false, // 关闭死代码注入（避免破坏事件监听）
    selfDefending: false, // 关闭自防御（可能导致代码无法解析）
    transformObjectKeys: false, // 不混淆对象键（避免破坏API调用）
    numbersToExpressions: false, // 不转换数字为表达式（避免Chrome API参数错误）
    unicodeEscapeSequence: false
};

// 处理文件和目录的函数
function processDirectory(dir, targetDir) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const itemPath = path.join(dir, item);
        const itemStats = fs.statSync(itemPath);
        const targetItemPath = path.join(targetDir, item);

        if (itemStats.isDirectory()) {
            if (!fs.existsSync(targetItemPath)) {
                fs.mkdirSync(targetItemPath);
            }
            processDirectory(itemPath, targetItemPath);
        } else if (itemStats.isFile() && path.extname(item) === '.js') {
            try {
                console.log(`正在混淆: ${item}`);
                const code = fs.readFileSync(itemPath, 'utf8');

                // 对background.js使用更保守的配置
                let options = obfuscationOptions;
                if (item === 'background.js') {
                    options = {
                        ...obfuscationOptions,
                        controlFlowFlattening: false, // 完全关闭控制流混淆
                        stringArrayWrappersCount: 0 // 不包装字符串数组
                    };
                }

                // 执行混淆
                const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode();

                // 保存混淆后的文件
                fs.writeFileSync(targetItemPath, obfuscatedCode);
                console.log(`已混淆: ${item}`);
            } catch (error) {
                console.error(`处理${item}时出错:`, error.message);
            }
        } else {
            fs.copyFileSync(itemPath, targetItemPath);
            console.log(`已复制: ${item}`);
        }
    });
}

// 开始处理
console.log('开始Chrome插件兼容模式混淆处理...');
processDirectory(sourceDir, targetDir);
console.log('混淆完成！结果保存在', targetDir);
