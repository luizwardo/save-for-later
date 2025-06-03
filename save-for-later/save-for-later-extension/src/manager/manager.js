document.addEventListener('DOMContentLoaded', function() {
    loadSavedLinks();
    
    document.getElementById('show-all').addEventListener('click', () => filterLinks('all'));
    document.getElementById('show-reminders').addEventListener('click', () => filterLinks('reminders'));
    document.getElementById('show-no-reminders').addEventListener('click', () => filterLinks('no-reminders'));
});

function loadSavedLinks() {
    chrome.storage.sync.get({ savedLinks: [] }, function(data) {
        const savedLinks = data.savedLinks;
        displayLinks(savedLinks);
    });
}

function displayLinks(links) {
    const linkList = document.getElementById('link-list');
    linkList.innerHTML = '';
    
    links.forEach((link, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'link-item';
        listItem.setAttribute('data-has-reminder', link.reminderDate ? 'true' : 'false');
        
        const displayTitle = link.customTitle || link.title;
        const reminderInfo = link.reminderDate ? 
            `<div class="reminder-info">
                <span class="reminder-icon">🔔</span>
                Reminder: ${formatDate(link.reminderDate)} at ${link.reminderTime || 'No time set'}
            </div>` : '';
        
        listItem.innerHTML = `
            <div class="link-content">
                <div class="link-header">
                    <a href="${link.url}" target="_blank" class="link-title">${displayTitle}</a>
                    <div class="link-actions">
                        <button onclick="editLink(${index})" class="edit-btn">Edit</button>
                        <button onclick="deleteLink(${index})" class="delete-btn">Delete</button>
                    </div>
                </div>
                <div class="link-url">${link.url}</div>
                ${reminderInfo}
                <div class="link-meta">Added: ${formatDate(link.dateAdded)}</div>
            </div>
        `;
        
        linkList.appendChild(listItem);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function filterLinks(type) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`show-${type === 'all' ? 'all' : type === 'reminders' ? 'reminders' : 'no-reminders'}`).classList.add('active');
    
    const linkItems = document.querySelectorAll('.link-item');
    linkItems.forEach(item => {
        const hasReminder = item.getAttribute('data-has-reminder') === 'true';
        
        switch(type) {
            case 'all':
                item.style.display = 'block';
                break;
            case 'reminders':
                item.style.display = hasReminder ? 'block' : 'none';
                break;
            case 'no-reminders':
                item.style.display = !hasReminder ? 'block' : 'none';
                break;
        }
    });
}

function editLink(index) {
    chrome.storage.sync.get({ savedLinks: [] }, function(data) {
        const link = data.savedLinks[index];
        const newTitle = prompt('Edit title:', link.customTitle || link.title);
        const newUrl = prompt('Edit URL:', link.url);
        
        if (newTitle !== null && newUrl !== null) {
            data.savedLinks[index].customTitle = newTitle;
            data.savedLinks[index].url = newUrl;
            
            chrome.storage.sync.set({ savedLinks: data.savedLinks }, function() {
                loadSavedLinks();
            });
        }
    });
}

function deleteLink(index) {
    if (confirm('Are you sure you want to delete this link?')) {
        // Clear any associated alarm
        chrome.alarms.clear(`reminder_${index}`);
        
        chrome.storage.sync.get({ savedLinks: [] }, function(data) {
            data.savedLinks.splice(index, 1);
            chrome.storage.sync.set({ savedLinks: data.savedLinks }, function() {
                loadSavedLinks();
            });
        });
    }
}