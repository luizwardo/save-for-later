document.addEventListener("DOMContentLoaded", async () => {
  const upcomingRemindersContainer =
    document.getElementById("upcoming-reminders");
  const pastRemindersContainer = document.getElementById("past-reminders");
  const backBtn = document.getElementById("back-btn");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const testNotificationBtn = document.getElementById("test-notification-btn");
  const debugInfo = document.getElementById("debug-info");

  // New sidebar elements
  const navItems = document.querySelectorAll(".nav-item");
  const contentSections = document.querySelectorAll(".content-section");
  const addFolderBtn = document.getElementById("add-folder-btn");
  const addFolderModal = document.getElementById("add-folder-modal");
  const createFolderBtn = document.getElementById("create-folder-btn");
  const cancelFolderBtn = document.getElementById("cancel-folder-btn");
  const newFolderInput = document.getElementById("new-folder-input");
  const foldersNav = document.getElementById("folders-nav");

  const autoDeleteCheckbox = document.getElementById("auto-delete");

  // Debug logging function
  function debugLog(message, level = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry log-level-${level}`;
    logEntry.innerHTML = `<span class="timestamp">${timestamp}</span>${message}`;
    debugInfo.appendChild(logEntry);
    debugInfo.scrollTop = debugInfo.scrollHeight;
    console.log(`[Settings] ${message}`);
  }

  // Test notification button
  testNotificationBtn.addEventListener("click", async () => {
    debugLog("Testing notification...", "info");

    try {
      // Check notification permission
      const permission = await Notification.requestPermission();
      debugLog(
        `Notification permission: ${permission}`,
        permission === "granted" ? "success" : "error"
      );

      if (permission !== "granted") {
        debugLog(
          "Notification permission denied. Please enable notifications for this extension.",
          "error"
        );
        return;
      }

      // Send message to background script to create notification
      const response = await chrome.runtime.sendMessage({
        action: "testNotification",
      });

      if (response && response.success) {
        debugLog("Test notification sent successfully!", "success");
      } else {
        debugLog("Failed to send test notification", "error");
      }
    } catch (error) {
      debugLog(`Error testing notification: ${error.message}`, "error");
      console.error("Test notification error:", error);
    }
  });

  // Load settings on page load
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(["autoDeletePastReminders"]);
      const autoDelete = result.autoDeletePastReminders || false;
      
      if (autoDeleteCheckbox) {
        autoDeleteCheckbox.checked = autoDelete;
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  // Save settings when checkbox changes
  function initSettingsListeners() {
    if (autoDeleteCheckbox) {
      autoDeleteCheckbox.addEventListener("change", async (e) => {
        try {
          await chrome.storage.local.set({ 
            autoDeletePastReminders: e.target.checked 
          });
          console.log("Auto-delete setting saved:", e.target.checked);
        } catch (error) {
          console.error("Error saving setting:", error);
        }
      });
    }
  }

  // Initialize debug info on load
  async function initDebugInfo() {
    try {
      // Check permissions
      const permissions = await chrome.permissions.getAll();
      debugLog(
        `Extension permissions: ${permissions.permissions.join(", ")}`,
        "info"
      );

      // Check alarms
      const alarms = await chrome.alarms.getAll();
      debugLog(`Active alarms: ${alarms.length}`, "info");
      alarms.forEach((alarm) => {
        const triggerTime = new Date(alarm.scheduledTime).toLocaleString();
        debugLog(`Alarm ${alarm.name}: ${triggerTime}`, "info");
      });

      // Check storage
      const storage = await chrome.storage.local.get(["reminders"]);
      const reminders = storage.reminders || [];
      debugLog(`Stored reminders: ${reminders.length}`, "info");
    } catch (error) {
      debugLog(`Error initializing debug info: ${error.message}`, "error");
    }
  }

  // Initialize debug info
  initDebugInfo();

  // Back button functionality
  backBtn.addEventListener("click", () => {
    window.close();
  });

  // Clear all reminders
  clearAllBtn.addEventListener("click", async () => {
    if (
      confirm(
        "Are you sure you want to clear all reminders? This action cannot be undone."
      )
    ) {
      try {
        // Clear all alarms
        const alarms = await chrome.alarms.getAll();
        for (const alarm of alarms) {
          await chrome.alarms.clear(alarm.name);
        }

        // Clear storage
        await chrome.storage.local.set({ reminders: [] });

        // Refresh the display
        await loadReminders();

        showNotification("All reminders cleared successfully", "success");
      } catch (error) {
        console.error("Error clearing reminders:", error);
        showNotification("Failed to clear reminders", "error");
      }
    }
  });

  // Initialize sidebar navigation
  function initSidebarNavigation() {
    // Handle static nav items
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const sectionName = item.dataset.section;
        const folderId = item.dataset.folderId;

        if (folderId) {
          loadFolderContent(folderId);
          switchToSection("folder-content", item);
        } else if (sectionName) {
          switchToSection(sectionName, item);
        }
      });
    });

    // Handle dynamic folder items
    if (foldersNav) {
      foldersNav.addEventListener("click", (e) => {
        const folderItem = e.target.closest(".folder-item");
        if (folderItem) {
          e.preventDefault();
          const folderId = folderItem.dataset.folderId;
          loadFolderContent(folderId);
          switchToSection("folder-content", folderItem);
        }
      });
    }
  }

  // Switch between content sections
  function switchToSection(sectionName, activeNavItem) {
    // Remove active from all nav items
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    if (activeNavItem) {
      activeNavItem.classList.add("active");
    }

    // Hide all content sections
    contentSections.forEach((section) => section.classList.remove("active"));

    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    // Load content based on section
    switch (sectionName) {
      case "all-links":
        loadAllLinks();
        break;
      case "reminders":
        loadReminders();
        break;
      case "debug":
        initDebugInfo();
        break;
      case "logs":
        loadLogs();
        break;
      case "advanced":
        // Advanced settings section is static
        break;
    }
  }

  // Initialize folder management
  function initFolderManagement() {
    if (addFolderBtn) {
      addFolderBtn.addEventListener("click", () => {
        addFolderModal.classList.add("show");
        newFolderInput.focus();
      });
    }

    if (cancelFolderBtn) {
      cancelFolderBtn.addEventListener("click", () => {
        addFolderModal.classList.remove("show");
        newFolderInput.value = "";
      });
    }

    if (createFolderBtn) {
      createFolderBtn.addEventListener("click", async () => {
        const folderName = newFolderInput.value.trim();
        if (folderName) {
          await createFolder(folderName);
          addFolderModal.classList.remove("show");
          newFolderInput.value = "";
        }
      });
    }

    if (newFolderInput) {
      newFolderInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          createFolderBtn.click();
        } else if (e.key === "Escape") {
          cancelFolderBtn.click();
        }
      });
    }

    if (addFolderModal) {
      addFolderModal.addEventListener("click", (e) => {
        if (e.target === addFolderModal) {
          cancelFolderBtn.click();
        }
      });
    }
  }

  // Create new folder
  async function createFolder(name) {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      const folders = result.folders || [];

      if (folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
        showNotification("Folder already exists", "error");
        return;
      }

      const newFolder = {
        id: generateId(),
        name: name,
        createdAt: new Date().toISOString(),
      };

      folders.push(newFolder);
      await chrome.storage.local.set({ folders });

      await loadFolders();
      await updateReminderCounts();
      showNotification("Folder created successfully", "success");
    } catch (error) {
      console.error("Error creating folder:", error);
      showNotification("Failed to create folder", "error");
    }
  }

  // Load folders in sidebar
  async function loadFolders() {
    try {
      const result = await chrome.storage.local.get(["folders", "reminders"]);
      const folders = result.folders || [];
      const reminders = result.reminders || [];

      if (folders.length === 0) {
        foldersNav.innerHTML = '<li class="empty-folders"><span class="empty-text">No folders yet</span></li>';
        return;
      }

      const folderCounts = {};
      reminders.forEach((reminder) => {
        if (reminder.folderId) {
          folderCounts[reminder.folderId] = (folderCounts[reminder.folderId] || 0) + 1;
        }
      });

      const folderHTML = folders
        .map(
          (folder) => `
        <li>
          <button class="nav-item folder-item" data-section="folder-content" data-folder-id="${folder.id}">
            <span class="nav-text">${escapeHtml(folder.name)}</span>
            <span class="nav-count">${folderCounts[folder.id] || 0}</span>
          </button>
        </li>
      `
        )
        .join("");

      foldersNav.innerHTML = folderHTML;
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  }

  // Update reminder counts
  async function updateReminderCounts() {
    try {
      const result = await chrome.storage.local.get(["reminders"]);
      const reminders = result.reminders || [];

      console.log("Updating counts, total reminders:", reminders.length);

      const now = new Date();
      const upcomingCount = reminders.filter((r) => new Date(r.reminderDate) > now && !r.triggered).length;

      // More specific selectors and debugging
      const allLinksCount = document.querySelector('[data-section="all-links"] .nav-count');
      const remindersCount = document.querySelector('[data-section="reminders"] .nav-count');

      console.log("All links element found:", !!allLinksCount);
      console.log("Reminders element found:", !!remindersCount);

      if (allLinksCount) {
        allLinksCount.textContent = reminders.length;
        console.log("Updated all links count to:", reminders.length);
      } else {
        console.warn("All links count element not found");
      }
      
      if (remindersCount) {
        remindersCount.textContent = upcomingCount;
        console.log("Updated reminders count to:", upcomingCount);
      } else {
        console.warn("Reminders count element not found");
      }

      // Also update folder counts
      await updateFolderCounts();
    } catch (error) {
      console.error("Error updating counts:", error);
    }
  }

  // New function to update folder counts specifically
  async function updateFolderCounts() {
    try {
      const result = await chrome.storage.local.get(["folders", "reminders"]);
      const folders = result.folders || [];
      const reminders = result.reminders || [];

      const folderCounts = {};
      reminders.forEach((reminder) => {
        if (reminder.folderId) {
          folderCounts[reminder.folderId] = (folderCounts[reminder.folderId] || 0) + 1;
        }
      });

      // Update each folder count
      folders.forEach(folder => {
        const folderCountElement = document.querySelector(`[data-folder-id="${folder.id}"] .nav-count`);
        if (folderCountElement) {
          folderCountElement.textContent = folderCounts[folder.id] || 0;
        }
      });
    } catch (error) {
      console.error("Error updating folder counts:", error);
    }
  }

  // Add event listeners for link actions
  function addLinkEventListeners() {
    // Remove existing listeners first
    document.removeEventListener('click', handleLinkAction);
    
    // Add new listener
    document.addEventListener('click', handleLinkAction);
  }

  // Handle link actions (open, delete) - UPDATE to include card clicks
  async function handleLinkAction(event) {
    const target = event.target;
    
    // Handle card clicks (but not when clicking on buttons)
    if (target.closest('.clickable-card') && !target.classList.contains('action-btn') && !target.closest('.action-btn')) {
      const card = target.closest('.clickable-card');
      const url = card.dataset.url;
      if (url) {
        try {
          await chrome.tabs.create({ url });
        } catch (error) {
          console.error("Error opening link:", error);
          showNotification("Failed to open link", "error");
        }
      }
      return;
    }
    
    // Handle button clicks
    if (!target.classList.contains('action-btn')) return;
    
    const action = target.dataset.action;
    const linkId = target.dataset.id;
    const url = target.dataset.url;
    const folderId = target.dataset.folderId;

    try {
      switch (action) {
        case "open":
          if (url) {
            await chrome.tabs.create({ url });
          }
          break;

        case "delete":
          if (linkId && confirm("Are you sure you want to delete this reminder?")) {
            await deleteReminder(linkId);
            
            // Refresh all displays and update counts
            await loadAllLinks();
            await loadFolders();
            await updateReminderCounts();
            await loadReminders();
            
            showNotification("Reminder deleted successfully", "success");
          }
          break;

        case "edit-folder":
          if (folderId) {
            await editFolder(folderId);
          }
          break;

        case "delete-folder":
          if (folderId) {
            const result = await chrome.storage.local.get(["folders"]);
            const folders = result.folders || [];
            const folder = folders.find(f => f.id === folderId);
            
            if (folder && confirm(`Are you sure you want to delete the folder "${folder.name}"? All links in this folder will be moved back to the main list.`)) {
              await deleteFolder(folderId);
            }
          }
          break;
      }
    } catch (error) {
      console.error("Error handling link action:", error);
      showNotification("Failed to perform action", "error");
    }
  }

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Load logs
  function loadLogs() {
    const logsContainer = document.getElementById("activity-logs");
    if (logsContainer) {
      logsContainer.innerHTML = '<div class="empty-state">No activity logs available</div>';
    }
  }

  // Load folder content
  async function loadFolderContent(folderId) {
    try {
      const result = await chrome.storage.local.get(["folders", "reminders"]);
      const folders = result.folders || [];
      const reminders = result.reminders || [];

      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      const folderLinks = reminders.filter((r) => r.folderId === folderId);

      const folderTitle = document.getElementById("folder-title");
      if (folderTitle) {
        folderTitle.innerHTML = `
          <div class="folder-header">
            <h2>${escapeHtml(folder.name)}</h2>
            <div class="folder-actions">
              <button class="action-btn secondary" data-action="edit-folder" data-folder-id="${folder.id}">
                Edit Name
              </button>
              <button class="action-btn danger" data-action="delete-folder" data-folder-id="${folder.id}">
                Delete Folder
              </button>
            </div>
          </div>
        `;
      }

      const folderLinksGrid = document.getElementById("folder-links-grid");
      if (folderLinksGrid) {
        if (folderLinks.length === 0) {
          folderLinksGrid.innerHTML = '<div class="empty-state">This folder is empty</div>';
        } else {
          const linksHTML = folderLinks.map((link) => createLinkHTML(link)).join("");
          folderLinksGrid.innerHTML = linksHTML;
          
          // ADICIONAR: Load preview images for each link in the folder - same as All Links
          folderLinks.forEach((link) => {
            setTimeout(() => {
              loadSitePreviewForCard(link.url, link.title, link.id);
            }, 100);
          });
        }
      }
    } catch (error) {
      console.error("Error loading folder content:", error);
    }
  }

  // Edit folder name
  async function editFolder(folderId) {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      const folders = result.folders || [];
      const folder = folders.find(f => f.id === folderId);
      
      if (!folder) {
        showNotification("Folder not found", "error");
        return;
      }

      const newName = prompt("Enter new folder name:", folder.name);
      if (!newName || newName.trim() === "") return;

      const trimmedName = newName.trim();
      
      // Check if name already exists
      if (folders.some(f => f.id !== folderId && f.name.toLowerCase() === trimmedName.toLowerCase())) {
        showNotification("Folder name already exists", "error");
        return;
      }

      // Update folder name
      const updatedFolders = folders.map(f => 
        f.id === folderId ? { ...f, name: trimmedName } : f
      );

      await chrome.storage.local.set({ folders: updatedFolders });
      
      // Refresh displays
      await loadFolders();
      await loadFolderContent(folderId);
      
      showNotification("Folder renamed successfully", "success");
    } catch (error) {
      console.error("Error editing folder:", error);
      showNotification("Failed to edit folder", "error");
    }
  }

  // Delete folder
  async function deleteFolder(folderId) {
    try {
      const result = await chrome.storage.local.get(["folders", "reminders"]);
      const folders = result.folders || [];
      const reminders = result.reminders || [];

      // Remove folder from folders array
      const updatedFolders = folders.filter(f => f.id !== folderId);
      
      // Remove folderId from all reminders that were in this folder
      const updatedReminders = reminders.map(r => 
        r.folderId === folderId ? { ...r, folderId: null } : r
      );

      await chrome.storage.local.set({ 
        folders: updatedFolders,
        reminders: updatedReminders
      });

      // Refresh displays and go back to all links
      await loadFolders();
      await loadAllLinks();
      await updateReminderCounts();
      
      // Switch to all links section
      const allLinksNav = document.querySelector('[data-section="all-links"]');
      if (allLinksNav) {
        switchToSection("all-links", allLinksNav);
      }
      
      showNotification("Folder deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting folder:", error);
      showNotification("Failed to delete folder", "error");
    }
  }

  // Load all links - UPDATE to include counter update
  async function loadAllLinks() {
    try {
      const result = await chrome.storage.local.get(["reminders"]);
      const reminders = result.reminders || [];

      const allLinksGrid = document.getElementById("all-links-grid");
      if (!allLinksGrid) {
        console.warn('[loadAllLinks] all-links-grid element not found on this page. Ignoring.');
        return;
      }

      if (reminders.length === 0) {
        allLinksGrid.innerHTML = '<div class="empty-state">No links saved yet</div>';
      } else {
        const linksHTML = reminders.map((link) => createLinkHTML(link)).join("");
        allLinksGrid.innerHTML = linksHTML;
      }

      // Update counts after loading
      await updateReminderCounts();
    } catch (error) {
      console.error("Error loading all links:", error);
    }
  }

  // Create link HTML for reminder-style display
  function createLinkHTML(link) {
    const reminderDate = new Date(link.reminderDate);
    const createdDate = new Date(link.createdAt);
    const now = new Date();
    const isPast = reminderDate <= now;
    const status = link.triggered ? "Completed" : isPast ? "Overdue" : "Scheduled";
    
    // Get domain for favicon with validation
    let domain = "";
    let faviconHtml = "";
    
    try {
      const urlObj = new URL(link.url);
      domain = urlObj.hostname;
      
      // Better favicon validation
      const isValidDomain = domain && 
                           domain !== 'localhost' && 
                           !domain.startsWith('127.') && 
                           !domain.includes('extension') &&
                           !domain.startsWith('chrome-') &&
                           domain.includes('.') && 
                           domain.length > 2;
      
      if (isValidDomain) {
        faviconHtml = `<img class="site-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" alt="Favicon" onerror="this.style.display='none';">`;
      }
    } catch (e) {
      domain = "Invalid URL";
    }

    const cardId = `card-${link.id}`;

    const html = `
      <div class="reminder-item clickable-card" data-id="${link.id}" data-url="${link.url}" id="${cardId}">
        <div class="reminder-content">
          <div class="site-preview-section">
            <div class="preview-image" id="preview-${link.id}" style="background: #2a2a2a; display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">
              <span>Loading...</span>
            </div>
          </div>
          
          <div class="card-content">
            <div class="site-header">
              ${faviconHtml}
              <span class="site-domain">${domain.replace('www.', '')}</span>
            </div>
            <div class="reminder-title" id="title-${link.id}">${escapeHtml(link.title)}</div>
            
            <div class="reminder-actions">
              <button class="action-btn primary" data-action="open" data-url="${link.url}">
                Open Link
              </button>
              <button class="action-btn danger" data-action="delete" data-id="${link.id}">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load site preview after creating the HTML
    setTimeout(() => {
      loadSitePreviewForCard(link.url, link.title, link.id);
    }, 100);

    return html;
  }

  // Modified loadSitePreview to work with specific card IDs
  function loadSitePreviewForCard(url, title, linkId) {
    console.log("Loading site preview for card:", linkId, url);

    try {
      // Skip chrome:// URLs and extension URLs
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
        console.log("Skipping chrome/extension URL:", url);
        const previewElement = document.getElementById(`preview-${linkId}`);
        if (previewElement) {
          previewElement.innerHTML = '<span style="color: #888;">Internal Page</span>';
        }
        return;
      }

      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Try to fetch preview image using microlink API
      fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          console.log("Microlink API response:", data);
          
          const previewElement = document.getElementById(`preview-${linkId}`);
          const titleElement = document.getElementById(`title-${linkId}`);
          
          if (data.status === 'success' && data.data) {
            const { title: fetchedTitle, image } = data.data;

            // Update title if we got a better one
            if (fetchedTitle && titleElement && fetchedTitle.trim().length > 0) {
              titleElement.textContent = fetchedTitle;
            }
            
            // Update preview image - usando background-image para melhor controle
            if (image?.url && previewElement) {
              previewElement.style.backgroundImage = `url("${image.url}")`;
              previewElement.style.backgroundSize = 'cover';
              previewElement.style.backgroundPosition = 'center';
              previewElement.innerHTML = '';
            } else if (previewElement) {
              previewElement.innerHTML = '<span style="color: #888;">No Preview</span>';
            }
          } else {
            // Fallback if API fails
            if (previewElement) {
              previewElement.innerHTML = '<span style="color: #888;">No Preview</span>';
            }
          }
        })
        .catch(err => {
          console.error("Error fetching preview for", url, ":", err);
          const previewElement = document.getElementById(`preview-${linkId}`);
          if (previewElement) {
            previewElement.innerHTML = '<span style="color: #888;">Preview Failed</span>';
          }
        });
    } catch (error) {
      console.error("Error in loadSitePreviewForCard:", error);
      const previewElement = document.getElementById(`preview-${linkId}`);
      if (previewElement) {
        previewElement.innerHTML = '<span style="color: #888;">Error</span>';
      }
    }
  }

  // Load preview images for reminders
  function loadReminderPreview(url, reminderId) {
    console.log("Loading preview for reminder:", reminderId, url);
    
    try {
      // Skip chrome:// URLs and extension URLs
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
        console.log("Skipping chrome/extension URL:", url);
        const previewElement = document.getElementById(`reminder-preview-${reminderId}`);
        if (previewElement) {
          previewElement.innerHTML = '<div class="no-preview">Internal Page</div>';
        }
        return;
      }

      // Try to fetch preview image using microlink API
      fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          console.log("Microlink API response for reminder:", data);
          
          const previewElement = document.getElementById(`reminder-preview-${reminderId}`);
          
          if (data.status === 'success' && data.data && data.data.image && data.data.image.url) {
            // Get time badge to preserve it
            const timeBadge = previewElement.querySelector('.reminder-time-badge');
            const timeBadgeHtml = timeBadge ? timeBadge.outerHTML : '';
            
            // Set background image
            previewElement.style.backgroundImage = `url("${data.data.image.url}")`;
            previewElement.style.backgroundSize = 'cover';
            previewElement.style.backgroundPosition = 'center';
            
            // Keep the time badge if it existed
            if (timeBadgeHtml) {
              previewElement.innerHTML = timeBadgeHtml;
            } else {
              previewElement.innerHTML = '';
            }
          } else {
            // No image available in the API response
            if (previewElement) {
              const timeBadge = previewElement.querySelector('.reminder-time-badge');
              const timeBadgeHtml = timeBadge ? timeBadge.outerHTML : '';
              previewElement.innerHTML = `${timeBadgeHtml}<div class="no-preview">No Preview</div>`;
            }
          }
        })
        .catch(err => {
          console.error("Error fetching preview for reminder", reminderId, ":", err);
          const previewElement = document.getElementById(`reminder-preview-${reminderId}`);
          if (previewElement) {
            const timeBadge = previewElement.querySelector('.reminder-time-badge');
            const timeBadgeHtml = timeBadge ? timeBadge.outerHTML : '';
            previewElement.innerHTML = `${timeBadgeHtml}<div class="no-preview">Preview Failed</div>`;
          }
        });
    } catch (error) {
      console.error("Error in loadReminderPreview:", error);
      const previewElement = document.getElementById(`reminder-preview-${reminderId}`);
      if (previewElement) {
        const timeBadge = previewElement.querySelector('.reminder-time-badge');
        const timeBadgeHtml = timeBadge ? timeBadge.outerHTML : '';
        previewElement.innerHTML = `${timeBadgeHtml}<div class="no-preview">Error</div>`;
      }
    }
  }

  // Initialize everything - UPDATE to add missing calls
  initSidebarNavigation();
  initFolderManagement();
  addLinkEventListeners();
  initSettingsListeners(); // Add this line
  await loadFolders();
  await updateReminderCounts();
  await loadSettings(); // Add this line

  // Load initial section (All Links)
  const allLinksNav = document.querySelector('[data-section="all-links"]');
  if (allLinksNav) {
    switchToSection("all-links", allLinksNav);
  }

  // Ensure counts are updated after everything is loaded
  setTimeout(async () => {
    await updateReminderCounts();
  }, 500);

  // Initialize debug info on load
  async function initDebugInfo() {
    try {
      // Check permissions
      const permissions = await chrome.permissions.getAll();
      debugLog(
        `Extension permissions: ${permissions.permissions.join(", ")}`,
        "info"
      );

      // Check alarms
      const alarms = await chrome.alarms.getAll();
      debugLog(`Active alarms: ${alarms.length}`, "info");
      alarms.forEach((alarm) => {
        const triggerTime = new Date(alarm.scheduledTime).toLocaleString();
        debugLog(`Alarm ${alarm.name}: ${triggerTime}`, "info");
      });

      // Check storage
      const storage = await chrome.storage.local.get(["reminders"]);
      const reminders = storage.reminders || [];
      debugLog(`Stored reminders: ${reminders.length}`, "info");
    } catch (error) {
      debugLog(`Error initializing debug info: ${error.message}`, "error");
    }
  }

  // Initialize debug info
  initDebugInfo();

  // Back button functionality
  backBtn.addEventListener("click", () => {
    window.close();
  });

  // Clear all reminders
  clearAllBtn.addEventListener("click", async () => {
    if (
      confirm(
        "Are you sure you want to clear all reminders? This action cannot be undone."
      )
    ) {
      try {
        // Clear all alarms
        const alarms = await chrome.alarms.getAll();
        for (const alarm of alarms) {
          await chrome.alarms.clear(alarm.name);
        }

        // Clear storage
        await chrome.storage.local.set({ reminders: [] });

        // Refresh the display
        await loadReminders();

        showNotification("All reminders cleared successfully", "success");
      } catch (error) {
        console.error("Error clearing reminders:", error);
        showNotification("Failed to clear reminders", "error");
      }
    }
  });

  // Load and display reminders
  await loadReminders();
  
  // Initialize reminder filters
  initReminderFilters();
});

