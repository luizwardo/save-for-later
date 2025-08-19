document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup loading started...");
  
  // Initialize theme
  // Theme now automatically follows system preference
  
  // Get all elements
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  const previewTime = document.getElementById("preview-time");
  
  // Folder elements
  const folderSelect = document.getElementById("folder-select");
  const newFolderInput = document.getElementById("new-folder");
  const newFolderBtn = document.getElementById("new-folder-btn");

  // DateTime picker elements
  const reminderDate = document.getElementById('reminder-date');
  const reminderTime = document.getElementById('reminder-time');
  const clearDateTimeBtn = document.getElementById('clear-datetime');
  const reminderToggle = document.getElementById('reminder-toggle');
  const datetimeContainer = document.getElementById('datetime-container');
  
  // Modal elements
  const successModal = document.getElementById('success-modal');
  const successMessage = document.getElementById('success-message');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closePopupBtn = document.getElementById('close-popup-btn');
  
  let selectedDateTime = null;
  let currentTabUrl = '';
  let currentTabTitle = '';

  // Get current tab URL and title when popup opens
  try {
    console.log("Getting current tab...");
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      console.log("Tab found:", tab.url);
      currentTabUrl = tab.url;
      currentTabTitle = tab.title;
      loadSitePreview(tab.url, tab.title);
    } else {
      console.log("No active tab found");
    }
  } catch (error) {
    console.error("Error getting current tab:", error);
  }

  // Function to check if image should be marked as small/distorted
  function checkAndMarkSmallImage(imageEl) {
    try {
      if (!imageEl || imageEl.style.display === 'none') return;
      
      // Get natural image dimensions
      const naturalWidth = imageEl.naturalWidth;
      const naturalHeight = imageEl.naturalHeight;
      
      console.log('Image dimensions:', naturalWidth, 'x', naturalHeight);
      
      // Check for problematic images
      const isVerySmall = naturalWidth < 100 || naturalHeight < 100;
      const hasWeirdAspectRatio = (naturalWidth / naturalHeight) > 3 || (naturalHeight / naturalWidth) > 3;
      const isSquareIcon = Math.abs(naturalWidth - naturalHeight) < 10 && naturalWidth < 200;
      const isTooNarrow = naturalWidth < 150 && naturalHeight > naturalWidth * 2;
      
      const shouldBeSmall = isVerySmall || hasWeirdAspectRatio || isSquareIcon || isTooNarrow;
      
      if (shouldBeSmall) {
        console.log('Marking image as small/distorted:', {
          isVerySmall,
          hasWeirdAspectRatio,
          isSquareIcon,
          isTooNarrow
        });
        imageEl.classList.add('small-preview');
      } else {
        console.log('Image appears normal, keeping full size');
        imageEl.classList.remove('small-preview');
      }
    } catch (error) {
      console.error('Error checking image dimensions:', error);
    }
  }

  // Function to load site preview
  function loadSitePreview(url, title) {
    console.log("loadSitePreview called with:", url, title);
    
    const siteTitle = document.getElementById("site-title");
    const siteDomain = document.getElementById("site-domain");
    const siteFavicon = document.getElementById("site-favicon");
    const previewImage = document.getElementById("preview-image");
    const previewLoading = document.getElementById("preview-loading");

    console.log("Elements found:", { siteTitle, siteDomain, siteFavicon, previewImage, previewLoading });
    console.log("Loading site preview for:", url);

    // Show loading state
    if (previewLoading) {
      previewLoading.style.display = 'block';
    }
    if (previewImage) {
      previewImage.style.display = 'none';
    }

    try {
      // Skip chrome:// URLs and extension URLs
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
        console.log("Skipping chrome/extension URL:", url);
        if (siteTitle) siteTitle.textContent = title || "Browser Page";
        if (siteDomain) siteDomain.textContent = "Internal";
        if (siteFavicon) siteFavicon.style.display = 'none';
        if (previewImage) {
          previewImage.src = '';
          previewImage.style.display = 'none';
        }
        if (previewLoading) {
          previewLoading.style.display = 'none';
        }
        return;
      }

      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Update preview info
      if (siteTitle) {
        siteTitle.textContent = title || "Untitled";
      }
      if (siteDomain) {
        siteDomain.textContent = domain;
      }
      
      // Handle favicon for both small icon and large preview
      const isValidDomain = domain && 
                         domain !== 'localhost' && 
                         !domain.startsWith('127.') && 
                         !domain.includes('extension') &&
                         domain.includes('.') && 
                         domain.length > 2;

      if (isValidDomain) {
        // Small favicon icon
        if (siteFavicon) {
          const smallFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
          siteFavicon.src = smallFaviconUrl;
          siteFavicon.style.display = 'block';
          
          siteFavicon.onerror = function() {
            console.log("Small favicon failed for domain:", domain);
            this.style.display = 'none';
            this.src = '';
            this.onerror = null;
          };
        }

        // Large favicon as preview image
        if (previewImage) {
          const largeFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
          
          previewImage.onload = function() {
            console.log("Large favicon loaded successfully for:", domain);
            if (previewLoading) previewLoading.style.display = 'none';
            previewImage.style.display = 'block';
          };
          
          previewImage.onerror = function() {
            console.log("Large favicon failed, trying alternative for domain:", domain);
            // Try alternative favicon sources
            const altFaviconUrl = `https://icon.horse/icon/${domain}`;
            
            previewImage.onload = function() {
              console.log("Alternative favicon loaded for:", domain);
              if (previewLoading) previewLoading.style.display = 'none';
              previewImage.style.display = 'block';
            };
            
            previewImage.onerror = function() {
              console.log("All favicon sources failed for domain:", domain);
              if (previewLoading) previewLoading.style.display = 'none';
              previewImage.style.display = 'none';
            };
            
            previewImage.src = altFaviconUrl;
          };
          
          previewImage.src = largeFaviconUrl;
        }
      } else {
        console.log("Invalid domain for favicon:", domain);
        if (siteFavicon) {
          siteFavicon.style.display = 'none';
          siteFavicon.src = '';
        }
        if (previewImage) {
          previewImage.style.display = 'none';
          previewImage.src = '';
        }
        if (previewLoading) {
          previewLoading.style.display = 'none';
        }
      }
      
    } catch (error) {
      console.error("Error loading site preview:", error);
      
      if (siteTitle) siteTitle.textContent = title || "Invalid URL";
      if (siteDomain) siteDomain.textContent = "unknown";
      if (siteFavicon) {
        siteFavicon.style.display = 'none';
        siteFavicon.src = '';
      }
      if (previewImage) {
        previewImage.style.display = 'none';
        previewImage.src = '';
      }
      if (previewLoading) {
        previewLoading.style.display = 'none';
      }
    }
    
    console.log("loadSitePreview completed");
  }

  // Function to update preview time
  function updatePreview() {
    if (!selectedDateTime) {
      if (previewTime) previewTime.textContent = "No reminder set - will save immediately";
      updateButtonText();
      return;
    }

    if (previewTime) {
      previewTime.textContent = selectedDateTime.toLocaleDateString() + " at " + 
        selectedDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    updateButtonText();
  }

  // Function to update button text based on selection
  function updateButtonText() {
    if (setReminderBtn) {
      if (!selectedDateTime) {
        setReminderBtn.textContent = "SAVE LINK";
      } else {
        setReminderBtn.textContent = "Save with Reminder";
      }
    }
  }

  // Initialize datetime picker
  function initDateTimePicker() {
    if (!reminderDate || !reminderTime || !clearDateTimeBtn) {
      console.error("DateTime picker elements not found");
      return;
    }

    // Set minimum date to today
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    reminderDate.min = todayString;

    // Event listeners for date and time inputs
    function updateSelectedDateTime() {
      const dateValue = reminderDate.value;
      const timeValue = reminderTime.value;
      
      if (dateValue && timeValue) {
        const combinedDateTime = new Date(`${dateValue}T${timeValue}`);
        const now = new Date();
        
        // Check if selected time is in the past
        if (combinedDateTime <= now) {
          showError("Please select a future date and time");
          selectedDateTime = null;
        } else {
          selectedDateTime = combinedDateTime;
        }
      } else {
        selectedDateTime = null;
      }
      
      updatePreview();
    }

    reminderDate.addEventListener('change', updateSelectedDateTime);
    reminderTime.addEventListener('change', updateSelectedDateTime);

    // Clear button functionality
    clearDateTimeBtn.addEventListener('click', () => {
      reminderDate.value = '';
      reminderTime.value = '';
      selectedDateTime = null;
      updatePreview();
    });

    // Reminder toggle functionality
    reminderToggle.addEventListener('click', () => {
      const isExpanded = reminderToggle.classList.contains('expanded');
      
      if (isExpanded) {
        // Collapse
        reminderToggle.classList.remove('expanded');
        datetimeContainer.classList.add('hidden');
      } else {
        // Expand
        reminderToggle.classList.add('expanded');
        datetimeContainer.classList.remove('hidden');
      }
    });

    // Set default time if date is selected but time is not
    reminderDate.addEventListener('change', () => {
      if (reminderDate.value && !reminderTime.value) {
        // Set default time to current time + 1 hour
        const now = new Date();
        now.setHours(now.getHours() + 1);
        const timeString = now.toTimeString().slice(0, 5);
        reminderTime.value = timeString;
        updateSelectedDateTime();
      }
    });
  }

  // Load folders
  async function loadFolders() {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      const folders = result.folders || [];
      
      if (folderSelect) {
        folderSelect.innerHTML = '<option value="">Select folder</option>';
        
        folders.forEach(folder => {
          const option = document.createElement("option");
          option.value = folder.id;
          option.textContent = folder.name;
          folderSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  }

  // Create new folder
  async function createFolder(name) {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      const folders = result.folders || [];
      
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

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Handle new folder functionality
  if (newFolderBtn && newFolderInput) {
    newFolderBtn.addEventListener("click", () => {
      newFolderBtn.classList.add("hidden");
      newFolderInput.classList.remove("hidden");
      newFolderInput.focus();
    });

    newFolderInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const folderName = newFolderInput.value.trim();
        if (folderName) {
          const folderId = await createFolder(folderName);
          if (folderId && folderSelect) {
            folderSelect.value = folderId;
            newFolderInput.classList.add("hidden");
            newFolderInput.value = "";
            newFolderBtn.classList.remove("hidden");
            showSuccess("Folder created and selected!");
          }
        }
      }
    });

    newFolderInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        newFolderInput.classList.add("hidden");
        newFolderInput.value = "";
        newFolderBtn.classList.remove("hidden");
      }
    });
  }

  // Handle save button
  if (setReminderBtn) {
    setReminderBtn.addEventListener("click", async () => {
      const url = currentTabUrl;
      const customTitle = currentTabTitle;
      
      let selectedFolderId = folderSelect ? folderSelect.value : "";
      const newFolderName = newFolderInput && !newFolderInput.classList.contains('hidden') ? newFolderInput.value.trim() : "";
      
      if (!selectedFolderId && newFolderName) {
        selectedFolderId = await createFolder(newFolderName);
        if (!selectedFolderId) return;
      }

      if (!url) {
        showError("No URL found for current tab");
        return;
      }

      try {
        if (selectedDateTime) {
          // Save with reminder
          await saveReminderWithDateTime(url, customTitle, selectedDateTime, selectedFolderId);
          
          const dateText = selectedDateTime.toLocaleDateString();
          const timeText = selectedDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          
          if (successMessage) {
            successMessage.textContent = `You'll be reminded on ${dateText} at ${timeText}`;
          }
        } else {
          // Save without reminder
          await saveLinkWithoutReminder(url, customTitle, selectedFolderId);
          
          if (successMessage) {
            successMessage.textContent = "";
          }
        }
        
        if (successModal) {
          successModal.classList.remove('hidden');
        }
        
      } catch (error) {
        console.error("Error saving:", error);
        showError("Failed to save link");
      }
    });
  }

  // Handle modal buttons
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/settings/settings.html"),
      });
      window.close();
    });
  }

  if (closePopupBtn) {
    closePopupBtn.addEventListener('click', () => {
      window.close();
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/settings/settings.html"),
      });
      window.close();
    });
  }

  // Initialize everything
  await loadFolders();
  console.log("Folders loaded");
  
  initDateTimePicker();
  console.log("Time picker initialized");
  
  updatePreview();
  console.log("Preview updated");

  console.log("Popup initialized successfully");
});

