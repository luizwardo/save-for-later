// This file contains the JavaScript logic for the popup. It handles the click event on the save button, retrieves the current tab's URL, and saves it to storage. It may also include functions to display saved links.

// Auto-fill current tab info when popup opens
document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        document.getElementById('url-input').value = currentTab.url;
        document.getElementById('title-input').placeholder = `Default: ${currentTab.title}`;
    });
});

document.getElementById('save').addEventListener('click', function() {
    const urlInput = document.getElementById('url-input').value.trim();
    const customTitle = document.getElementById('title-input').value.trim();
    
    // Validate URL input
    if (!urlInput) {
        alert('Please enter a URL');
        return;
    }
    
    // If URL is from input, use it; otherwise get current tab
    if (urlInput) {
        const url = urlInput;
        let title = customTitle;
        
        // If no custom title provided, try to get page title or use URL
        if (!title) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const currentTab = tabs[0];
                title = currentTab.url === url ? currentTab.title : url;
                saveLink(url, title, customTitle);
            });
        } else {
            saveLink(url, title, customTitle);
        }
    } else {
        // Fallback to current tab
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const currentTab = tabs[0];
            const url = currentTab.url;
            const title = customTitle || currentTab.title;
            saveLink(url, title, customTitle);
        });
    }
});

function saveLink(url, title, customTitle) {
    chrome.storage.sync.get({ savedLinks: [] }, function(data) {
        const savedLinks = data.savedLinks;
        
        // Check if URL already exists
        const existingIndex = savedLinks.findIndex(link => link.url === url);
        
        const linkData = { 
            url: url, 
            title: title,
            customTitle: customTitle || null,
            dateAdded: new Date().toISOString()
        };
        
        if (existingIndex !== -1) {
            // Update existing link
            savedLinks[existingIndex] = linkData;
            alert('Link updated!');
        } else {
            // Add new link
            savedLinks.push(linkData);
            alert('Link saved!');
        }
        
        chrome.storage.sync.set({ savedLinks: savedLinks }, function() {
            // Clear inputs after saving
            document.getElementById('url-input').value = '';
            document.getElementById('title-input').value = '';
        });
    });
}

document.getElementById('manage').addEventListener('click', function() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('src/manager/manager.html')
    });
});

// Function to display saved links (to be called when needed)
function displaySavedLinks() {
    chrome.storage.sync.get({ savedLinks: [] }, function(data) {
        const savedLinks = data.savedLinks;
        const linksContainer = document.createElement('div');

        savedLinks.forEach(link => {
            const linkElement = document.createElement('div');
            const displayTitle = link.customTitle || link.title;
            linkElement.innerHTML = `<a href="${link.url}" target="_blank">${displayTitle}</a>`;
            linksContainer.appendChild(linkElement);
        });

        document.body.appendChild(linksContainer);
    });
}