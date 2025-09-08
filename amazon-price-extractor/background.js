chrome.commands.onCommand.addListener((command) => {
  if (command === "extract-info") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "extract-info" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("脚本可能未就绪:", chrome.runtime.lastError.message);
            // 可以在这里添加一些错误处理，例如，如果脚本没有注入，可以尝试注入它
          } else if (response && response.status === "done") {
            console.log("提取命令已成功发送并执行。");
          }
        });
      }
    });
  }
});