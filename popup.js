document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('forceEmbedToggle');
    chrome.storage.local.get('forceEmbedAll', (data) => {
        toggle.checked = data.forceEmbedAll === true;
    });
    toggle.addEventListener('change', () => {
        chrome.storage.local.set({ forceEmbedAll: toggle.checked }, () => {
            console.log('Force Embed All mode set to:', toggle.checked);
        });
    });
});