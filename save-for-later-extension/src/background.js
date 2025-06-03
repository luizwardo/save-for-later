// Background script to handle alarms and notifications
chrome.runtime.onInstalled.addListener(() => {
  console.log("Save for Later extension installed");
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(
    "🚨 ALARM TRIGGERED:",
    alarm.name,
    "at",
    new Date().toLocaleString()
  );

  try {
    // Get the reminder from storage
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    const reminder = reminders.find((r) => r.id === alarm.name);

    if (reminder) {
      console.log("📝 Found reminder:", reminder);

      // Create notification
      const notificationId = await chrome.notifications.create(reminder.id, {
        type: "basic",
        iconUrl: "icon.png",
        title: "⏰ Save for Later Reminder",
        message: `Time to check: ${reminder.title}`,
        buttons: [{ title: "Open Link" }, { title: "Dismiss" }],
        requireInteraction: true, // Keep notification visible until user interacts
      });

      console.log("🔔 Notification created:", notificationId);

      // Mark reminder as triggered
      const updatedReminders = reminders.map((r) =>
        r.id === reminder.id
          ? { ...r, triggered: true, triggeredAt: new Date().toISOString() }
          : r
      );
      await chrome.storage.local.set({ reminders: updatedReminders });
      console.log("✅ Reminder marked as triggered");
    } else {
      console.log("❌ No reminder found for alarm:", alarm.name);
      // Clean up orphaned alarm
      await chrome.alarms.clear(alarm.name);
    }
  } catch (error) {
    console.error("💥 Error handling alarm:", error);
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    try {
      // Get the reminder from storage
      const result = await chrome.storage.local.get(["reminders"]);
      const reminders = result.reminders || [];
      const reminder = reminders.find((r) => r.id === notificationId);

      if (reminder) {
        if (buttonIndex === 0) {
          // Open Link
          await chrome.tabs.create({ url: reminder.url });
        }
        // For both buttons, clear the notification
        await chrome.notifications.clear(notificationId);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  }
);

// Handle notification clicks (clicking the notification body)
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    // Get the reminder from storage
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    const reminder = reminders.find((r) => r.id === notificationId);

    if (reminder) {
      // Open the link
      await chrome.tabs.create({ url: reminder.url });
      await chrome.notifications.clear(notificationId);
    }
  } catch (error) {
    console.error("Error handling notification click:", error);
  }
});

// Clean up old alarms and notifications on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    // Get all reminders
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];

    // Get all alarms
    const alarms = await chrome.alarms.getAll();

    // Clean up alarms for reminders that no longer exist
    for (const alarm of alarms) {
      const reminderExists = reminders.some((r) => r.id === alarm.name);
      if (!reminderExists) {
        await chrome.alarms.clear(alarm.name);
      }
    }
  } catch (error) {
    console.error("Error cleaning up alarms:", error);
  }
});

// Add debugging functions to help diagnose notification issues
async function debugAlarms() {
  try {
    const alarms = await chrome.alarms.getAll();
    console.log("All active alarms:", alarms);
    return alarms;
  } catch (error) {
    console.error("Error getting alarms:", error);
    return [];
  }
}

async function debugReminders() {
  try {
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    console.log("All reminders in storage:", reminders);
    return reminders;
  } catch (error) {
    console.error("Error getting reminders:", error);
    return [];
  }
}

// Test notification function
async function testNotification() {
  try {
    // Check notification permission first
    const permission = await chrome.notifications.getPermissionLevel();
    console.log("📋 Notification permission level:", permission);

    if (permission === "denied") {
      console.error("❌ Notifications are denied by user");
      return false;
    }

    const testId = "test-" + Date.now();
    const notificationId = await chrome.notifications.create(testId, {
      type: "basic",
      iconUrl: "icon.png",
      title: "🧪 Test Notification",
      message: "If you see this, notifications are working!",
      buttons: [{ title: "OK" }],
      requireInteraction: false,
    });
    console.log("✅ Test notification created:", notificationId);

    // Clear test notification after 5 seconds
    setTimeout(() => {
      chrome.notifications.clear(testId);
      console.log("🗑️ Test notification cleared");
    }, 5000);

    return true;
  } catch (error) {
    console.error("💥 Error creating test notification:", error);
    return false;
  }
}

// Call debug functions on extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Extension started - running diagnostics...");
  await debugAlarms();
  await debugReminders();
});

// Also run diagnostics when extension is installed/reloaded
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed/reloaded - running diagnostics...");
  await debugAlarms();
  await debugReminders();

  // Test notification on install
  setTimeout(() => {
    testNotification();
  }, 2000);
});
