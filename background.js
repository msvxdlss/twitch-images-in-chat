const GITHUB_HOSTS_URL = 'https://raw.githubusercontent.com/msvxdlss/twitch-images-in-chat/refs/heads/main/secure_hosts.json';
const UPDATE_INTERVAL_MINUTES = 720;

const DEFAULT_HOSTS = [
    'imgur.com',
    'i.imgur.com',
    'giphy.com',
    'media.giphy.com',
    'tenor.com',
    'media.tenor.com',
    'gfycat.com',
    'ibb.co',
    'i.ibb.co',
    'imgbb.com',
    'postimg.cc',
    'iimg.su',
    'imgbox.com',
    'catbox.moe',
    'flickr.com',
    'prnt.sc',
    'paste.pics',
    'i.pinimg.com',
    'i.redd.it',
    'discordapp.com',
    'cdn.discordapp.com',
    'userapi.com',
    'vk.com',
    'clips.twitchcdn.net',
    'cdn.betterttv.net',
    'cdn.frankerfacez.com',
    'cdn.7tv.app',
    'i.ytimg.com',
    'yt3.ggph.com',
    'scontent.cdninstagram.com',
    'photos.google.com',
    'drive.google.com',
    'i.stack.imgur.com',
    'pic.re',
    '2ch.org',
    '2ch.su'
];

async function fetchAndStoreHostList() {
    try {
        const response = await fetch(GITHUB_HOSTS_URL);
        if (!response.ok) {
            throw new Error(`Fetch failed. Status: ${response.status}`);
        }

        const hosts = await response.json();

        if (Array.isArray(hosts) && hosts.length > 0) {
            await chrome.storage.local.set({ secureHostsList: hosts });
            console.log('[ImagesInChat] Host list updated from GitHub:', hosts.length);
        } else {
            throw new Error('Invalid hosts list format');
        }

    } catch (error) {
        console.warn('[ImagesInChat] Error fetching list:', error);

        const data = await chrome.storage.local.get('secureHostsList');
        
        if (!data.secureHostsList || data.secureHostsList.length === 0) {
            await chrome.storage.local.set({ secureHostsList: DEFAULT_HOSTS });
            console.log('[ImagesInChat] Using DEFAULT hosts list');
        } else {
            console.log('[ImagesInChat] Using previously saved hosts (not updating)');
        }
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('dailyHostUpdate', {
        delayInMinutes: 1,
        periodInMinutes: UPDATE_INTERVAL_MINUTES
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyHostUpdate') {
        fetchAndStoreHostList();
    }
});

fetchAndStoreHostList();