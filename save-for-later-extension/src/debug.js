// Debug functions for Save for Later extension

async function checkPermissions() {
  const statusDiv = document.getElementById("permissions-status");
  statusDiv.innerHTML = '<div class="info">Checking permissions...</div>';

  try {
    const permissions = await chrome.permissions.getAll();
    console.log("Permissions:", permissions);

    let html = '<div class="success">✅ Basic permissions granted:</div>';
    html += `<pre>${JSON.stringify(permissions, null, 2)}</pre>`;

    // Check notification permission specifically
    try {
      const notificationLevel = await chrome.notifications.getPermissionLevel();
      html += `<div class="success">✅ Notification permission: ${notificationLevel}</div>`;

      if (notificationLevel === "denied") {
        html +=
          '<div class="error">❌ Notifications are blocked! Please enable them in browser settings.</div>';
      }
    } catch (error) {
      html += `<div class="error">❌ Error checking notification permission: ${error.message}</div>`;
    }

    statusDiv.innerHTML = html;
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Error checking permissions: ${error.message}</div>`;
    console.error("Permission check error:", error);
  }
}

async function testNotifications() {
  const statusDiv = document.getElementById("notification-status");
  statusDiv.innerHTML =
    '<div class="info">Testing immediate notification...</div>';

  try {
    const testId = "debug-test-" + Date.now();
    const notificationId = await chrome.notifications.create(testId, {
      type: "basic",
      iconUrl: "icon.png",
      title: "🧪 Debug Test Notification",
      message: "This is a test notification from the debug panel!",
      buttons: [{ title: "Success!" }],
      requireInteraction: true,
    });

    console.log("Test notification created:", notificationId);
    statusDiv.innerHTML =
      '<div class="success">✅ Immediate notification sent! Check your system notifications.</div>';

    // Clear after 10 seconds
    setTimeout(() => {
      chrome.notifications.clear(testId);
    }, 10000);
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Failed to create notification: ${error.message}</div>`;
    console.error("Notification test error:", error);
  }
}

