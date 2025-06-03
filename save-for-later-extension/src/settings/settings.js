document.addEventListener("DOMContentLoaded", async () => {
  const upcomingRemindersContainer =
    document.getElementById("upcoming-reminders");
  const pastRemindersContainer = document.getElementById("past-reminders");
  const backBtn = document.getElementById("back-btn");
  const clearAllBtn = document.getElementById("clear-all-btn");

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
  if (isTriggered) {
    statusText = `Triggered on ${new Date(
      reminder.triggeredAt
    ).toLocaleDateString()}`;
  } else if (isOverdue) {
    statusText = "Overdue";
  } else if (type === "upcoming") {
    statusText = `Scheduled for ${reminderDate.toLocaleDateString()} at ${reminderDate.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )}`;
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
  )}
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
                    ? `<button class="action-btn" data-action="edit" data-id="${reminder.id}">Edit</button>`
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

  // Create a simple edit dialog
  const newDateStr = prompt(
    `Edit reminder date for: ${
      reminder.title
    }\n\nCurrent date/time: ${currentDate.toLocaleString()}\n\nEnter new date (YYYY-MM-DD):`,
    currentDate.toISOString().split("T")[0]
  );

  if (newDateStr === null) return; // User cancelled

  const newTimeStr = prompt(
    `Enter new time (HH:MM):`,
    currentDate.toTimeString().slice(0, 5)
  );

  if (newTimeStr === null) return; // User cancelled

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateStr)) {
    showNotification("Invalid date format. Please use YYYY-MM-DD", "error");
    return;
  }

  if (!/^\d{2}:\d{2}$/.test(newTimeStr)) {
    showNotification("Invalid time format. Please use HH:MM", "error");
    return;
  }

  try {
    const newDate = new Date(`${newDateStr}T${newTimeStr}:00`);

    // Check if the reminder date is in the past
    if (newDate <= new Date()) {
      showNotification("Reminder time cannot be in the past", "error");
      return;
    }

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
