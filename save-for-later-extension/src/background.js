// Background script to handle alarms and notifications
chrome.runtime.onInstalled.addListener(() => {
  console.log("Save for Later extension installed");
});

// TODO: Remove
// Handle messages from content scripts/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "testNotification") {
    testNotification();
    sendResponse({ success: true });
  }
});
async function testNotification() {
  try {
    console.log("Creating test notification...");
    const notificationId = "test-" + Date.now();

    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: "assets/icon.png",
      title: "Test Notification",
      message: "This is a test notification from Save for Later extension",
      buttons: [{ title: "Test Button 1" }, { title: "Test Button 2" }],
    });

    console.log("Test notification created with ID:", notificationId);

    // Auto-clear after 5 seconds
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 5000);
  } catch (error) {
    console.error("Error creating test notification:", error);
  }
}

function showNotification(title, message, reminderId) {
  const notificationId = `reminder_${reminderId}`;
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'assets/icon.png',
    title: title,
    message: message,
    priority: 2,
    buttons: [
      { title: 'Open Link' },
      { title: 'Dismiss' }
    ]
  });

  // Auto-clear after 5 seconds
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 5000);
}

// Auto-delete past reminders function
async function autoDeletePastReminders() {
  try {
    const result = await chrome.storage.local.get(["reminders", "autoDeletePastReminders"]);
    const reminders = result.reminders || [];
    const autoDelete = result.autoDeletePastReminders || false;

    if (!autoDelete) return;

    const now = new Date();
    const pastReminders = reminders.filter(r => new Date(r.reminderDate) <= now && r.triggered);
    const activeReminders = reminders.filter(r => !(new Date(r.reminderDate) <= now && r.triggered));

    if (pastReminders.length > 0) {
      // Update storage with only active reminders
      await chrome.storage.local.set({ reminders: activeReminders });
      
      // Clear alarms for deleted reminders
      for (const reminder of pastReminders) {
        try {
          await chrome.alarms.clear(reminder.id);
        } catch (error) {
          console.warn("Failed to clear alarm for reminder:", reminder.id);
        }
      }
      
      console.log(`Auto-deleted ${pastReminders.length} past reminders`);
    }
  } catch (error) {
    console.error("Error auto-deleting past reminders:", error);
  }
}

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoDeleteCheck') {
    await autoDeletePastReminders();
    return;
  }
  
  console.log("Alarm triggered:", alarm.name);

  try {
    // Get the reminder from storage
    const result = await chrome.storage.local.get(["reminders"]);
    const reminders = result.reminders || [];
    const reminder = reminders.find((r) => r.id === alarm.name);

    if (reminder) {
      // Create notification
      await chrome.notifications.create(reminder.id, {
        type: "basic",
        iconUrl: "assets/icon.png",
        title: "Save for Later Reminder",
        message: `Time to check: ${reminder.title}`,
        buttons: [{ title: "Open Link" }, { title: "Dismiss" }],
      });

      // Mark reminder as triggered
      const updatedReminders = reminders.map((r) =>
        r.id === reminder.id
          ? { ...r, triggered: true, triggeredAt: new Date().toISOString() }
          : r
      );
      await chrome.storage.local.set({ reminders: updatedReminders });
    }
  } catch (error) {
    console.error("Error handling alarm:", error);
  }

  // After handling the alarm, run auto-delete
  await autoDeletePastReminders();
});

// Run auto-delete periodically (every hour)
chrome.alarms.create('autoDeleteCheck', { 
  delayInMinutes: 60, 
  periodInMinutes: 60 
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