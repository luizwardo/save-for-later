document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("url-input");
  const titleInput = document.getElementById("title-input");
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  const previewTime = document.getElementById("preview-time");
  
  // Folder elements
  const folderSelect = document.getElementById("folder-select");
  const newFolderInput = document.getElementById("new-folder");
  const newFolderBtn = document.getElementById("new-folder-btn");

  // Timeline elements
  const label = document.getElementById("label");
  const slot = document.getElementById("slot");
  const timeBar = document.getElementById("time-bar");
  
  let isResizing = false;
  let currentHours = 0;
  let currentMinutes = 0;

  // Get current tab URL and title when popup opens
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      if (urlInput) urlInput.value = tab.url;
      if (titleInput && !titleInput.value) {
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
    const previewImage = document.querySelector(".preview-image");

    console.log("Loading site preview for:", url);

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Update preview info
      if (siteTitle) {
        siteTitle.textContent = title || "Untitled";
        console.log("Set title:", title);
      }
      if (siteDomain) {
        siteDomain.textContent = domain;
        console.log("Set domain:", domain);
      }
      
      // Handle favicon
      if (siteFavicon) {
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        siteFavicon.src = faviconUrl;
        siteFavicon.style.display = 'block';
        console.log("Loading favicon:", faviconUrl);
        
        siteFavicon.onerror = function() {
          console.log("Favicon failed to load");
          this.style.display = 'none';
        };
        siteFavicon.onload = function() {
          console.log("Favicon loaded successfully");
        };
      }

      // Handle iframe preview
      if (miniPreviewIframe && previewImage) {
        console.log("Setting up iframe preview");
        
        // Remove sandbox restrictions temporarily for testing
        miniPreviewIframe.removeAttribute('sandbox');
        
        // Try to load the site directly
        miniPreviewIframe.src = url;
        miniPreviewIframe.style.display = 'block';
        
        // Set loaded state after a short delay to show iframe
        setTimeout(() => {
          previewImage.classList.add('loaded');
          console.log("Preview marked as loaded");
        }, 1000);

        miniPreviewIframe.onload = function() {
          console.log("Iframe loaded successfully");
          previewImage.classList.add('loaded');
        };

        miniPreviewIframe.onerror = function() {
          console.log("Iframe failed to load");
          previewImage.classList.remove('loaded');
        };
      }
      
    } catch (error) {
      console.error("Error loading site preview:", error);
      if (siteTitle) siteTitle.textContent = "Invalid URL";
      if (siteDomain) siteDomain.textContent = "unknown";
      if (siteFavicon) siteFavicon.style.display = 'none';
    }
  }

  // Function to update preview time
  function updatePreview() {
    if (currentHours === 0 && currentMinutes === 0) {
      if (previewTime) previewTime.textContent = "Please set a delay time";
      return;
    }

    const now = new Date();
    const reminderTime = new Date(
      now.getTime() + (currentHours * 60 + currentMinutes) * 60 * 1000
    );
    if (previewTime) previewTime.textContent = reminderTime.toLocaleString();
    
    // Update timeline bar visual
    updateTimelineBar(currentHours, currentMinutes);
  }

  // Function to update timeline bar visual
  function updateTimelineBar(hours, minutes) {
    if (slot && timeBar && label) {
      const totalMinutes = hours * 60 + minutes;
      const maxMinutes = 24 * 60; // 24 hours max
      const percentage = Math.min(totalMinutes / maxMinutes, 1);
      
      // For slider handle: position it based on percentage
      const maxLeft = slot.offsetWidth - timeBar.offsetWidth;
      const newLeft = percentage * maxLeft;
      timeBar.style.left = `${newLeft}px`;
      
      if (totalMinutes < 60) {
        label.textContent = `${totalMinutes}m`;
      } else {
        label.textContent = `${hours}h ${minutes}m`;
      }
    }
  }

  // Initial preview update
  updatePreview();

  // Timeline dragging functionality - only add if elements exist
  if (timeBar && slot && label) {
    timeBar.addEventListener("mousedown", (e) => {
      isResizing = true;
      timeBar.classList.add("dragging");
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const slotRect = slot.getBoundingClientRect();
      const handleWidth = timeBar.offsetWidth;
      const maxLeft = slotRect.width - handleWidth;
      const newLeft = Math.max(0, Math.min(maxLeft, e.clientX - slotRect.left - handleWidth / 2));
      
      // Calculate percentage based on handle position
      const percentage = maxLeft > 0 ? newLeft / maxLeft : 0;
      
      // Calculate time based on percentage (max 24 hours)
      const maxMinutes = 24 * 60;
      const totalMinutes = Math.round(percentage * maxMinutes);
      
      // Snap to 5-minute intervals
      const snappedMinutes = Math.round(totalMinutes / 5) * 5;
      
      currentHours = Math.floor(snappedMinutes / 60);
      currentMinutes = snappedMinutes % 60;
      
      // Update handle position based on snapped time
      const snappedPercentage = snappedMinutes / maxMinutes;
      const snappedLeft = snappedPercentage * maxLeft;
      timeBar.style.left = `${snappedLeft}px`;
      
      // Update label
      if (snappedMinutes < 60) {
        label.textContent = `${snappedMinutes}m`;
      } else {
        label.textContent = `${currentHours}h ${currentMinutes}m`;
      }
      
      // Update preview
      updatePreview();
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
      timeBar.classList.remove("dragging");
      document.body.style.userSelect = "auto";
    });
  }

  // Load folders into select dropdown
  async function loadFolders() {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      const folders = result.folders || [];
      
      if (folderSelect) {
        // Clear existing options except the first one
        folderSelect.innerHTML = '<option value="">Select folder</option>';
        
        // Add folders to select
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

  // Handle new folder button click
  if (newFolderBtn && newFolderInput) {
    newFolderBtn.addEventListener("click", () => {
      newFolderBtn.classList.add("hidden");
      newFolderInput.classList.remove("hidden");
      newFolderInput.focus();
    });

    // Handle clicking outside or escape to cancel
    document.addEventListener("click", (e) => {
      if (!newFolderInput.contains(e.target) && !newFolderBtn.contains(e.target)) {
        if (!newFolderInput.value.trim()) {
          hideNewFolderInput();
        }
      }
    });

    newFolderInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideNewFolderInput();
      }
    });
  }

  function hideNewFolderInput() {
    if (newFolderInput && newFolderBtn) {
      newFolderInput.classList.add("hidden");
      newFolderInput.value = "";
      newFolderBtn.classList.remove("hidden");
    }
  }

  // Handle new folder creation - only add if element exists
  if (newFolderInput) {
    newFolderInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const folderName = newFolderInput.value.trim();
        if (folderName) {
          const folderId = await createFolder(folderName);
          if (folderId && folderSelect) {
            folderSelect.value = folderId;
            hideNewFolderInput();
            showSuccess("Folder created and selected!");
          }
        }
      }
    });
  }

  // Remove the old folder select change handler since we don't need to clear input anymore
  // Clear new folder input when selecting existing folder - only add if elements exist
  if (folderSelect && newFolderInput) {
    folderSelect.addEventListener("change", () => {
      if (folderSelect.value) {
        hideNewFolderInput();
      }
    });
  }

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Load folders on startup
  await loadFolders();

  // Modal elements
  const successModal = document.getElementById('success-modal');
  const successMessage = document.getElementById('success-message');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closePopupBtn = document.getElementById('close-popup-btn');

  // Handle reminder setting - only add if element exists
  if (setReminderBtn) {
    setReminderBtn.addEventListener("click", async () => {
      const url = urlInput ? urlInput.value.trim() : "";
      const customTitle = titleInput ? titleInput.value.trim() : "";
      
      // Get selected folder or create new one
      let selectedFolderId = folderSelect ? folderSelect.value : "";
      const newFolderName = newFolderInput ? newFolderInput.value.trim() : "";
      
      if (!selectedFolderId && newFolderName) {
        selectedFolderId = await createFolder(newFolderName);
        if (!selectedFolderId) return; // Failed to create folder
      }

      if (!url) {
        showError("Please enter a URL");
        return;
      }

      if (currentHours === 0 && currentMinutes === 0) {
        showError("Please set a delay time using the drag bar");
        return;
      }

      try {
        await saveReminder(url, customTitle, currentHours, currentMinutes, selectedFolderId);
        
        // Show success modal instead of closing immediately
        const timeText = currentHours > 0 ? 
          `${currentHours}h ${currentMinutes}m` : 
          `${currentMinutes}m`;
        
        if (successMessage) {
          successMessage.textContent = `You'll be reminded in ${timeText}`;
        }
        
        if (successModal) {
          successModal.classList.remove('hidden');
        }
        
      } catch (error) {
        console.error("Error saving reminder:", error);
        showError("Failed to save reminder");
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

  // Close modal when clicking outside
  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        window.close();
      }
    });
  }
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