// Theme detection and icon update
function updateThemeIcon() {
  try {
    console.log("updateThemeIcon called");
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const iconPath = prefersDark ? 'assets/icon_128_white.png' : 'assets/icon_128.png';
    
    console.log("Theme detected - Dark mode:", prefersDark);
    console.log("Icon path selected:", iconPath);
    
    // Send message to background script to update icon
    chrome.runtime.sendMessage({
      action: "setIcon",
      iconPath: iconPath,
      isDark: prefersDark
    }).then(response => {
      console.log("Icon update response:", response);
    }).catch(error => {
      console.log("Could not update theme icon:", error);
    });
  } catch (error) {
    console.log("Theme detection error:", error);
  }
}

// Listen for theme changes while popup is open
if (window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addListener(updateThemeIcon);
}

// Save with reminder
async function saveReminder(url, customTitle, hours, minutes, folderId = null) {
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

  const now = new Date();
  const delayInMs = (hours * 60 + minutes) * 60 * 1000;
  const reminderDate = new Date(now.getTime() + delayInMs);

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

  const result = await chrome.storage.local.get(["reminders"]);
  const reminders = result.reminders || [];
  reminders.push(reminder);
  await chrome.storage.local.set({ reminders });

  await chrome.alarms.create(reminder.id, {
    when: reminderDate.getTime(),
  });

  console.log("Reminder saved:", reminder);
}

