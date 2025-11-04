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
const CHAT_CONTAINER_SELECTOR = '.relative.h-full.w-full.overflow-y-auto'; 
const CHAT_LINK_SELECTORS = '.w-full.min-w-0 a[href]'; 

const isAllowedHost = (url) => {
    try {
        const host = new URL(url).hostname;
        return SECURE_HOSTS.some(domain => host.endsWith(domain));
    } catch {
        return false;
    }
};

const buildMediaEmbed = (anchor, url, type) => {
    const isImage = type === 'img';
    const mediaNode = document.createElement(isImage ? 'img' : 'video');
    mediaNode.src = url;
    mediaNode.style.cssText = MEDIA_STYLES;

    if (!isImage) {
        mediaNode.controls = true;
        mediaNode.muted = true;
        mediaNode.loop = true; 
        mediaNode.autoplay = false; 
    }

    anchor.replaceChildren(mediaNode);
    anchor.dataset.mediaEmbedded = 'true'; 
};

const processLinksInNode = (node) => {
    node.querySelectorAll(CHAT_LINK_SELECTORS + ':not([data-media-embedded])').forEach(link => {
        const url = link.href;
        if (!isAllowedHost(url)) return;

        let type = null;
        if (MEDIA_REGEX.IMG.test(url)) {
            type = 'img';
        } else if (MEDIA_REGEX.VID.test(url)) {
            type = 'video';
        }
        
        if (type) {
            buildMediaEmbed(link, url, type);
        }
    });
};

const handleMutations = (mutationsList) => {
    mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { 
                    processLinksInNode(node);
                }
            });
        }
    });
};

(function setupObserver() {
    const targetNode = document.querySelector(CHAT_CONTAINER_SELECTOR);

    if (!targetNode) {
        setTimeout(setupObserver, 1000); 
        return; 
    }

    const observer = new MutationObserver(handleMutations);
    observer.observe(targetNode, { childList: true, subtree: true });
    
    processLinksInNode(document); 
})();