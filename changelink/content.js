// content.js

// 主函数，用于查找并转换ASIN
function convertAsinToLink() {
  // 根据用户提供的XPath，我们使用CSS选择器来定位元素
  // 寻找所有 class="modal-dialog" 的 div 内部的 class="productInfo" 的 td
  const productInfoCells = document.querySelectorAll('.modal-dialog .productInfo');

  productInfoCells.forEach(cell => {
    // 检查该元素是否已经被处理过，如果处理过则跳过，防止重复操作
    if (cell.dataset.asinLinked === 'true') {
      return;
    }

    // 在当前td中查找包含SKU信息的span
    const skuSpan = cell.querySelector('.pairProInfoSku');
    if (!skuSpan) {
      return;
    }

    // 使用正则表达式查找ASIN（B0开头的10位字符）
    const asinRegex = /(B0[A-Z0-9]{8})/;
    const originalHTML = skuSpan.innerHTML;
    const match = originalHTML.match(asinRegex);

    // 如果找到了ASIN
    if (match && match[1]) {
      const asin = match[1];
      
      // 构建亚马逊链接
      const amazonUrl = `https://www.amazon.com/dp/${asin}?th=1&psc=1`;

      // 创建一个新的<a>标签
      const link = document.createElement('a');
      link.href = amazonUrl;
      link.textContent = asin;
      link.target = '_blank'; // 在新标签页中打开
      link.style.color = '#007bff'; // 使用蓝色以示可点击
      link.style.fontWeight = 'bold'; // 加粗显示
      
      // 将原有的ASIN文本替换为我们创建的超链接HTML
      const newHTML = originalHTML.replace(asin, link.outerHTML);
      
      // 更新span的内容
      skuSpan.innerHTML = newHTML;

      // 标记该元素已被处理
      cell.dataset.asinLinked = 'true';
    }
  });
}

// 每隔1秒执行一次转换函数
setInterval(convertAsinToLink, 1000);

console.log('店小秘ASIN链接转换插件已加载。'); 