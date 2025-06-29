# Save for Later - Chrome Extension

A Chrome extension that allows you to save web pages and set reminders to revisit them later.

## Features

- **Save Current Page**: Automatically fills the URL field with the current tab's URL
- **Custom Titles**: Add custom titles to your saved links
- **Flexible Reminders**: Set specific dates and times for reminders
- **Browser Notifications**: Get notified when it's time to revisit your saved links
- **Management Interface**: View, edit, and delete your saved reminders
- **Past & Upcoming**: Separate views for past and upcoming reminders

## How to Install

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your browser toolbar

## How to Use

### Saving a Link

1. Navigate to any webpage
2. Click the extension icon in the toolbar
3. The URL will be automatically filled in
4. Optionally add a custom title
5. Set the date and time for your reminder
6. Click "Remind me later"

### Managing Reminders

1. Click the extension icon
2. Click the settings button (hamburger menu)
3. View your upcoming and past reminders
4. Edit, delete, or open any saved link

### Notifications

- When a reminder time arrives, you'll get a browser notification
- Click the notification to open the saved link
- Use the notification buttons to open or dismiss

## Permissions

- **storage**: To save your reminders locally
- **activeTab**: To get the current tab's URL and title
- **notifications**: To show reminder notifications
- **alarms**: To schedule future notifications

## File Structure

```
save-for-later-extension/
├── manifest.json           # Extension configuration
├── src/
│   ├── assets/
│   │   └── icon.png       # Extension icon
│   ├── popup/
│   │   ├── popup.html     # Main popup interface
│   │   ├── popup.css      # Popup styling
│   │   └── popup.js       # Popup functionality
│   ├── settings/
│   │   ├── settings.html  # Management interface
│   │   ├── settings.css   # Settings page styling
│   │   └── settings.js    # Settings functionality
│   └── background.js      # Background service worker
```

## Technical Details

- Built for Chrome Extension Manifest V3
- Uses Chrome Storage API for data persistence
- Uses Chrome Alarms API for scheduling reminders
- Uses Chrome Notifications API for alerts
- Dark theme UI with modern design

## Troubleshooting

- **Reminders not working**: Make sure you've granted notification permissions
- **Extension not loading**: Check that all files are in the correct locations
- **Past reminders**: The extension automatically categorizes triggered or overdue reminders

## Development

To modify the extension:

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test your changes

The extension uses modern JavaScript (ES6+) and Chrome Extension APIs v3.