async function loadReminders() {
  try {
    const result = await chrome.storage.local.get(["reminders", "autoDeletePastReminders"]);
    const reminders = result.reminders || [];
    const autoDelete = result.autoDeletePastReminders || false;

    const now = new Date();
    
    // If auto-delete is enabled, filter out past reminders and update storage
    let filteredReminders = reminders;
    if (autoDelete) {
      const pastReminders = reminders.filter(r => new Date(r.reminderDate) <= now && r.triggered);
      const activeReminders = reminders.filter(r => !(new Date(r.reminderDate) <= now && r.triggered));
      
      if (pastReminders.length > 0) {
        // Delete past reminders from storage
        await chrome.storage.local.set({ reminders: activeReminders });
        
        // Clear their alarms
        for (const reminder of pastReminders) {
          try {
            await chrome.alarms.clear(reminder.id);
          } catch (error) {
            console.warn("Failed to clear alarm for reminder:", reminder.id);
          }
        }
        
        console.log(`Auto-deleted ${pastReminders.length} past reminders`);
        filteredReminders = activeReminders;
      }
    }

    const upcomingReminders = filteredReminders.filter(
      (r) => new Date(r.reminderDate) > now && !r.triggered
    );
    const pastReminders = filteredReminders.filter(
      (r) => new Date(r.reminderDate) <= now || r.triggered
    );

    displayReminders(
      upcomingReminders,
      document.getElementById("upcoming-reminders"),
      "upcoming"
    );
    displayReminders(
      pastReminders,
      document.getElementById("past-reminders"),
      "past"
    );
  } catch (error) {
    console.error("Error loading reminders:", error);
    showError("Failed to load reminders");
  }
}

