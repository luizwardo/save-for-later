# Save for Later Chrome Extension

## Overview
The "Save for Later" Chrome extension allows users to save the current tab's link and manage saved links through a dedicated interface. Users can easily add additional links, view their saved links, and delete or edit them as needed.

## Features
- Save the current tab's URL with a single click.
- View, edit, and delete saved links on a separate management screen.
- User-friendly interface for managing saved links.

## Project Structure
```
save-for-later-extension
├── src
│   ├── popup
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── manager
│   │   ├── manager.html
│   │   ├── manager.js
│   │   └── manager.css
│   ├── background
│   │   └── background.js
│   ├── content
│   │   └── content.js
│   └── assets
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── manifest.json
└── README.md
```

## Installation
1. Clone the repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the `save-for-later-extension` directory.

## Usage
- Click the extension icon to open the popup and save the current tab.
- Access the management interface to view and manage your saved links.

## Contributing
Feel free to submit issues or pull requests for improvements and bug fixes.

## License
This project is licensed under the MIT License.