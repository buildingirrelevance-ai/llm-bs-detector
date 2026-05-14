// background.js
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel?.open) {
    chrome.sidePanel.setOptions({ tabId: tab.id, path: "panel.html", enabled: true });
    chrome.sidePanel.open({ tabId: tab.id });
  } else {
    console.error("[BS Detector] chrome.sidePanel is not available:", chrome.sidePanel);
  }
});