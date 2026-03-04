// Background script for Save for Later extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Save for Later extension installed");
  updateIconBasedOnTheme();
});

// Function to detect and update icon based on theme
async function updateIconBasedOnTheme() {
  try {
    const result = await chrome.storage.local.get(["isDarkTheme"]);
    const isDark = result.isDarkTheme;
    
    if (isDark !== undefined) {
      const iconPath = isDark ? 'assets/icon.png' : 'assets/sfl-dark.png';
      
      await chrome.action.setIcon({
        path: {
          "48": iconPath,
          "128": iconPath
        }
      });
      
      console.log(`Icon updated to ${isDark ? 'dark' : 'light'} theme from storage`);
    } else {
      const iconPath = 'assets/sfl-light.png';
      
      await chrome.action.setIcon({
        path: {
          "48": iconPath,
          "128": iconPath
        }
      });
      
      console.log("Icon updated to default (light) theme");
    }
  } catch (error) {
    console.error("Error updating icon:", error);
  }
}

// Handle messages from content scripts/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);
  
  if (request.action === "updateTheme") {
    updateIconBasedOnTheme();
    sendResponse({ success: true });
  } else if (request.action === "setIcon") {
    setIconFromPopup(request.iconPath, request.isDark);
    sendResponse({ success: true });
  } else if (request.action === "capturePreview") {
    captureTabPreview(request.url, request.forceCapture)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error("Error capturing preview:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === "getStoredPreview") {
    getStoredPreview(request.url)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error("Error getting stored preview:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Function to capture tab preview
async function captureTabPreview(url, forceCapture = false) {
  try {
    console.log("Capturing preview for URL:", url);
    
    const previewKey = `preview_${encodeURIComponent(url)}`;
    
    if (!forceCapture) {
      const stored = await chrome.storage.local.get([previewKey]);
      if (stored[previewKey]) {
        console.log("Using stored preview for:", url);
        return {
          success: true,
          dataUrl: stored[previewKey],
          cached: true
        };
      }
    }
    
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      throw new Error("No active tab found");
    }
    
    if (activeTab.url !== url) {
      console.warn("Active tab URL doesn't match requested URL", { active: activeTab.url, requested: url });
    }
    
    const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
      format: 'png',
      quality: 85
    });
    
    if (!dataUrl) {
      throw new Error("Failed to capture tab screenshot");
    }
    
    await chrome.storage.local.set({
      [previewKey]: dataUrl
    });
    
    console.log("Preview captured and stored for:", url);
    
    return {
      success: true,
      dataUrl: dataUrl,
      cached: false
    };
    
  } catch (error) {
    console.error("Error capturing tab preview:", error);
    throw error;
  }
}

// Function to get stored preview
async function getStoredPreview(url) {
  try {
    const previewKey = `preview_${encodeURIComponent(url)}`;
    const result = await chrome.storage.local.get([previewKey]);
    
    if (result[previewKey]) {
      return {
        success: true,
        dataUrl: result[previewKey],
        cached: true
      };
    } else {
      return {
        success: false,
        message: "No stored preview found"
      };
    }
  } catch (error) {
    console.error("Error getting stored preview:", error);
    throw error;
  }
}

// Function to clear stored preview for a URL
async function clearStoredPreview(url) {
  try {
    const previewKey = `preview_${encodeURIComponent(url)}`;
    await chrome.storage.local.remove([previewKey]);
    console.log("Cleared stored preview for:", url);
    return { success: true };
  } catch (error) {
    console.error("Error clearing stored preview:", error);
    throw error;
  }
}

async function setIconFromPopup(iconPath, isDark) {
  try {
    console.log("setIconFromPopup called with:", { iconPath, isDark });
    
    await chrome.action.setIcon({
      path: {
        "48": iconPath,
        "128": iconPath
      }
    });
    
    await chrome.storage.local.set({ isDarkTheme: isDark });
    
    console.log(`Icon updated for ${isDark ? 'dark' : 'light'} theme via popup`);
  } catch (error) {
    console.error("Error updating icon from popup:", error);
  }
}

// Clean up on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    await updateIconBasedOnTheme();
  } catch (error) {
    console.error("Error on startup:", error);
  }
});
