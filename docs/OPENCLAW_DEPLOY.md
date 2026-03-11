> 🔍 快速切换：[首页](/README.md) | [TK代理教程](/docs/PROXY_TIKTOK.md) | [物流中心教程](/docs/LOGISTICS_CENTER.md) | openclaw部署教程

# openclaw 部署教程

本教程将帮助你在本地完整部署 OpenClaw 并配置企业微信机器人。

## 一、环境准备

### 1. 安装 Git

前往 [Git 官网](https://git-scm.com/) 下载并安装 Git。

### 2. 设置 PowerShell 执行策略

以管理员身份打开 PowerShell，执行：

```powershell
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
```

## 二、安装 OpenClaw

### 1. 运行安装脚本

在 PowerShell 中执行：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

### 2. 配置 Gateway

```powershell
openclaw gateway install
openclaw config set gateway.mode local
openclaw gateway start
```

### 3. 安装企业微信插件

```powershell
openclaw plugins install @wecom/wecom-openclaw-plugin
openclaw channels add
```

## 三、配置企业微信机器人

### 1. 创建企业微信机器人

在企业微信中创建机器人，获取以下信息：
- **Bot ID**: `aibfPRxxxxxxxxxxxMsPR`
- **Secret**: `fg6caLxxxxxxxxxxxxxxxxxxxjK94qs`

### 2. 配置大模型

前往 [阿里大模型](https://www.aliyun.com/benefit/scene/codingplan) 购买 Coding Plan 服务，获取 API Key：
- **API Key**: `sk-sp-c92xxxxxxxxxxxxxxxxxxxd5b8`

前往 [字节大模型](https://volcengine.com/L/JcX5aSN82A4/) 购买 Coding Plan 服务，获取 API Key：
- **API Key**: `33exxxxx-xxxx-xxxx-xxxx-xxxxxxxf76f`

前往 [腾讯大模型](https://cloud.tencent.com/act/pro/codingplan#buy) 购买 Coding Plan 服务，获取 API Key：
- **API Key**: `sk-txxxx-xxxx-xxxx-xxxx-xxxxxxxxx`

## 四、后台启动 Gateway

使用以下命令后台启动 OpenClaw Gateway：

```powershell
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "C:\Users\xxxx电脑用户名xxxxx\AppData\Roaming\npm\node_modules\openclaw\dist\index.js", "gateway", "--port", "18789" -WindowStyle Hidden -PassThru
```

## 五、安装 Skills

OpenClaw 支持多种 skill，可以通过以下命令安装：

```powershell
openclaw skills install find-skills
openclaw skills install obsidian-ontology-sync
openclaw skills install playwright
openclaw skills install proactive-agent
openclaw skills install self-improvement
openclaw skills install summarize
openclaw skills install tavily
```

## 六、验证部署

完成以上步骤后，企业微信机器人应该已经可以正常使用。你可以尝试发送消息来验证配置是否成功。
