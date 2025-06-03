// It manages events and interactions that occur outside of the popup and manager interfaces, 
// such as listening for tab updates and handling storage.

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ savedLinks: [] }, () => {
        console.log("Initialized saved links storage.");
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        // You can add logic here to handle tab updates if needed
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveLink") {
        chrome.storage.sync.get("savedLinks", (data) => {
            const savedLinks = data.savedLinks || [];
            savedLinks.push(request.link);
            chrome.storage.sync.set({ savedLinks }, () => {
                sendResponse({ success: true });
            });
        });
        return true; // Indicates that the response will be sent asynchronously
    }
});