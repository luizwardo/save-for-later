document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("url-input");
  const titleInput = document.getElementById("title-input");
  const delayHours = document.getElementById("delay-hours");
  const delayMinutes = document.getElementById("delay-minutes");
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  const previewTime = document.getElementById("preview-time");
  
  // Folder elements
  const folderSelect = document.getElementById("folder-select");
  const newFolderInput = document.getElementById("new-folder");

  // Get current tab URL and title when popup opens
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      urlInput.value = tab.url;
      if (!titleInput.value) {
        titleInput.placeholder = tab.title || "Custom Title (optional)";
      }
      
      // Load site preview
      loadSitePreview(tab.url, tab.title);
    }
  } catch (error) {
    console.error("Error getting current tab:", error);
  }

  // Function to load site preview
  function loadSitePreview(url, title) {
    const siteTitle = document.getElementById("site-title");
    const siteDomain = document.getElementById("site-domain");
    const siteFavicon = document.getElementById("site-favicon");
    const miniPreviewIframe = document.getElementById("mini-preview-iframe");

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Update preview info
      if (siteTitle) siteTitle.textContent = title || "Untitled";
      if (siteDomain) siteDomain.textContent = domain;
      if (siteFavicon) {
        siteFavicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
      }
      if (miniPreviewIframe) {
        miniPreviewIframe.src = url;
      }
    } catch (error) {
      console.error("Error loading site preview:", error);
      if (siteTitle) siteTitle.textContent = "Invalid URL";
      if (siteDomain) siteDomain.textContent = "unknown";
    }
  }

  // Function to update preview time
  function updatePreview() {
    const hours = parseInt(delayHours.value) || 0;
    const minutes = parseInt(delayMinutes.value) || 0;

    if (hours === 0 && minutes === 0) {
      previewTime.textContent = "Please set a delay time";
      return;
    }

    const now = new Date();
    const reminderTime = new Date(
      now.getTime() + (hours * 60 + minutes) * 60 * 1000
    );
    previewTime.textContent = reminderTime.toLocaleString();
  }

  // Update preview when values change
  delayHours.addEventListener("input", updatePreview);
  delayMinutes.addEventListener("input", updatePreview);

  // Initial preview update
  updatePreview();

  // Load folders into select dropdown
  async function loadFolders() {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      const folders = result.folders || [];
      
      // Clear existing options except the first one
      folderSelect.innerHTML = '<option value="">Select folder</option>';
      
      // Add folders to select
      folders.forEach(folder => {
        const option = document.createElement("option");
        option.value = folder.id;
        option.textContent = folder.name;
        folderSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  }

  // Create new folder
  async function createFolder(name) {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      const folders = result.folders || [];
      
      // Check if folder already exists
      if (folders.some(folder => folder.name.toLowerCase() === name.toLowerCase())) {
        showError("Folder already exists");
        return null;
      }

      const newFolder = {
        id: generateId(),
        name: name,
        createdAt: new Date().toISOString()
      };

      folders.push(newFolder);
      await chrome.storage.local.set({ folders });
      
      await loadFolders();
      return newFolder.id;
    } catch (error) {
      console.error("Error creating folder:", error);
      showError("Failed to create folder");
      return null;
    }
  }

  // Handle new folder creation
  newFolderInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      const folderName = newFolderInput.value.trim();
      if (folderName) {
        const folderId = await createFolder(folderName);
        if (folderId) {
          folderSelect.value = folderId;
          newFolderInput.value = "";
          showSuccess("Folder created successfully!");
        }
      }
    }
  });

  // Clear new folder input when selecting existing folder
  folderSelect.addEventListener("change", () => {
    if (folderSelect.value) {
      newFolderInput.value = "";
    }
  });

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Load folders on startup
  await loadFolders();

  // Handle reminder setting
  setReminderBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    const customTitle = titleInput.value.trim();
    const hours = parseInt(delayHours.value) || 0;
    const minutes = parseInt(delayMinutes.value) || 0;
    
    // Get selected folder or create new one
    let selectedFolderId = folderSelect.value;
    const newFolderName = newFolderInput.value.trim();
    
    if (!selectedFolderId && newFolderName) {
      selectedFolderId = await createFolder(newFolderName);
      if (!selectedFolderId) return; // Failed to create folder
    }

    if (!url) {
      showError("Please enter a URL");
      return;
    }

    if (hours === 0 && minutes === 0) {
      showError("Please set a delay time (hours and/or minutes)");
      return;
    }

    try {
      await saveReminder(url, customTitle, hours, minutes, selectedFolderId);
      showSuccess("Reminder set successfully!");
      setTimeout(() => window.close(), 1500);
    } catch (error) {
      console.error("Error saving reminder:", error);
      showError("Failed to save reminder");
    }
  });

  // Handle settings button click
  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/settings/settings.html"),
    });
    window.close();
  });
});

async function saveReminder(url, customTitle, hours, minutes, folderId = null) {
  // Get current tab title if no custom title provided
  let title = customTitle;
  if (!title) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      title = tab ? tab.title : "Saved Link";
    } catch (error) {
      title = "Saved Link";
    }
  }

  // Calculate reminder date based on delay
  const now = new Date();
  const delayInMs = (hours * 60 + minutes) * 60 * 1000;
  const reminderDate = new Date(now.getTime() + delayInMs);

  // Create reminder object
  const reminder = {
    id: Date.now().toString(),
    url: url,
    title: title,
    reminderDate: reminderDate.toISOString(),
    createdAt: new Date().toISOString(),
    delayHours: hours,
    delayMinutes: minutes,
    folderId: folderId || null
  };

  // Save to storage
  const result = await chrome.storage.local.get(["reminders"]);
  const reminders = result.reminders || [];
  reminders.push(reminder);
  await chrome.storage.local.set({ reminders });

  // Create alarm for notification
  await chrome.alarms.create(reminder.id, {
    when: reminderDate.getTime(),
  });

  console.log("Reminder saved:", reminder);
}

function showError(message) {
  showNotification(message, "error");
}

function showSuccess(message) {
  showNotification(message, "success");
}

function showNotification(message, type) {
  // Remove existing notification
  const existing = document.querySelector(".notification");
  if (existing) {
    existing.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === "error" ? "#ff4444" : "#44ff44"};
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        animation: slideDown 0.3s ease-out;
    `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Add CSS for notification animation
const style = document.createElement("style");
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);