function displayReminders(reminders, container, type) {
  if (reminders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${type === "upcoming" ? "No upcoming reminders" : "No past reminders"}
      </div>
    `;
    return;
  }

  // Sort reminders by date
  if (type === "upcoming") {
    // Sort upcoming by soonest first
    reminders.sort((a, b) => new Date(a.reminderDate) - new Date(b.reminderDate));
  } else {
    // Sort past by most recent first
    reminders.sort((a, b) => new Date(b.reminderDate) - new Date(a.reminderDate));
  }

  const html = reminders
    .map((reminder) => createReminderHTML(reminder, type))
    .join("");
  container.innerHTML = html;

  // Add event listeners for action buttons
  container.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", handleReminderAction);
  });
}

function createReminderHTML(reminder, type) {
  const reminderDate = new Date(reminder.reminderDate);
  const createdDate = new Date(reminder.createdAt);
  const now = new Date();

  const isTriggered = reminder.triggered;
  const isPast = reminderDate <= now;
  const isOverdue = isPast && !isTriggered;

  // Set CSS classes based on status
  let statusClasses = [];
  if (isTriggered) statusClasses.push("triggered");
  else if (isOverdue) statusClasses.push("overdue");
  else statusClasses.push("scheduled");

  // Get status badge text
  let statusBadge = "";
  if (isTriggered) {
    statusBadge = `<span class="status-badge completed">Completed</span>`;
  } else if (isOverdue) {
    statusBadge = `<span class="status-badge overdue">Overdue</span>`;
  } else {
    statusBadge = `<span class="status-badge scheduled">Scheduled</span>`;
  }

  // Calculate delay information
  let delayInfo = "";
  if (reminder.delayHours !== undefined || reminder.delayMinutes !== undefined) {
    const hours = reminder.delayHours || 0;
    const minutes = reminder.delayMinutes || 0;
    delayInfo = `${hours}h ${minutes}m`;
  } else {
    // For older reminders without delay info, calculate from dates
    const createdTime = new Date(reminder.createdAt);
    const scheduledTime = new Date(reminder.reminderDate);
    const delayMs = scheduledTime.getTime() - createdTime.getTime();
    const hours = Math.floor(delayMs / (1000 * 60 * 60));
    const minutes = Math.floor((delayMs % (1000 * 60 * 60)) / (1000 * 60));
    delayInfo = `${hours}h ${minutes}m`;
  }

  // Format time information
  let timeInfo = "";
  if (isTriggered) {
    const triggeredDate = new Date(reminder.triggeredAt || reminderDate);
    timeInfo = `Completed on ${triggeredDate.toLocaleDateString()} at ${triggeredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (isOverdue) {
    const overdueDays = Math.floor((now - reminderDate) / (1000 * 60 * 60 * 24));
    if (overdueDays > 1) {
      timeInfo = `Overdue by ${overdueDays} days`;
    } else {
      const overdueHours = Math.floor((now - reminderDate) / (1000 * 60 * 60));
      timeInfo = `Overdue by ${overdueHours} hours`;
    }
  } else if (type === "upcoming") {
    const timeLeft = reminderDate.getTime() - now.getTime();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursLeft > 24) {
      const daysLeft = Math.floor(hoursLeft / 24);
      timeInfo = `Due in ${daysLeft} days`;
    } else {
      timeInfo = `Due in ${hoursLeft}h ${minutesLeft}m`;
    }
  }

  // Try to get favicon if we have a URL
  let faviconHtml = "";
  try {
    const urlObj = new URL(reminder.url);
    const domain = urlObj.hostname;
    
    const isValidDomain = domain && 
                         domain !== 'localhost' && 
                         !domain.startsWith('127.') && 
                         !domain.includes('extension') &&
                         !domain.startsWith('chrome-') &&
                         domain.includes('.');
    
    if (isValidDomain) {
      faviconHtml = `<img class="site-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" alt="" onerror="this.style.display='none';">`;
    }
  } catch (e) {
    // Invalid URL, skip favicon
  }

  return `
    <div class="reminder-item ${statusClasses.join(' ')}" data-id="${reminder.id}" data-status="${statusClasses[0]}">
      <div class="reminder-content">
        <div class="reminder-title">
          ${faviconHtml} ${escapeHtml(reminder.title)}
        </div>
        <div class="reminder-url">${formatUrl(reminder.url)}</div>
        <div class="reminder-date">
          <div class="reminder-date-row">
            <svg class="date-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.5 1h7A2.5 2.5 0 0114 3.5v9a2.5 2.5 0 01-2.5 2.5h-7A2.5 2.5 0 012 12.5v-9A2.5 2.5 0 014.5 1zm0 1A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0011.5 2h-7z"/>
              <path d="M11 4H5v1h6V4zm-6 3h6v1H5V7zm6 3H5v1h6v-1z"/>
            </svg>
            Created: ${createdDate.toLocaleDateString()} at ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div class="reminder-date-row">
            <svg class="date-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 1a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/>
              <path d="M8 5v3h3v1H7V5h1z"/>
            </svg>
            Delay: ${delayInfo}
          </div>
        </div>
        <div class="reminder-status">
          ${statusBadge}
          <span>${timeInfo}</span>
        </div>
        <div class="reminder-actions">
          <button class="action-btn primary" data-action="open" data-id="${reminder.id}">
            Open Link
          </button>
          ${type === "upcoming" && !isTriggered
            ? `<button class="action-btn" data-action="edit" data-id="${reminder.id}">Edit</button>`
            : ""}
          <button class="action-btn danger" data-action="delete" data-id="${reminder.id}">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

async function handleReminderAction(event) {
  const action = event.target.dataset.action;
  const reminderId = event.target.dataset.id;

  try {
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    const reminder = reminders.find((r) => r.id === reminderId);

    if (!reminder) {
      showNotification("Reminder not found", "error");
      return;
    }

    switch (action) {
      case "open":
        await chrome.tabs.create({ url: reminder.url });
        break;

      case "edit":
        await editReminder(reminder);
        break;

      case "delete":
        if (confirm("Are you sure you want to delete this reminder?")) {
          await deleteReminder(reminderId);
          await loadReminders(); // Refresh the display
          showNotification("Reminder deleted successfully", "success");
        }
        break;
    }
  } catch (error) {
    console.error("Error handling reminder action:", error);
    showNotification("Failed to perform action", "error");
  }
}

async function editReminder(reminder) {
  const currentDate = new Date(reminder.reminderDate);
  const now = new Date();
  const timeDiffMs = currentDate.getTime() - now.getTime();
  const currentHours = Math.floor(timeDiffMs / (1000 * 60 * 60));
  const currentMinutes = Math.floor(
    (timeDiffMs % (1000 * 60 * 60)) / (1000 * 60)
  );

  // Create a simple edit dialog for delay
  const newHoursStr = prompt(
    `Edit reminder delay for: ${
      reminder.title
    }\n\nCurrent delay: ${currentHours} hours, ${currentMinutes} minutes\nScheduled for: ${currentDate.toLocaleString()}\n\nEnter new delay in hours:`,
    Math.max(0, currentHours).toString()
  );

  if (newHoursStr === null) return; // User cancelled

  const newMinutesStr = prompt(
    `Enter additional minutes (0-59):`,
    Math.max(0, currentMinutes).toString()
  );

  if (newMinutesStr === null) return; // User cancelled

  const newHours = parseInt(newHoursStr);
  const newMinutes = parseInt(newMinutesStr);

  if (isNaN(newHours) || newHours < 0) {
    showNotification("Invalid hours. Please enter a number >= 0", "error");
    return;
  }

  if (isNaN(newMinutes) || newMinutes < 0 || newMinutes > 59) {
    showNotification(
      "Invalid minutes. Please enter a number between 0-59",
      "error"
    );
    return;
  }

  if (newHours === 0 && newMinutes === 0) {
    showNotification(
      "Delay cannot be 0. Please set at least 1 minute",
      "error"
    );
    return;
  }

  try {
    if (!reminder || !reminder.id) {
      throw new Error("Invalid reminder data");
    }
    // Calculate new reminder date based on delay from now
    const newDelayMs = (newHours * 60 + newMinutes) * 60 * 1000;
    const newDate = new Date(now.getTime() + newDelayMs);

    // Update reminder
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];

    const updatedReminders = reminders.map((r) =>
      r.id === reminder.id ? { ...r, reminderDate: newDate.toISOString() } : r
    );

    await chrome.storage.local.set({ reminders: updatedReminders });

    // Update alarm
    if (chrome.alarms && chrome.alarms.clear && chrome.alarms.create) {
      await chrome.alarms.clear(reminder.id);
      await chrome.alarms.create(reminder.id, { when: newDate.getTime() });
    } else {
      console.warn(
        "Alarms API not available. Reminder will not trigger automatically."
      );
    }

    await loadReminders(); // Refresh the display
    showNotification("Reminder updated successfully", "success");
  } catch (error) {
    console.error("Error editing reminder:", error);
    showNotification("Failed to update reminder", "error");
  }
}

async function deleteReminder(reminderId) {
   try {
    // Remove from storage
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    const updatedReminders = reminders.filter((r) => r.id !== reminderId);
    await chrome.storage.local.set({ reminders: updatedReminders });

    // Clear alarm
    if (chrome.alarms && chrome.alarms.clear) {
      await chrome.alarms.clear(reminderId);
    } else {
      console.warn("Alarms API not available. Reminder will not trigger automatically.");
    }

    // Clear any existing notification
    await chrome.notifications.clear(reminderId);
  } catch (error) {
    console.error("Error deleting reminder:", error);
    throw error;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Format URL to show as www.example.com/... style
function formatUrl(url) {
  try {
    const urlObj = new URL(url);
    let displayUrl = urlObj.hostname;
    
    // Ensure the URL starts with www. for consistent display
    if (displayUrl.startsWith('www.')) {
      // Keep as is
    } else {
      displayUrl = 'www.' + displayUrl;
    }
    
    // Add path with ellipsis if path is long
    if (urlObj.pathname && urlObj.pathname !== '/') {
      // Get first part of the path
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        // Show first path segment and ellipsis if there are more
        displayUrl += '/' + pathParts[0];
        if (pathParts.length > 1 || urlObj.pathname.endsWith('/')) {
          displayUrl += '/...';
        }
      }
    }
    
    return escapeHtml(displayUrl);
  } catch (e) {
    // Fallback for invalid URLs
    return escapeHtml(url);
  }
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
        top: 20px;
        right: 20px;
        background: ${type === "error" ? "#cc3333" : "#44aa44"};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

  document.body.appendChild(notification);

  // Remove after 4 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }
  }, 4000);
}

// Add CSS for notification animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

function createReminderCard(reminder) {
  const card = document.createElement('div');
  card.className = 'reminder-item';
  card.dataset.id = reminder.id;
  
  try {
    const urlObj = new URL(reminder.url);
    const domain = urlObj.hostname;
    
    // Better favicon validation
    const isValidDomain = domain && 
                         domain !== 'localhost' && 
                         !domain.startsWith('127.') && 
                         !domain.includes('extension') &&
                         !domain.startsWith('chrome-') &&
                         domain.includes('.') && 
                         domain.length > 2;
    
    const faviconUrl = isValidDomain ? 
      `https://www.google.com/s2/favicons?domain=${domain}&sz=18` : '';
    
    card.innerHTML = `
      <div class="reminder-content">
        <div class="site-preview-section">
          <div class="preview-image"></div>
          <div class="site-info">
            <div class="site-header">
              ${isValidDomain ? `<img class="site-favicon" src="${faviconUrl}" alt="Favicon" onerror="this.style.display='none'; this.src=''; this.onerror=null;">` : ''}
              <span class="site-domain">${domain || 'Unknown'}</span>
            </div>
            <div class="reminder-title">${reminder.title}</div>
            <div class="reminder-url">${reminder.url}</div>
          </div>
        </div>
        
        <div class="reminder-date">${formatReminderDate(reminder.reminderDate)}</div>
        
        <div class="reminder-status">
          <span class="status-badge ${getStatusClass(reminder)}">
            ${getStatusText(reminder)}
          </span>
          ${reminder.folderId ? `<span class="folder-tag">Folder: ${getFolderName(reminder.folderId)}</span>` : ''}
        </div>
        
        <div class="reminder-actions">
          <button class="action-btn primary" onclick="openReminder('${reminder.id}')">Open</button>
          <button class="action-btn danger" onclick="deleteReminder('${reminder.id}')">Delete</button>
        </div>
      </div>
    `;
    
    // Remove iframe code to prevent X-Frame-Options errors
    
  } catch (error) {
    console.error('Error creating reminder card:', error);
    // Fallback for invalid URLs
    card.innerHTML = `
      <div class="reminder-content">
        <div class="site-preview-section">
          <div class="preview-image"></div>
          <div class="site-info">
            <div class="site-header">
              <span class="site-domain">Invalid URL</span>
            </div>
            <div class="reminder-title">${reminder.title}</div>
            <div class="reminder-url">${reminder.url}</div>
          </div>
        </div>
        
        <div class="reminder-date">${formatReminderDate(reminder.reminderDate)}</div>
        
        <div class="reminder-status">
          <span class="status-badge ${getStatusClass(reminder)}">
            ${getStatusText(reminder)}
          </span>
        </div>
        
        <div class="reminder-actions">
          <button class="action-btn danger" onclick="deleteReminder('${reminder.id}')">Delete</button>
        </div>
      </div>
    `;
  }
  
  return card;
}

// Function to initialize reminder filters
function initReminderFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (!filterButtons || filterButtons.length === 0) return;
  
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      filterReminders(filter);
    });
  });
}

// Function to filter reminders
function filterReminders(filter) {
  const reminderItems = document.querySelectorAll('.reminder-item');
  
  if (!reminderItems || reminderItems.length === 0) return;
  
  reminderItems.forEach(item => {
    if (filter === 'all') {
      item.style.display = 'flex';
    } else {
      const status = item.dataset.status;
      item.style.display = (status === filter) ? 'flex' : 'none';
    }
  });
}
