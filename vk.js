const SECURE_HOSTS = [
    'imgur.com', 'giphy.com', 'i.pinimg.com', 'postimg.cc', 'iimg.su',
    'i.redd.it', 'tenor.com', 'gfycat.com', 'ibb.co', 'prnt.sc',
    'paste.pics', 'discordapp.com', 'pic.re', 'vk.com', '2ch.org', '2ch.su'
];

const MEDIA_REGEX = {
    IMG: /https?:\/\/.+?\.(?:jpe?g|png|gif|webp)/i,
    VID: /https?:\/\/.+?\.(?:mp4|webm)/i,
};

const MEDIA_STYLES = "max-width: 312px; max-height: 312px; margin-top: 6px; border-radius: 6px;";
const CHAT_CONTAINER_SELECTOR = '.ChatBoxBase_root_k1P9S'; 
const CHAT_LINK_SELECTORS = '[data-role="messageMainContent"] .BlockRenderer_markup_Wtipg a[href]'; 

function isAllowedHost(url) {
    try {
        const host = new URL(url).hostname;
        return SECURE_HOSTS.some(domain => host.endsWith(domain));
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
        mediaNode.loop = true; 
        mediaNode.autoplay = false; 
        mediaNode.addEventListener('loadeddata', () => scrollToBottom('smooth', 0), { once: true });
    } else {
        mediaNode.addEventListener('load', () => scrollToBottom('smooth', 0), { once: true });
    }
    
    mediaNode.addEventListener('error', () => scrollToBottom('smooth', 0), { once: true });
    anchorElement.replaceChildren(mediaNode);
    anchorElement.dataset.mediaEmbedded = 'true'; 
}

function processLinksInNode(node) {
    const linksToCheck = node.querySelectorAll(CHAT_LINK_SELECTORS + ':not([data-media-embedded])');

    for (const link of linksToCheck) {
        const url = link.href;

        if (!isAllowedHost(url)) continue;

        if (MEDIA_REGEX.IMG.test(url)) {
            buildMediaEmbed(link, url, 'img');
        } else if (MEDIA_REGEX.VID.test(url)) {
            buildMediaEmbed(link, url, 'video');
        }
    }
}

function scrollToBottom(behavior = 'auto', delay = 0) {
    setTimeout(() => {
        const rootContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
        let finalContainer = null;

        if (rootContainer) {
            const potentialScrollers = Array.from(rootContainer.querySelectorAll('div, ul, ol'))
                .filter(el => el.scrollHeight > el.clientHeight);

            if (potentialScrollers.length > 0) {
                finalContainer = potentialScrollers.reduce((prev, curr) => 
                    (curr.scrollHeight > prev.scrollHeight) ? curr : prev, potentialScrollers[0]
                );
            }
        }
        
        if (!finalContainer) {
             finalContainer = rootContainer;
        }

        if (!finalContainer || finalContainer.scrollHeight <= finalContainer.clientHeight) {
            finalContainer = document.scrollingElement || document.body || document.documentElement;
        }

        if (finalContainer) {
            finalContainer.scrollTo({
                top: finalContainer.scrollHeight,
                behavior: behavior 
            });
        }
    }, delay);
}

function handleMutations(mutationsList) {
    let newContentAdded = false;

    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { 
                    processLinksInNode(node);
                    newContentAdded = true; 
                }
            });
        }
    }
}

(function setupMutationObserver() {
    const targetNode = document.querySelector(CHAT_CONTAINER_SELECTOR); 

    if (!targetNode) {
        setTimeout(setupMutationObserver, 1000); 
        return; 
    }

    const config = { 
        childList: true, 
        subtree: true     
    };

    const observer = new MutationObserver(handleMutations);
    observer.observe(targetNode, config);
    processLinksInNode(document); 
    scrollToBottom(); 
})();