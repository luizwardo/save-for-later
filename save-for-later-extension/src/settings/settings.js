document.addEventListener("DOMContentLoaded", async () => {
  // Confirm open modal elements
  const confirmOpenModal = document.getElementById("confirm-open-modal");
  const confirmOpenBtn = document.getElementById("confirm-open-btn");
  const cancelOpenBtn = document.getElementById("cancel-open-btn");
  let pendingOpenLink = null;

  // Confirm open modal handlers
  if (confirmOpenBtn) {
    confirmOpenBtn.addEventListener("click", async () => {
      if (pendingOpenLink) {
        try {
          await chrome.tabs.create({ url: pendingOpenLink.url });
          await deleteLink(pendingOpenLink.id);
          await loadAllLinks();
        } catch (error) {
          console.error("Error opening/deleting link:", error);
          showNotification("Failed to open link", "error");
        }
      }
      pendingOpenLink = null;
      confirmOpenModal.classList.remove("show");
    });
  }

  if (cancelOpenBtn) {
    cancelOpenBtn.addEventListener("click", () => {
      pendingOpenLink = null;
      confirmOpenModal.classList.remove("show");
    });
  }

  if (confirmOpenModal) {
    confirmOpenModal.addEventListener("click", (e) => {
      if (e.target === confirmOpenModal) {
        pendingOpenLink = null;
        confirmOpenModal.classList.remove("show");
      }
    });
  }

  // Handle link clicks via event delegation
  document.addEventListener("click", handleLinkAction);

  async function handleLinkAction(event) {
    const target = event.target;

    // Handle clicking on a saved link card (not a button inside it)
    if (
      target.closest(".clickable-card") &&
      !target.classList.contains("action-btn") &&
      !target.closest(".action-btn")
    ) {
      const card = target.closest(".clickable-card");
      const url = card.dataset.url;
      const linkId = card.dataset.id;
      if (url && linkId) {
        pendingOpenLink = { id: linkId, url: url };
        confirmOpenModal.classList.add("show");
      }
      return;
    }

    // Handle button clicks
    if (
      !target.classList.contains("action-btn") &&
      !target.closest(".action-btn")
    )
      return;

    const actionBtn = target.classList.contains("action-btn")
      ? target
      : target.closest(".action-btn");
    const action = actionBtn.dataset.action;
    const linkId = actionBtn.dataset.id;
    const url = actionBtn.dataset.url;

    try {
      switch (action) {
        case "open":
          if (url && linkId) {
            pendingOpenLink = { id: linkId, url: url };
            confirmOpenModal.classList.add("show");
          }
          break;

        case "delete":
          if (linkId && confirm("Are you sure you want to delete this link?")) {
            await deleteLink(linkId);
            await loadAllLinks();
            showNotification("Link deleted successfully", "success");
          }
          break;
      }
    } catch (error) {
      console.error("Error handling link action:", error);
      showNotification("Failed to perform action", "error");
    }
  }

  // Load all links
  async function loadAllLinks() {
    try {
      const result = await chrome.storage.local.get(["savedLinks"]);
      const savedLinks = result.savedLinks || [];

      const allLinksGrid = document.getElementById("all-links-grid");
      if (!allLinksGrid) return;

      if (savedLinks.length === 0) {
        allLinksGrid.innerHTML =
          '<div class="empty-state">No links saved yet</div>';
      } else {
        const linksHTML = savedLinks.map((link) => createLinkHTML(link)).join("");
        allLinksGrid.innerHTML = linksHTML;
      }
    } catch (error) {
      console.error("Error loading all links:", error);
    }
  }

  // Create link card HTML
  function createLinkHTML(link) {
    let domain = "";
    let faviconHtml = "";

    try {
      const urlObj = new URL(link.url);
      domain = urlObj.hostname;

      const isValidDomain =
        domain &&
        domain !== "localhost" &&
        !domain.startsWith("127.") &&
        !domain.includes("extension") &&
        !domain.startsWith("chrome-") &&
        domain.includes(".") &&
        domain.length > 2;

      if (isValidDomain) {
        faviconHtml = `<img class="site-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" alt="" onerror="this.style.display='none';">`;
      }
    } catch (e) {
      domain = "Invalid URL";
    }

    // Use stored screenshot or show fallback
    let previewStyle = "";
    let previewContent = '<span style="color: var(--text-secondary);">No Preview</span>';
    if (link.previewDataUrl) {
      previewStyle = `background-image: url("${link.previewDataUrl}"); background-size: cover; background-position: center top;`;
      previewContent = "";
    }

    return `
      <div class="reminder-item clickable-card" data-id="${link.id}" data-url="${link.url}">
        <div class="reminder-content">
          <div class="site-preview-section">
            <div class="preview-image" style="${previewStyle}">
              ${previewContent}
            </div>
          </div>
          <div class="card-content">
            <div class="site-header">
              ${faviconHtml}
              <span class="site-domain">${domain.replace("www.", "")}</span>
            </div>
            <div class="reminder-title">${escapeHtml(link.title)}</div>
            <div class="link-actions-row">
              <button class="action-btn primary" data-action="open" data-id="${link.id}" data-url="${link.url}">
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
  }

  // Delete a saved link
  async function deleteLink(linkId) {
    try {
      const result = await chrome.storage.local.get(["savedLinks"]);
      const savedLinks = result.savedLinks || [];
      const updatedLinks = savedLinks.filter((link) => link.id !== linkId);
      await chrome.storage.local.set({ savedLinks: updatedLinks });
    } catch (error) {
      console.error("Error deleting link:", error);
      throw error;
    }
  }

  // Load links on init
  await loadAllLinks();
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type) {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

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

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }
  }, 4000);
}

// Notification animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
`;
document.head.appendChild(style);
