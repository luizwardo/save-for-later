// Background script to handle alarms and notifications
chrome.runtime.onInstalled.addListener(() => {
  console.log("Save for Later extension installed");
  // Set initial icon based on current theme
  updateIconBasedOnTheme();
});

// Function to detect and update icon based on theme
async function updateIconBasedOnTheme() {
  try {
    // Get stored theme preference
    const result = await chrome.storage.local.get(["isDarkTheme"]);
    const isDark = result.isDarkTheme;
    
    if (isDark !== undefined) {
      // Use stored preference
      const iconPath = isDark ? 'assets/icon.png' : 'assets/sfl-dark.png';
      
      await chrome.action.setIcon({
        path: {
          "48": iconPath,
          "128": iconPath
        }
      });
      
      console.log(`Icon updated to ${isDark ? 'dark' : 'light'} theme from storage`);
    } else {
      // Default to light theme icon
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
    // Handle tab screenshot capture
    captureTabPreview(request.url, request.forceCapture)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error("Error capturing preview:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  } else if (request.action === "getStoredPreview") {
    // Get stored preview for a URL
    getStoredPreview(request.url)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error("Error getting stored preview:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

// Function to capture tab preview
async function captureTabPreview(url, forceCapture = false) {
  try {
    console.log("Capturing preview for URL:", url);
    
    // Generate storage key for this URL
    const previewKey = `preview_${encodeURIComponent(url)}`;
    
    // Check if we already have a preview stored (unless force capture)
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
    
    // Get the active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      throw new Error("No active tab found");
    }
    
    // Verify the tab URL matches what we're trying to capture
    if (activeTab.url !== url) {
      console.warn("Active tab URL doesn't match requested URL", { active: activeTab.url, requested: url });
    }
    
    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
      format: 'png',
      quality: 85
    });
    
    if (!dataUrl) {
      throw new Error("Failed to capture tab screenshot");
    }
    
    // Store the captured image
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
    
    // Store the current theme preference
    await chrome.storage.local.set({ isDarkTheme: isDark });
    
    console.log(`Icon updated for ${isDark ? 'dark' : 'light'} theme via popup`);
  } catch (error) {
    console.error("Error updating icon from popup:", error);
  }
}

async function getThemeIcon() {
  try {
    const result = await chrome.storage.local.get(["isDarkTheme"]);
    const isDark = result.isDarkTheme || false;
    return isDark ? 'assets/icon.png' : 'assets/sfl-dark.png';
  } catch (error) {
    console.error("Error getting theme preference:", error);
    return 'assets/icon.png'; // Default fallback
  }
}

function showNotification(title, message, reminderId) {
  const notificationId = `reminder_${reminderId}`;
  
  getThemeIcon().then(iconUrl => {
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: iconUrl,
      title: title,
      message: message,
      priority: 2,
      buttons: [
        { title: 'Open Link' },
        { title: 'Dismiss' }
      ]
    });
  });

  // Auto-clear after 5 seconds
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 5000);
}

// Auto-delete past reminders function
async function autoDeletePastReminders() {
  try {
    const result = await chrome.storage.local.get(["reminders", "autoDeletePastReminders"]);
    const reminders = result.reminders || [];
    const autoDelete = result.autoDeletePastReminders || false;

    if (!autoDelete) return;

    const now = new Date();
    const pastReminders = reminders.filter(r => new Date(r.reminderDate) <= now && r.triggered);
    const activeReminders = reminders.filter(r => !(new Date(r.reminderDate) <= now && r.triggered));

    if (pastReminders.length > 0) {
      // Update storage with only active reminders
      await chrome.storage.local.set({ reminders: activeReminders });
      
      // Clear alarms for deleted reminders
      for (const reminder of pastReminders) {
        try {
          await chrome.alarms.clear(reminder.id);
        } catch (error) {
          console.warn("Failed to clear alarm for reminder:", reminder.id);
        }
      }
      
      console.log(`Auto-deleted ${pastReminders.length} past reminders`);
    }
  } catch (error) {
    console.error("Error auto-deleting past reminders:", error);
  }
}

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoDeleteCheck') {
    await autoDeletePastReminders();
    return;
  }
  
  console.log("Alarm triggered:", alarm.name);

  try {
    // Get the reminder from storage
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    const reminder = reminders.find((r) => r.id === alarm.name);

    if (reminder) {
      // Get the appropriate icon for current theme
      const iconUrl = await getThemeIcon();
      
      // Create notification
      await chrome.notifications.create(reminder.id, {
        type: "basic",
        iconUrl: iconUrl,
        title: "Save for Later Reminder",
        message: `Time to check: ${reminder.title}`,
        buttons: [{ title: "Open Link" }, { title: "Dismiss" }],
      });

      // Mark reminder as triggered
      const updatedReminders = reminders.map((r) =>
        r.id === reminder.id
          ? { ...r, triggered: true, triggeredAt: new Date().toISOString() }
          : r
      );
      await chrome.storage.local.set({ reminders: updatedReminders });
    }
  } catch (error) {
    console.error("Error handling alarm:", error);
  }

  // After handling the alarm, run auto-delete
  await autoDeletePastReminders();
});

// Run auto-delete periodically (every hour)
chrome.alarms.create('autoDeleteCheck', { 
  delayInMinutes: 60, 
  periodInMinutes: 60 
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    try {
      // Get the reminder from storage
      const result = await chrome.storage.local.get(["reminders"]);
      const reminders = result.reminders || [];
      const reminder = reminders.find((r) => r.id === notificationId);

      if (reminder) {
        if (buttonIndex === 0) {
          // Open Link
          await chrome.tabs.create({ url: reminder.url });
        }
        // For both buttons, clear the notification
        await chrome.notifications.clear(notificationId);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  }
);

// Handle notification clicks (clicking the notification body)
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    // Get the reminder from storage
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    const reminder = reminders.find((r) => r.id === notificationId);

    if (reminder) {
      // Open the link
      await chrome.tabs.create({ url: reminder.url });
      await chrome.notifications.clear(notificationId);
    }
  } catch (error) {
    console.error("Error handling notification click:", error);
  }
});

// Clean up old alarms and notifications on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    // Update icon based on current theme
    await updateIconBasedOnTheme();
    
    // Get all reminders
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];

    // Get all alarms
    const alarms = await chrome.alarms.getAll();

    // Clean up alarms for reminders that no longer exist
    for (const alarm of alarms) {
      const reminderExists = reminders.some((r) => r.id === alarm.name);
      if (!reminderExists && alarm.name !== 'autoDeleteCheck') {
        await chrome.alarms.clear(alarm.name);
      }
    }
  } catch (error) {
    console.error("Error cleaning up alarms:", error);
  }
});