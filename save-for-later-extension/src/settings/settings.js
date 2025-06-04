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
        folderTitle.textContent = folder.name;
      }

      const folderLinksGrid = document.getElementById("folder-links-grid");
      if (folderLinksGrid) {
        if (folderLinks.length === 0) {
          folderLinksGrid.innerHTML = '<div class="empty-state">This folder is empty</div>';
        } else {
          const linksHTML = folderLinks.map((link) => createLinkHTML(link)).join("");
          folderLinksGrid.innerHTML = linksHTML;
        }
      }
    } catch (error) {
      console.error("Error loading folder content:", error);
    }
  }

  // Load all links
  async function loadAllLinks() {
    try {
      const result = await chrome.storage.local.get(["reminders"]);
      const reminders = result.reminders || [];

      const allLinksGrid = document.getElementById("all-links-grid");
      if (allLinksGrid) {
        if (reminders.length === 0) {
          allLinksGrid.innerHTML = '<div class="empty-state">No links saved yet</div>';
        } else {
          const linksHTML = reminders.map((link) => createLinkHTML(link)).join("");
          allLinksGrid.innerHTML = linksHTML;
        }
      }
    } catch (error) {
      console.error("Error loading all links:", error);
    }
  }

  // Load logs
  function loadLogs() {
    const logsContainer = document.getElementById("activity-logs");
    if (logsContainer) {
      logsContainer.innerHTML = '<div class="empty-state">No activity logs available</div>';
    }
  }

  // Create link HTML
  function createLinkHTML(link) {
    const reminderDate = new Date(link.reminderDate);
    const now = new Date();
    const isPast = reminderDate <= now;
    const status = link.triggered ? "Completed" : isPast ? "Overdue" : "Scheduled";

    return `
      <div class="link-item" data-id="${link.id}">
        <div class="link-content">
          <div class="link-title">${escapeHtml(link.title)}</div>
          <div class="link-url">${escapeHtml(link.url)}</div>
          <div class="link-meta">
            <span class="link-status ${status.toLowerCase()}">${status}</span>
            <span class="link-date">${reminderDate.toLocaleDateString()}</span>
          </div>
        </div>
        <div class="link-actions">
          <button class="action-btn primary" onclick="openLink('${link.url}')">Open</button>
          <button class="action-btn danger" onclick="deleteReminderFromLink('${link.id}')">Delete</button>
        </div>
      </div>
    `;
  }

  // Update reminder counts
  async function updateReminderCounts() {
    try {
      const result = await chrome.storage.local.get(["reminders"]);
      const reminders = result.reminders || [];

      const now = new Date();
      const upcomingCount = reminders.filter((r) => new Date(r.reminderDate) > now && !r.triggered).length;

      const allLinksCount = document.querySelector('[data-section="all-links"] .nav-count');
      const remindersCount = document.querySelector('[data-section="reminders"] .nav-count');

      if (allLinksCount) allLinksCount.textContent = reminders.length;
      if (remindersCount) remindersCount.textContent = upcomingCount;
    } catch (error) {
      console.error("Error updating counts:", error);
    }
  }

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Global functions
  window.openLink = async (url) => {
    await chrome.tabs.create({ url });
  };

  window.deleteReminderFromLink = async (reminderId) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      try {
        await deleteReminder(reminderId);
        await loadAllLinks();
        await loadFolders();
        await updateReminderCounts();
        showNotification("Reminder deleted successfully", "success");
      } catch (error) {
        console.error("Error deleting reminder:", error);
        showNotification("Failed to delete reminder", "error");
      }
    }
  };

  // Initialize everything
  initSidebarNavigation();
  initFolderManagement();
  await loadFolders();
  await updateReminderCounts();

  // Load initial section (All Links)
  const allLinksNav = document.querySelector('[data-section="all-links"]');
  if (allLinksNav) {
    switchToSection("all-links", allLinksNav);
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

  // Load and display reminders
  await loadReminders();
});

async function loadReminders() {
  try {
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];

    const now = new Date();
    const upcomingReminders = reminders.filter(
      (r) => new Date(r.reminderDate) > now && !r.triggered
    );
    const pastReminders = reminders.filter(
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
                ${
                  type === "upcoming"
                    ? "No upcoming reminders"
                    : "No past reminders"
                }
            </div>
        `;
    return;
  }

  // Sort reminders by date
  reminders.sort((a, b) => new Date(a.reminderDate) - new Date(b.reminderDate));

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

  let statusText = "";
  let delayInfo = "";

  // Calculate delay information
  if (
    reminder.delayHours !== undefined ||
    reminder.delayMinutes !== undefined
  ) {
    const hours = reminder.delayHours || 0;
    const minutes = reminder.delayMinutes || 0;
    delayInfo = `Delay: ${hours}h ${minutes}m`;
  } else {
    // For older reminders without delay info, calculate from dates
    const createdTime = new Date(reminder.createdAt);
    const scheduledTime = new Date(reminder.reminderDate);
    const delayMs = scheduledTime.getTime() - createdTime.getTime();
    const hours = Math.floor(delayMs / (1000 * 60 * 60));
    const minutes = Math.floor((delayMs % (1000 * 60 * 60)) / (1000 * 60));
    delayInfo = `Delay: ${hours}h ${minutes}m`;
  }

  if (isTriggered) {
    statusText = `Triggered on ${new Date(
      reminder.triggeredAt
    ).toLocaleDateString()}`;
  } else if (isOverdue) {
    statusText = "Overdue";
  } else if (type === "upcoming") {
    const timeLeft = reminderDate.getTime() - now.getTime();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    statusText = `Due in ${hoursLeft}h ${minutesLeft}m (${reminderDate.toLocaleDateString()} at ${reminderDate.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )})`;
  }

  return `
        <div class="reminder-item ${isTriggered ? "triggered" : ""}" data-id="${
    reminder.id
  }">
            <div class="reminder-content">
                <div class="reminder-title">${escapeHtml(reminder.title)}</div>
                <div class="reminder-url">${escapeHtml(reminder.url)}</div>
                <div class="reminder-date">
                    Created: ${createdDate.toLocaleDateString()} at ${createdDate.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  )} • ${delayInfo}
                </div>
                ${
                  statusText
                    ? `<div class="reminder-status">${statusText}</div>`
                    : ""
                }
            </div>
            <div class="reminder-actions">
                <button class="action-btn primary" data-action="open" data-id="${
                  reminder.id
                }">
                    Open Link
                </button>
                ${
                  type === "upcoming" && !isTriggered
                    ? `<button class="action-btn" data-action="edit" data-id="${reminder.id}">Edit Delay</button>`
                    : ""
                }
                <button class="action-btn danger" data-action="delete" data-id="${
                  reminder.id
                }">
                    Delete
                </button>
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
    await chrome.alarms.clear(reminder.id);
    await chrome.alarms.create(reminder.id, { when: newDate.getTime() });

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
    await chrome.alarms.clear(reminderId);

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
