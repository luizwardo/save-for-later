document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("url-input");
  const titleInput = document.getElementById("title-input");
  const delayHours = document.getElementById("delay-hours");
  const delayMinutes = document.getElementById("delay-minutes");
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  const previewTime = document.getElementById("preview-time");

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
    }
  } catch (error) {
    console.error("Error getting current tab:", error);
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

  // Handle reminder setting
  setReminderBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    const customTitle = titleInput.value.trim();
    const hours = parseInt(delayHours.value) || 0;
    const minutes = parseInt(delayMinutes.value) || 0;

    if (!url) {
      showError("Please enter a URL");
      return;
    }

    if (hours === 0 && minutes === 0) {
      showError("Please set a delay time (hours and/or minutes)");
      return;
    }

    try {
      await saveReminder(url, customTitle, hours, minutes);
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

async function saveReminder(url, customTitle, hours, minutes) {
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
