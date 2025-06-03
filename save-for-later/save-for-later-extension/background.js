// Handle alarm events for reminders
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('reminder_')) {
    const linkIndex = alarm.name.replace('reminder_', '');
    
    chrome.storage.sync.get({ savedLinks: [] }, (data) => {
      const link = data.savedLinks[parseInt(linkIndex)];
      
      if (link) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Save for Later Reminder',
          message: `Don't forget: ${link.customTitle || link.title}`,
          buttons: [
            { title: 'Open Link' },
            { title: 'Dismiss' }
          ]
        }, (notificationId) => {
          // Store the link URL with the notification ID
          chrome.storage.local.set({
            [`notification_${notificationId}`]: link.url
          });
        });
      }
    });
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // Open Link button
    chrome.storage.local.get([`notification_${notificationId}`], (result) => {
      const url = result[`notification_${notificationId}`];
      if (url) {
        chrome.tabs.create({ url: url });
      }
    });
  }
  
  // Clear the notification
  chrome.notifications.clear(notificationId);
  chrome.storage.local.remove([`notification_${notificationId}`]);
});

// Clear notification when clicked
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.storage.local.get([`notification_${notificationId}`], (result) => {
    const url = result[`notification_${notificationId}`];
    if (url) {
      chrome.tabs.create({ url: url });
    }
  });
  
  chrome.notifications.clear(notificationId);
  chrome.storage.local.remove([`notification_${notificationId}`]);
});
