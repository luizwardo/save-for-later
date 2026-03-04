document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup loading started...");
  
  // Get all elements
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  
  // Folder elements
  const folderSelect = document.getElementById("folder-select");
  const newFolderInput = document.getElementById("new-folder");
  const newFolderBtn = document.getElementById("new-folder-btn");
  const newFolderWrapper = document.getElementById("new-folder-wrapper");
  
  // Modal elements
  const successModal = document.getElementById('success-modal');
  const successMessage = document.getElementById('success-message');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closePopupBtn = document.getElementById('close-popup-btn');
  
  let currentTabUrl = '';
  let currentTabTitle = '';
  let currentTabWindowId = null;
  let currentTabFavicon = '';

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
      currentTabWindowId = tab.windowId ?? null;
      currentTabFavicon = tab.favIconUrl || '';
      loadSitePreview(tab.url, tab.title, { windowId: currentTabWindowId, favIconUrl: currentTabFavicon });
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
      
      const naturalWidth = imageEl.naturalWidth;
      const naturalHeight = imageEl.naturalHeight;
      
      console.log('Image dimensions:', naturalWidth, 'x', naturalHeight);
      
      const isVerySmall = naturalWidth < 100 || naturalHeight < 100;
      const hasWeirdAspectRatio = (naturalWidth / naturalHeight) > 3 || (naturalHeight / naturalWidth) > 3;
      const isSquareIcon = Math.abs(naturalWidth - naturalHeight) < 10 && naturalWidth < 200;
      const isTooNarrow = naturalWidth < 150 && naturalHeight > naturalWidth * 2;
      
      const shouldBeSmall = isVerySmall || hasWeirdAspectRatio || isSquareIcon || isTooNarrow;
      
      if (shouldBeSmall) {
        imageEl.classList.add('small-preview');
      } else {
        imageEl.classList.remove('small-preview');
      }
    } catch (error) {
      console.error('Error checking image dimensions:', error);
    }
  }

  // Safely attempt to capture a preview screenshot of the visible tab
  async function tryCapturePreview(windowId) {
    try {
      if (!chrome?.tabs?.captureVisibleTab) return null;
      const options = { format: 'jpeg', quality: 60 };
      const dataUrl = await chrome.tabs.captureVisibleTab(windowId ?? undefined, options);
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
        return dataUrl;
      }
      return null;
    } catch (e) {
      console.warn('captureVisibleTab failed, will fallback:', e);
      return null;
    }
  }

  function loadSitePreview(url, title, tabInfo = {}) {
    console.log("loadSitePreview called with:", url, title);
    
    const siteTitle = document.getElementById("site-title");
    const siteDomain = document.getElementById("site-domain");
    const siteFavicon = document.getElementById("site-favicon");
    const previewImage = document.getElementById("preview-image");
    const previewLoading = document.getElementById("preview-loading");
    const { windowId = null, favIconUrl = '' } = tabInfo || {};

    if (previewLoading) {
      previewLoading.style.display = 'block';
    }
    if (previewImage) {
      previewImage.style.display = 'none';
    }

    try {
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
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

      if (siteTitle) {
        siteTitle.textContent = title || "Untitled";
      }
      if (siteDomain) {
        siteDomain.textContent = domain;
      }
      
      const isValidDomain = domain && 
                         domain !== 'localhost' && 
                         !domain.startsWith('127.') && 
                         !domain.includes('extension') &&
                         domain.includes('.') && 
                         domain.length > 2;

      if (isValidDomain) {
        if (siteFavicon) {
          const smallFaviconUrl = favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
          siteFavicon.src = smallFaviconUrl;
          siteFavicon.style.display = 'block';

          siteFavicon.onerror = function() {
            this.style.display = 'none';
            this.src = '';
            this.onerror = null;
          };
        }

        (async () => {
          let shown = false;
          try {
            const cap = await Promise.race([
              tryCapturePreview(windowId),
              new Promise(resolve => setTimeout(() => resolve(null), 1200))
            ]);

            if (cap && previewImage) {
              previewImage.onload = function() {
                if (previewLoading) previewLoading.style.display = 'none';
                previewImage.style.display = 'block';
                checkAndMarkSmallImage(previewImage);
              };
              previewImage.onerror = function() {
                shown = false;
                this.onerror = null;
              };
              previewImage.src = cap;
              shown = true;
            }
          } catch (e) {
            console.warn('Preview capture flow error:', e);
          }

          if (shown) return;

          if (previewImage) {
            const largeFaviconUrl = favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

            previewImage.onload = function() {
              if (previewLoading) previewLoading.style.display = 'none';
              previewImage.style.display = 'block';
              checkAndMarkSmallImage(previewImage);
            };

            previewImage.onerror = function() {
              const altFaviconUrl = `https://icon.horse/icon/${domain}`;

              previewImage.onload = function() {
                if (previewLoading) previewLoading.style.display = 'none';
                previewImage.style.display = 'block';
                checkAndMarkSmallImage(previewImage);
              };

              previewImage.onerror = function() {
                if (previewLoading) previewLoading.style.display = 'none';
                previewImage.style.display = 'none';
              };

              previewImage.src = altFaviconUrl;
            };

            previewImage.src = largeFaviconUrl;
          }
        })();
      } else {
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
  if (newFolderBtn && newFolderInput && newFolderWrapper) {
    function updateFloatingLabel() {
      if (newFolderInput.value.trim() !== '' || document.activeElement === newFolderInput) {
        newFolderWrapper.classList.add('active');
      } else {
        newFolderWrapper.classList.remove('active');
      }
    }

    newFolderBtn.addEventListener("click", () => {
      newFolderBtn.classList.add("hidden");
      newFolderWrapper.classList.remove("hidden");
      newFolderInput.focus();
      updateFloatingLabel();
    });

    newFolderInput.addEventListener("focus", updateFloatingLabel);
    newFolderInput.addEventListener("blur", updateFloatingLabel);
    newFolderInput.addEventListener("input", updateFloatingLabel);

    newFolderInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const folderName = newFolderInput.value.trim();
        if (folderName) {
          const folderId = await createFolder(folderName);
          if (folderId && folderSelect) {
            folderSelect.value = folderId;
            newFolderWrapper.classList.add("hidden");
            newFolderWrapper.classList.remove("active");
            newFolderInput.value = "";
            newFolderBtn.classList.remove("hidden");
            showSuccess("Folder created and selected!");
          }
        }
      }
    });

    newFolderInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        newFolderWrapper.classList.add("hidden");
        newFolderWrapper.classList.remove("active");
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
        await saveLink(url, customTitle, selectedFolderId);
        
        if (successMessage) {
          successMessage.textContent = "Link saved successfully.";
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

  // Initialize
  await loadFolders();
  console.log("Folders loaded");
  console.log("Popup initialized successfully");
});

// Theme detection and icon update
function updateThemeIcon() {
  try {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const iconPath = prefersDark ? 'assets/sfl-dark.png' : 'assets/sfl-light.png';
    
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

// Capture tab screenshot as data URL for storage
async function captureScreenshotForStorage() {
  try {
    if (!chrome?.tabs?.captureVisibleTab) return null;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 50 });
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
      return dataUrl;
    }
    return null;
  } catch (e) {
    console.warn('Screenshot capture for storage failed:', e);
    return null;
  }
}

// Save link (no reminder)
async function saveLink(url, customTitle, folderId = null) {
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

  // Capture screenshot of the current tab
  const previewDataUrl = await captureScreenshotForStorage();

  const linkData = {
    id: Date.now().toString(),
    url: url,
    title: title,
    createdAt: new Date().toISOString(),
    folderId: folderId || null,
    previewDataUrl: previewDataUrl || null
  };

  const result = await chrome.storage.local.get(["savedLinks"]);
  const savedLinks = result.savedLinks || [];
  savedLinks.push(linkData);
  await chrome.storage.local.set({ savedLinks });

  console.log("Link saved:", linkData.id);
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
