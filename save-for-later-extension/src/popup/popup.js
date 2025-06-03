document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("url-input");
  const titleInput = document.getElementById("title-input");
  const reminderDate = document.getElementById("reminder-date");
  const reminderTime = document.getElementById("reminder-time");
  const setReminderBtn = document.getElementById("set-reminder");
  const settingsBtn = document.getElementById("settings");
  const testNotificationBtn = document.getElementById("test-notification");
  const debugBtn = document.getElementById("debug-btn");

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

  // Set default reminder date to today and time to current time + 1 hour
  const now = new Date();
  reminderDate.value = now.toISOString().split("T")[0]; // YYYY-MM-DD format
  now.setHours(now.getHours() + 1);
  reminderTime.value = now.toTimeString().slice(0, 5);

  // Handle reminder setting
  setReminderBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    const customTitle = titleInput.value.trim();
    const date = reminderDate.value;
    const time = reminderTime.value;

    if (!url) {
      showError("Please enter a URL");
      return;
    }

    if (!time) {
      showError("Please select a reminder time");
      return;
    }

    if (!date) {
      showError("Please select a reminder date");
      return;
    }

    try {
      await saveReminder(url, customTitle, date, time);
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

  // Handle test notification button click
  testNotificationBtn.addEventListener("click", async () => {
    try {
      // Test immediate notification
      const testId = "test-immediate-" + Date.now();
      await chrome.notifications.create(testId, {
        type: "basic",
        iconUrl: "icon.png",
        title: "Test Notification - Immediate",
        message: "If you see this, notifications are working!",
        buttons: [{ title: "Great!" }],
      });

      showSuccess("Test notification sent!");

      // Test alarm-based notification in 10 seconds
      const alarmTestId = "test-alarm-" + Date.now();
      await chrome.alarms.create(alarmTestId, {
        when: Date.now() + 10000, // 10 seconds from now
      });

      // Store a test reminder for the alarm
      const testReminder = {
        id: alarmTestId,
        url: "https://example.com",
        title: "Test Alarm Notification",
        reminderDate: new Date(Date.now() + 10000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      const result = await chrome.storage.local.get(["reminders"]);
      const reminders = result.reminders || [];
      reminders.push(testReminder);
      await chrome.storage.local.set({ reminders });

      showSuccess("Alarm test scheduled for 10 seconds!");
    } catch (error) {
      console.error("Test notification error:", error);
      showError("Test notification failed");
    }
  });

  // Handle debug button click
  debugBtn.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/debug.html"),
    });
    window.close();
  });
});

async function saveReminder(url, customTitle, date, time) {
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

  // Calculate reminder date
  const reminderDate = new Date(`${date}T${time}:00`);

  // Check if the reminder date is in the past
  if (reminderDate <= new Date()) {
    throw new Error("Reminder time cannot be in the past");
  }

  // Create reminder object
  const reminder = {
    id: Date.now().toString(),
    url: url,
    title: title,
    reminderDate: reminderDate.toISOString(),
    createdAt: new Date().toISOString(),
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
  console.log("Alarm created for:", new Date(reminderDate.getTime()));

  // Debug: Check if alarm was actually created
  const alarms = await chrome.alarms.getAll();
  const createdAlarm = alarms.find((a) => a.name === reminder.id);
  console.log(
    "Alarm verification:",
    createdAlarm ? "SUCCESS - Alarm created" : "FAILED - Alarm not found"
  );

  // Debug: Log time until alarm
  const timeUntilAlarm = reminderDate.getTime() - Date.now();
  console.log(`Time until alarm: ${Math.round(timeUntilAlarm / 1000)} seconds`);
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
