document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup loading started...");
  
  // Update theme icon when popup opens
  updateThemeIcon();
  
  // Get all elements
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  const previewTime = document.getElementById("preview-time");
  
  // Folder elements
  const folderSelect = document.getElementById("folder-select");
  const newFolderInput = document.getElementById("new-folder");
  const newFolderBtn = document.getElementById("new-folder-btn");

  // Time picker elements
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
      
      if (previewImage) {
        console.log("Attempting to fetch preview from microlink...");
        fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
          .then(res => {
            console.log("Microlink response received:", res.status);
            return res.json();
          })
          .then(data => {
            console.log("Microlink data:", data);
            if (data.status !== 'success') {
              // Hide loading, no image available
              if (previewLoading) previewLoading.style.display = 'none';
              return;
            }

            const { title, image } = data.data;
            const titleEl = document.getElementById("site-title");
            const imageEl = document.getElementById("preview-image");
            const loadingEl = document.getElementById("preview-loading");

            if (title && titleEl) titleEl.textContent = title;
            if (image?.url && imageEl) {
              imageEl.onload = function() {
                // Hide loading when image loads
                if (loadingEl) loadingEl.style.display = 'none';
                imageEl.style.display = 'block';
                
                // Check if image should be marked as small/distorted
                checkAndMarkSmallImage(imageEl);
              };
              imageEl.onerror = function() {
                // Hide loading if image fails to load
                if (loadingEl) loadingEl.style.display = 'none';
                imageEl.style.display = 'none';
              };
              imageEl.src = image.url;
            } else {
              // No image available, hide loading
              if (loadingEl) loadingEl.style.display = 'none';
            }
          })
          .catch(err => {
            console.error("Error fetching preview:", err);
            if (previewImage) {
              previewImage.src = '';
              previewImage.style.display = 'none';
            }
            if (previewLoading) {
              previewLoading.style.display = 'none';
            }
          });
      } else {
        console.log("previewImage element not found");
      }

      // Handle favicon
      if (siteFavicon) {
        const isValidDomain = domain && 
                             domain !== 'localhost' && 
                             !domain.startsWith('127.') && 
                             !domain.includes('extension') &&
                             domain.includes('.') && 
                             domain.length > 2;

        if (isValidDomain) {
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
          siteFavicon.src = faviconUrl;
          siteFavicon.style.display = 'block';
          
          siteFavicon.onerror = function() {
            console.log("Favicon failed for domain:", domain);
            this.style.display = 'none';
            this.src = '';
            this.onerror = null;
          };
        } else {
          console.log("Invalid domain for favicon:", domain);
          siteFavicon.style.display = 'none';
          siteFavicon.src = '';
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
      if (previewLoading) {
        previewLoading.style.display = 'none';
      }
    }
    
    console.log("loadSitePreview completed");
  }

  // Function to update preview time
  function updatePreview() {
    if (currentHours === 0 && currentMinutes === 0) {
      if (previewTime) previewTime.textContent = "Please set a delay time (optional)";
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

  // Initialize time picker
  function initTimePicker() {
    if (!hoursWheel || !minutesWheel) {
      console.error("Time picker wheels not found");
      return;
    }

    // Generate hours items
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
    
    // Generate minutes items
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
    
    // Setup wheel scroll behavior
    setupWheelScroll(hoursWheel, (value) => {
      currentHours = value;
      updatePreview();
      console.log("Hours updated:", value);
    }, 24, 3);
    
    setupWheelScroll(minutesWheel, (value) => {
      currentMinutes = value;
      updatePreview();
      console.log("Minutes updated:", value);
    }, 60, 3);
  }

  function setupWheelScroll(wheel, callback, mainItemsCount, paddingCount) {
    if (!wheel) return;
    
    const container = wheel.querySelector('.wheel-items');
    if (!container) return;
    
    const items = container.querySelectorAll('.wheel-item');
    let currentIndex = paddingCount;
    
    function updateSelection(index) {
      items.forEach(item => item.classList.remove('center', 'selected'));
      
      if (items[index]) {
        items[index].classList.add('center', 'selected');
        const value = parseInt(items[index].dataset.value);
        callback(value);
      }
      
      const itemHeight = 20;
      const containerHeight = 60;
      const centerPosition = Math.floor(containerHeight / 2) - Math.floor(itemHeight / 2);
      const offset = centerPosition - (index * itemHeight);
      container.style.transform = `translateY(${offset}px)`;
      
      // Handle infinite scroll repositioning
      if (index < paddingCount) {
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
    
    // Wheel scroll
    wheel.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        currentIndex++;
      } else {
        currentIndex--;
      }
      updateSelection(currentIndex);
    });
    
    updateSelection(currentIndex);
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
        if (currentHours > 0 || currentMinutes > 0) {
          // Save with reminder
          await saveReminder(url, customTitle, currentHours, currentMinutes, selectedFolderId);
          
          const timeText = currentHours > 0 ? 
            `${currentHours}h ${currentMinutes}m` : 
            `${currentMinutes}m`;
          
          if (successMessage) {
            successMessage.textContent = `You'll be reminded in ${timeText}`;
          }
        } else {
          // Save without reminder
          await saveLinkWithoutReminder(url, customTitle, selectedFolderId);
          
          if (successMessage) {
            successMessage.textContent = "Link saved successfully!";
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
  
  initTimePicker();
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

console.log("Popup script loaded successfully");

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
      
      if (previewImage) {
        console.log("Attempting to fetch preview from microlink...");
        fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
          .then(res => {
            console.log("Microlink response received:", res.status);
            return res.json();
          })
          .then(data => {
            console.log("Microlink data:", data);
            if (data.status !== 'success') {
              // Hide loading, no image available
              if (previewLoading) previewLoading.style.display = 'none';
              return;
            }

            const { title, image } = data.data;
            const titleEl = document.getElementById("site-title");
            const imageEl = document.getElementById("preview-image");
            const loadingEl = document.getElementById("preview-loading");

            if (title && titleEl) titleEl.textContent = title;
            if (image?.url && imageEl) {
              imageEl.onload = function() {
                // Hide loading when image loads
                if (loadingEl) loadingEl.style.display = 'none';
                imageEl.style.display = 'block';
                
                // Check if image should be marked as small/distorted
                checkAndMarkSmallImage(imageEl);
              };
              imageEl.onerror = function() {
                // Hide loading if image fails to load
                if (loadingEl) loadingEl.style.display = 'none';
                imageEl.style.display = 'none';
              };
              imageEl.src = image.url;
            } else {
              // No image available, hide loading
              if (loadingEl) loadingEl.style.display = 'none';
            }
          })
          .catch(err => {
            console.error("Error fetching preview:", err);
            if (previewImage) {
              previewImage.src = '';
              previewImage.style.display = 'none';
            }
            if (previewLoading) {
              previewLoading.style.display = 'none';
            }
          });
      } else {
        console.log("previewImage element not found");
      }

      // Handle favicon
      if (siteFavicon) {
        const isValidDomain = domain && 
                             domain !== 'localhost' && 
                             !domain.startsWith('127.') && 
                             !domain.includes('extension') &&
                             domain.includes('.') && 
                             domain.length > 2;

        if (isValidDomain) {
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
          siteFavicon.src = faviconUrl;
          siteFavicon.style.display = 'block';
          
          siteFavicon.onerror = function() {
            console.log("Favicon failed for domain:", domain);
            this.style.display = 'none';
            this.src = '';
            this.onerror = null;
          };
        } else {
          console.log("Invalid domain for favicon:", domain);
          siteFavicon.style.display = 'none';
          siteFavicon.src = '';
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
      if (previewLoading) {
        previewLoading.style.display = 'none';
      }
    }
    
    console.log("loadSitePreview completed");
  }

  // Function to update preview time
  function updatePreview() {
    if (currentHours === 0 && currentMinutes === 0) {
      if (previewTime) previewTime.textContent = "Please set a delay time (optional)";
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

  // Initialize time picker
  function initTimePicker() {
    if (!hoursWheel || !minutesWheel) {
      console.error("Time picker wheels not found");
      return;
    }

    // Generate hours items
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
    
    // Generate minutes items
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
    
    // Setup wheel scroll behavior
    setupWheelScroll(hoursWheel, (value) => {
      currentHours = value;
      updatePreview();
      console.log("Hours updated:", value);
    }, 24, 3);
    
    setupWheelScroll(minutesWheel, (value) => {
      currentMinutes = value;
      updatePreview();
      console.log("Minutes updated:", value);
    }, 60, 3);
  }

  function setupWheelScroll(wheel, callback, mainItemsCount, paddingCount) {
    if (!wheel) return;
    
    const container = wheel.querySelector('.wheel-items');
    if (!container) return;
    
    const items = container.querySelectorAll('.wheel-item');
    let currentIndex = paddingCount;
    
    function updateSelection(index) {
      items.forEach(item => item.classList.remove('center', 'selected'));
      
      if (items[index]) {
        items[index].classList.add('center', 'selected');
        const value = parseInt(items[index].dataset.value);
        callback(value);
      }
      
      const itemHeight = 20;
      const containerHeight = 60;
      const centerPosition = Math.floor(containerHeight / 2) - Math.floor(itemHeight / 2);
      const offset = centerPosition - (index * itemHeight);
      container.style.transform = `translateY(${offset}px)`;
      
      // Handle infinite scroll repositioning
      if (index < paddingCount) {
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
    
    // Wheel scroll
    wheel.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        currentIndex++;
      } else {
        currentIndex--;
      }
      updateSelection(currentIndex);
    });
    
    updateSelection(currentIndex);
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
        if (currentHours > 0 || currentMinutes > 0) {
          // Save with reminder
          await saveReminder(url, customTitle, currentHours, currentMinutes, selectedFolderId);
          
          const timeText = currentHours > 0 ? 
            `${currentHours}h ${currentMinutes}m` : 
            `${currentMinutes}m`;
          
          if (successMessage) {
            successMessage.textContent = `You'll be reminded in ${timeText}`;
          }
        } else {
          // Save without reminder
          await saveLinkWithoutReminder(url, customTitle, selectedFolderId);
          
          if (successMessage) {
            successMessage.textContent = "Link saved successfully!";
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

console.log("Popup script loaded successfully");