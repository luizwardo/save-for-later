document.addEventListener('DOMContentLoaded', function() {
    loadSavedLinks();
    
    document.getElementById('add-link').addEventListener('click', function() {
        addNewLink();
    });
});

function loadSavedLinks() {
    chrome.storage.sync.get({ savedLinks: [] }, function(data) {
        const savedLinks = data.savedLinks;
        const linkList = document.getElementById('link-list');
        linkList.innerHTML = ''; // Clear existing content
        
        if (savedLinks.length === 0) {
            linkList.innerHTML = '<li>No saved links yet.</li>';
            return;
        }
        
        savedLinks.forEach((link, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="link-item">
                    <a href="${link.url}" target="_blank">${link.title}</a>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </div>
            `;
            linkList.appendChild(listItem);
        });
        
        // Add delete functionality
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                deleteLink(index);
            });
        });
    });
}

function deleteLink(index) {
    chrome.storage.sync.get({ savedLinks: [] }, function(data) {
        const savedLinks = data.savedLinks;
        savedLinks.splice(index, 1);
        chrome.storage.sync.set({ savedLinks: savedLinks }, function() {
            loadSavedLinks(); // Reload the list
        });
    });
}

function addNewLink() {
    const url = prompt('Enter URL:');
    const title = prompt('Enter title:');
    
    if (url && title) {
        chrome.storage.sync.get({ savedLinks: [] }, function(data) {
            const savedLinks = data.savedLinks;
            savedLinks.push({ url: url, title: title });
            chrome.storage.sync.set({ savedLinks: savedLinks }, function() {
                loadSavedLinks(); // Reload the list
            });
        });
    }
}