async function testAlarmNotification() {
  const statusDiv = document.getElementById("notification-status");
  statusDiv.innerHTML =
    '<div class="info">Setting up alarm notification for 10 seconds...</div>';

  try {
    const alarmId = "debug-alarm-" + Date.now();
    const reminderDate = new Date(Date.now() + 10000); // 10 seconds from now

    // Create test reminder in storage
    const testReminder = {
      id: alarmId,
      url: "https://example.com",
      title: "Debug Alarm Test",
      reminderDate: reminderDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    reminders.push(testReminder);
    await chrome.storage.local.set({ reminders });

    // Create alarm
    await chrome.alarms.create(alarmId, {
      when: reminderDate.getTime(),
    });

    console.log("Test alarm created:", alarmId, "for", reminderDate);
    statusDiv.innerHTML =
      '<div class="success">✅ Test alarm set for 10 seconds! Watch for notification.</div>';
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Failed to create alarm: ${error.message}</div>`;
    console.error("Alarm test error:", error);
  }
}

async function checkStorage() {
  const statusDiv = document.getElementById("storage-status");
  statusDiv.innerHTML = '<div class="info">Checking storage...</div>';

  try {
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];

    let html = `<div class="success">✅ Found ${reminders.length} reminders in storage:</div>`;
    if (reminders.length > 0) {
      html += "<pre>" + JSON.stringify(reminders, null, 2) + "</pre>";
    } else {
      html += '<div class="info">No reminders found.</div>';
    }

    statusDiv.innerHTML = html;
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Error checking storage: ${error.message}</div>`;
    console.error("Storage check error:", error);
  }
}

async function checkAlarms() {
  const statusDiv = document.getElementById("storage-status");
  statusDiv.innerHTML = '<div class="info">Checking active alarms...</div>';

  try {
    const alarms = await chrome.alarms.getAll();

    let html = `<div class="success">✅ Found ${alarms.length} active alarms:</div>`;
    if (alarms.length > 0) {
      html += "<pre>" + JSON.stringify(alarms, null, 2) + "</pre>";

      // Show time until each alarm
      alarms.forEach((alarm) => {
        const timeUntil = alarm.scheduledTime - Date.now();
        const minutes = Math.round(timeUntil / 60000);
        html += `<div class="info">⏰ Alarm "${alarm.name}" fires in ${minutes} minutes</div>`;
      });
    } else {
      html += '<div class="info">No active alarms found.</div>';
    }

    statusDiv.innerHTML = html;
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Error checking alarms: ${error.message}</div>`;
    console.error("Alarms check error:", error);
  }
}

async function clearAllData() {
  if (
    !confirm(
      "Are you sure you want to clear ALL reminders and alarms? This cannot be undone."
    )
  ) {
    return;
  }

  const statusDiv = document.getElementById("storage-status");
  statusDiv.innerHTML = '<div class="info">Clearing all data...</div>';

  try {
    // Clear storage
    await chrome.storage.local.set({ reminders: [] });

    // Clear all alarms
    const alarms = await chrome.alarms.getAll();
    for (const alarm of alarms) {
      await chrome.alarms.clear(alarm.name);
    }

    statusDiv.innerHTML =
      '<div class="success">✅ All data cleared successfully!</div>';
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Error clearing data: ${error.message}</div>`;
    console.error("Clear data error:", error);
  }
}

async function getSystemInfo() {
  const statusDiv = document.getElementById("system-status");
  statusDiv.innerHTML = '<div class="info">Getting system information...</div>';

  try {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      extensionId: chrome.runtime.id,
      manifestVersion: chrome.runtime.getManifest().manifest_version,
      currentTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    let html = '<div class="success">✅ System Information:</div>';
    html += "<pre>" + JSON.stringify(info, null, 2) + "</pre>";

    statusDiv.innerHTML = html;
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Error getting system info: ${error.message}</div>`;
    console.error("System info error:", error);
  }
}

async function createTestReminder() {
  const statusDiv = document.getElementById("test-status");
  statusDiv.innerHTML =
    '<div class="info">Creating test reminder for 2 minutes...</div>';

  try {
    const reminderId = "debug-reminder-" + Date.now();
    const reminderDate = new Date(Date.now() + 120000); // 2 minutes from now

    const reminder = {
      id: reminderId,
      url: "https://github.com",
      title: "Debug Test Reminder - 2 Minutes",
      reminderDate: reminderDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Save to storage
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    reminders.push(reminder);
    await chrome.storage.local.set({ reminders });

    // Create alarm
    await chrome.alarms.create(reminderId, {
      when: reminderDate.getTime(),
    });

    console.log("Test reminder created:", reminder);

    let html =
      '<div class="success">✅ Test reminder created successfully!</div>';
    html += `<div class="info">⏰ Will fire at: ${reminderDate.toLocaleString()}</div>`;
    html += `<div class="info">🆔 Reminder ID: ${reminderId}</div>`;
    html += '<div class="info">📱 Watch for notification in 2 minutes!</div>';

    statusDiv.innerHTML = html;
  } catch (error) {
    statusDiv.innerHTML = `<div class="error">❌ Error creating test reminder: ${error.message}</div>`;
    console.error("Test reminder error:", error);
  }
}

// Auto-run basic checks when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners to all buttons
  document
    .getElementById("check-permissions-btn")
    .addEventListener("click", checkPermissions);
  document
    .getElementById("test-notifications-btn")
    .addEventListener("click", testNotifications);
  document
    .getElementById("test-alarm-notification-btn")
    .addEventListener("click", testAlarmNotification);
  document
    .getElementById("check-storage-btn")
    .addEventListener("click", checkStorage);
  document
    .getElementById("check-alarms-btn")
    .addEventListener("click", checkAlarms);
  document
    .getElementById("clear-all-data-btn")
    .addEventListener("click", clearAllData);
  document
    .getElementById("get-system-info-btn")
    .addEventListener("click", getSystemInfo);
  document
    .getElementById("create-test-reminder-btn")
    .addEventListener("click", createTestReminder);

  // Auto-run basic checks after a short delay
  setTimeout(() => {
    checkPermissions();
  }, 500);
});
