const SECURE_HOSTS = [
    'imgur.com', 'giphy.com', 'i.pinimg.com', 'postimg.cc', 'iimg.su',
    'i.redd.it', 'tenor.com', 'gfycat.com', 'ibb.co', 'prnt.sc',
    'paste.pics', 'discordapp.com', 'pic.re', 'vk.com', '2ch.org', '2ch.su'
];

const SECURE_HOSTS_SET = new Set(SECURE_HOSTS);
const INVALID_URLS = new Set(); 
const MEDIA_REGEX = {
    IMG: /https?:\/\/.+?\.(?:jpe?g|png|gif|webp)/i,
    VID: /https?:\/\/.+?\.(?:mp4|webm)/i,
};
const CHAT_LINK_SELECTORS = 
    'span[data-a-target="chat-line-message-body"] a[href], ' + 
    'span.seventv-chat-message-body a[href], ' + 
    'div.chat-line__message a[href]';
const MEDIA_STYLES = "max-width: 312px; max-height: 312px; margin-top: 6px; border-radius: 6px;";
const PROCESSED_ATTR = 'data-media-embedded';

function isAllowedHost(url) {
    try {
        const host = new URL(url).hostname;
        const rootHost = host.substring(host.indexOf('.') + 1);
        return SECURE_HOSTS_SET.has(host) || SECURE_HOSTS_SET.has(rootHost);
    } catch {
        return false;
    }
}

function buildMediaEmbed(anchorElement, mediaUrl, mediaType) {
    const mediaNode = document.createElement(mediaType === 'img' ? 'img' : 'video');
    mediaNode.src = mediaUrl;
    mediaNode.style.cssText = MEDIA_STYLES;
    if (mediaType === 'video') {
        mediaNode.controls = true;
        mediaNode.muted = true;
        mediaNode.autoplay = false; 
    }
    anchorElement.replaceChildren(mediaNode);
    anchorElement.setAttribute(PROCESSED_ATTR, 'true');
}

function processLink(linkElement) {
    const url = linkElement.href;
    if (linkElement.hasAttribute(PROCESSED_ATTR)) return;
    if (INVALID_URLS.has(url)) {
        linkElement.setAttribute(PROCESSED_ATTR, 'true');
        return;
    }

    if (!isAllowedHost(url)) {
        INVALID_URLS.add(url);
        linkElement.setAttribute(PROCESSED_ATTR, 'true');
        return;
    }

    let mediaType = null;
    if (MEDIA_REGEX.IMG.test(url)) {
        mediaType = 'img';
    } else if (MEDIA_REGEX.VID.test(url)) {
        mediaType = 'video';
    }

    if (mediaType) {
        buildMediaEmbed(linkElement, url, mediaType); 
    } else {
        INVALID_URLS.add(url);
        linkElement.setAttribute(PROCESSED_ATTR, 'true');
    }
}

const chatContainerSelector = 'div.chat-list__list-container';
const chatContainer = document.querySelector(chatContainerSelector);
if (chatContainer) {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const links = node.querySelectorAll(CHAT_LINK_SELECTORS);
                        
                        if (node.matches(CHAT_LINK_SELECTORS)) {
                           processLink(node);
                        }

                        links.forEach(processLink);
                    }
                });
            }
        }
    });
    observer.observe(chatContainer, { childList: true, subtree: true });

} else {
    (function fallbackLoop() {
        document.querySelectorAll(CHAT_LINK_SELECTORS + `:not([${PROCESSED_ATTR}])`).forEach(processLink);
        setTimeout(fallbackLoop, 1000);
    })();
}