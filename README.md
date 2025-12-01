# Chrome 插件使用指南

本指南将帮助您安装和使用我们的Chrome浏览器插件，提升您的工作效率。

---

## 🐵 安装篡改猴

首先，您需要安装"篡改猴"（Tampermonkey）扩展程序，这是一个用户脚本管理器，用于管理和运行各种用户脚本。

1. **[前往Chrome应用商店安装](https://chromewebstore.google.com/detail/%E7%AF%A1%E6%94%B9%E7%8C%B4/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=zh-CN&utm_source=ext_sidebar)**
   - 比特浏览器建议在 扩展中心 -> Tampermonkey右下角的"设置" -> 所有窗口 -> 确定 -> 重启浏览器即可看到插件
2. **配置权限**
   - 打开Chrome扩展管理页面：[chrome://extensions/](chrome://extensions/)
   - ✅ 打开右上角的"开发者模式"
   - 找到插件列表中的"篡改猴"扩展，点击"详情"  
   或者直接访问: [chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo](chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - 勾选以下选项：
       - ✅ 允许运行用户脚本
       - ✅ 固定到工具栏
       - ✅ 在无痕模式下启用
       - ✅ 允许访问文件网址
3. **选择下方需要用到的脚本，点击"安装"按钮进行安装。**



## 🚀 可用脚本

| 脚本名称                             | 功能描述                                     | 适用平台             | 安装链接                                                                                                                           |
|----------------------------------|------------------------------------------|------------------|--------------------------------------------------------------------------------------------------------------------------------|
| ASIN->链接 - 店小秘                   | 将亚马逊ASIN转换为可点击的链接，方便店小秘用户快速访问商品页面        | 店小秘              | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/asin_to_link.user.js)                   |
| 提取品牌词 - 店小秘 - 产品shein            | 从页面中提取品牌关键词，特别适用于店小秘-产品-SHEIN            | 店小秘              | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/extract_brand_words.user.js)            |
| 加载全部商品 - 亚马逊 - 搜索页               | 在亚马逊搜索结果页面自动加载所有商品，无需手动点击"下一页",并且移除烦人的广告 | 亚马逊              | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/amazon_all_products_on_one_page.user.js) |
| 提取可参加活动的SKC - 已上架 - 商品列表 - SHEIN | 提取已上架商品中可参加活动的SKC,规则:今天0点之前\五百条一个excel文件 | SHEIN            | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_extract_product_list.user.js) |
| 批量上下架 - SHEIN                    | 批量上下架商品,或者指定SKC的指定站点                     | SHEIN            | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_removed_shelves.user.js) |
| 发缺货 - 店小秘                        | 批量发搜索列表内的缺货                              | 店小秘              | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/dxm_send_out_of_stock.user.js) |
| 亚马逊物流验证                          | 验证物流单号是否可用                               | track.amazon.com | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/amazon_track.user.js) |
| 粘贴板>跟踪号 - 店小秘                    | 把粘贴板中的跟踪号粘贴到跟踪号输入框                       | 店小秘              | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/dxm_ship_without_order_form_ctrl_v.user.js) |
| 导出议价待确认订单 - SHEIN                | 导出SHEIN店铺中所有议价待确认订单到excel文件              | SHEIN            | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_export_premium_pending_confirmation.user.js) |
| 店小秘审单工具                          | 提供店小秘快捷审核功能                              | 店小秘            | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/price_assistant.user.js) |
| 批量议价 - SHEIN                    | 批量同意平台建议价\                               | SHEIN            | [安装](https://raw.githubusercontent.com/68110923/chrome_plugins/main/plugins_yh/shein_agree_to_negotiate_price.user.js) |



---

## 💡 使用提示

- 所有脚本都可以通过篡改猴图标进行启用/禁用
- 如遇到问题，可以尝试禁用其他脚本进行排查
- 建议定期更新脚本以获得最新功能

---

## 📞 支持

如有任何问题或建议，请通过以下方式联系我们：

- **GitHub Issues**: [提交问题](https://github.com/68110923/chrome_plugins/issues)
- **邮箱**: 68110923@qq.com (不常用)

---

## 📋 后续开发任务
- 财务部:shein店铺财务详情数据    
    - 1)提供统一的单店铺下载位置: 把导出的excel直接放在服务器(全部店铺)
    - 2)提供全部的店铺订单数据: 导出+清洗数据(全部店铺)
    - 3)提供快速导出店铺订单数据的插件: 一键导出当前店铺的订单数据excel(在店铺内使用)


- 妙手批量插件采集  


- 运营部:差评履约率





- 运营部:核价助手 优化
  - 1)应用及时
  - 2)错误的直接跳转亚马逊
  - 3)审单完成刷一新页面


- 采购部:自动拉取 店小秘-待处理 的订单数据
  - 1)每天8点到16点之间每隔2小时拉取一次
  - 2)按"排单模版"导出为excel文件\拆分＋清洗数据\入库



---