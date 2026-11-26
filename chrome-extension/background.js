// AuraHUD Background Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('AuraHUD Extension installed successfully.');
});

// Listener for extension messages or tab navigation events
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'OK' });
  }
  return true;
});