// Save with specific datetime
async function saveReminderWithDateTime(url, customTitle, reminderDateTime, folderId = null) {
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

  const reminder = {
    id: Date.now().toString(),
    url: url,
    title: title,
    reminderDate: reminderDateTime.toISOString(),
    createdAt: new Date().toISOString(),
    folderId: folderId || null
  };

  const result = await chrome.storage.local.get(["reminders"]);
  const reminders = result.reminders || [];
  reminders.push(reminder);
  await chrome.storage.local.set({ reminders });

  await chrome.alarms.create(reminder.id, {
    when: reminderDateTime.getTime(),
  });

  console.log("Reminder saved with specific datetime:", reminder);
}

// Save without reminder
async function saveLinkWithoutReminder(url, customTitle, folderId = null) {
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

  const linkData = {
    id: Date.now().toString(),
    url: url,
    title: title,
    createdAt: new Date().toISOString(),
    folderId: folderId || null
  };

  const result = await chrome.storage.local.get(["reminders"]);
  const reminders = result.reminders || [];
  reminders.push(linkData);
  await chrome.storage.local.set({ reminders });

  console.log("Link saved without reminder:", linkData);
}

// Notification functions
function showError(message) {
  showNotification(message, "error");
}

function showSuccess(message) {
  showNotification(message, "success");
}

function showNotification(message, type) {
  const existing = document.querySelector(".notification");
  if (existing) {
    existing.remove();
  }

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

// Theme functions removed - now using system preference detection

console.log("Popup script loaded successfully");