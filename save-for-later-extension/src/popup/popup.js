document.addEventListener("DOMContentLoaded", async () => {
  // Get all elements except slider-related ones
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  const previewTime = document.getElementById("preview-time");
  
  // Folder elements
  const folderSelect = document.getElementById("folder-select");
  const newFolderInput = document.getElementById("new-folder");
  const newFolderBtn = document.getElementById("new-folder-btn");

  // Time picker elements (now embedded)
  const hoursWheel = document.getElementById('hours-wheel');
  const minutesWheel = document.getElementById('minutes-wheel');
  
  // Modal elements
  const successModal = document.getElementById('success-modal');
  const successMessage = document.getElementById('success-message');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closePopupBtn = document.getElementById('close-popup-btn');
  
  let currentHours = 0;
  let currentMinutes = 0;
  let currentTabUrl = '';
  let currentTabTitle = '';

  // Get current tab URL and title when popup opens
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      currentTabUrl = tab.url;
      currentTabTitle = tab.title;
      
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

      // Handle iframe preview with better scaling for 120x100px
      if (miniPreviewIframe && previewImage) {
        console.log("Setting up iframe preview");
        
        // Remove sandbox to allow better loading
        miniPreviewIframe.removeAttribute('sandbox');
        
        // Set iframe to load the website
        miniPreviewIframe.src = url;
        miniPreviewIframe.style.display = 'block';
        
        // Better loading detection
        miniPreviewIframe.onload = function() {
          console.log("Iframe loaded successfully");
          // Wait for content to render
          setTimeout(() => {
            previewImage.classList.add('loaded');
          }, 800);
        };

        miniPreviewIframe.onerror = function() {
          console.log("Iframe failed to load");
          // Show fallback with domain info
          const fallbackHtml = `
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    margin: 0; 
                    padding: 20px; 
                    font-family: Arial, sans-serif; 
                    background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                  }
                  .preview-content { 
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    max-width: 400px;
                  }
                  h3 { color: #333; margin: 0 0 10px 0; font-size: 18px; }
                  p { color: #666; margin: 5px 0; font-size: 14px; }
                  .domain { 
                    background: #f8f9fa; 
                    padding: 8px 12px; 
                    border-radius: 6px; 
                    color: #495057;
                    font-weight: 500;
                    margin-top: 10px;
                  }
                </style>
              </head>
              <body>
                <div class="preview-content">
                  <h3>${title || 'Website Preview'}</h3>
                  <div class="domain">${domain}</div>
                  <p>Preview not available</p>
                </div>
              </body>
            </html>
          `;
          
          this.src = `data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`;
          setTimeout(() => {
            previewImage.classList.add('loaded');
          }, 300);
        };

        // Timeout fallback
        setTimeout(() => {
          if (!previewImage.classList.contains('loaded')) {
            console.log("Preview timeout, showing fallback");
            const timeoutHtml = `
              <html>
                <body style="margin:0;padding:20px;font-family:Arial;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                  <div style="text-align:center;background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color:#333;margin:0 0 10px 0;">${title || 'Loading...'}</h3>
                    <p style="color:#666;margin:5px 0;">${domain}</p>
                    <small style="color:#999;">Loading preview...</small>
                  </div>
                </body>
              </html>
            `;
            miniPreviewIframe.src = `data:text/html;charset=utf-8,${encodeURIComponent(timeoutHtml)}`;
            previewImage.classList.add('loaded');
          }
        }, 3000);
      }
      
    } catch (error) {
      console.error("Error loading site preview:", error);
      if (siteTitle) siteTitle.textContent = "Invalid URL";
      if (siteDomain) siteDomain.textContent = "unknown";
      if (siteFavicon) siteFavicon.style.display = 'none';
      
      // Show error fallback
      if (miniPreviewIframe) {
        const errorHtml = `
          <html>
            <body style="margin:0;padding:20px;font-family:Arial;background:#ffebee;display:flex;align-items:center;justify-content:center;min-height:100vh;">
              <div style="text-align:center;">
                <h3 style="color:#c62828;margin:0 0 10px 0;">Invalid URL</h3>
                <p style="color:#666;">Cannot preview this site</p>
              </div>
            </body>
          </html>
        `;
        miniPreviewIframe.src = `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`;
        previewImage.classList.add('loaded');
      }
    }
  }

  // Function to update preview time (simplified)
  function updatePreview() {
    if (currentHours === 0 && currentMinutes === 0) {
      if (previewTime) previewTime.textContent = "Please set a delay time";
      return;
    }

    const now = new Date();
    const reminderTime = new Date(
      now.getTime() + (currentHours * 60 + currentMinutes) * 60 * 1000
    );
    if (previewTime) {
      previewTime.textContent = reminderTime.toLocaleDateString() + " at " + 
        reminderTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }

  // Initialize time picker (embedded)
  function initTimePicker() {
    if (!hoursWheel || !minutesWheel) {
      console.error("Time picker wheels not found");
      return;
    }

    // Generate hours with padding items above and below
    const hoursItems = hoursWheel.querySelector('.wheel-items');
    if (hoursItems) {
      // Add padding items above (21, 22, 23)
      for (let i = 21; i <= 23; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item padding-item';
        item.textContent = i;
        item.dataset.value = i;
        hoursItems.appendChild(item);
      }
      
      // Add main items (0-23)
      for (let i = 0; i <= 23; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item';
        item.textContent = i;
        item.dataset.value = i;
        hoursItems.appendChild(item);
      }
      
      // Add padding items below (0, 1, 2)
      for (let i = 0; i <= 2; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item padding-item';
        item.textContent = i;
        item.dataset.value = i;
        hoursItems.appendChild(item);
      }
    }
    
    // Generate minutes with padding items above and below
    const minutesItems = minutesWheel.querySelector('.wheel-items');
    if (minutesItems) {
      // Add padding items above (57, 58, 59)
      for (let i = 57; i <= 59; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item padding-item';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        minutesItems.appendChild(item);
      }
      
      // Add main items (0-59)
      for (let i = 0; i <= 59; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        minutesItems.appendChild(item);
      }
      
      // Add padding items below (0, 1, 2)
      for (let i = 0; i <= 2; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item padding-item';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        minutesItems.appendChild(item);
      }
    }
    
    // Add scroll behavior with infinite loop support
    setupWheelScroll(hoursWheel, (value) => {
      currentHours = value;
      updatePreview();
      console.log("Hours updated:", value);
    }, 24, 3); // 24 main items, 3 padding items on each side
    
    setupWheelScroll(minutesWheel, (value) => {
      currentMinutes = value;
      updatePreview();
      console.log("Minutes updated:", value);
    }, 60, 3); // 60 main items, 3 padding items on each side
  }

  function setupWheelScroll(wheel, callback, mainItemsCount, paddingCount) {
    if (!wheel) return;
    
    const container = wheel.querySelector('.wheel-items');
    if (!container) return;
    
    const items = container.querySelectorAll('.wheel-item');
    
    // Start at the first real item (after padding)
    let currentIndex = paddingCount;
    
    function updateSelection(index) {
      // Remove previous selection
      items.forEach(item => item.classList.remove('center', 'selected'));
      
      // Add selection to current item
      if (items[index]) {
        items[index].classList.add('center', 'selected');
        const value = parseInt(items[index].dataset.value);
        callback(value);
      }
      
      // Update transform - properly center the selected item
      const itemHeight = 20;
      const containerHeight = 60;
      const centerPosition = Math.floor(containerHeight / 2) - Math.floor(itemHeight / 2);
      const offset = centerPosition - (index * itemHeight);
      container.style.transform = `translateY(${offset}px)`;
      
      // Handle infinite scroll repositioning
      if (index < paddingCount) {
        // Scrolled too far up, jump to equivalent position at the end
        setTimeout(() => {
          const equivalentIndex = mainItemsCount + index;
          currentIndex = equivalentIndex;
          const newOffset = centerPosition - (equivalentIndex * itemHeight);
          container.style.transition = 'none';
          container.style.transform = `translateY(${newOffset}px)`;
          items.forEach(item => item.classList.remove('center', 'selected'));
          items[equivalentIndex].classList.add('center', 'selected');
          requestAnimationFrame(() => {
            container.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          });
        }, 50);
      } else if (index >= mainItemsCount + paddingCount) {
        // Scrolled too far down, jump to equivalent position at the beginning
        setTimeout(() => {
          const equivalentIndex = paddingCount + (index - mainItemsCount - paddingCount);
          currentIndex = equivalentIndex;
          const newOffset = centerPosition - (equivalentIndex * itemHeight);
          container.style.transition = 'none';
          container.style.transform = `translateY(${newOffset}px)`;
          items.forEach(item => item.classList.remove('center', 'selected'));
          items[equivalentIndex].classList.add('center', 'selected');
          requestAnimationFrame(() => {
            container.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          });
        }, 50);
      }
    }
    
    // Click handlers
    items.forEach((item, index) => {
      item.addEventListener('click', () => {
        currentIndex = index;
        updateSelection(currentIndex);
      });
    });
    
    // Wheel scroll with infinite looping
    wheel.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        currentIndex++;
      } else {
        currentIndex--;
      }
      updateSelection(currentIndex);
    });
    
    // Initialize at first real item (0 value)
    updateSelection(currentIndex);
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

  // Handle reminder setting with validation
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

      if (currentHours === 0 && currentMinutes === 0) {
        showError("Please set a delay time using the time picker");
        return;
      }

      try {
        await saveReminder(url, customTitle, currentHours, currentMinutes, selectedFolderId);
        
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

  // Handle settings button click
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
  initTimePicker();
  updatePreview();

  console.log("Popup initialized successfully");
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