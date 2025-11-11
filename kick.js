chrome.storage.local.get(['secureHostsList', 'forceEmbedAll'], (data) => {
    const SECURE_HOSTS = new Set(data.secureHostsList || []);
    const FORCE_EMBED_ALL = data.forceEmbedAll || false; 
    const PROCESSED_CONTAINER_ATTR = 'data-media-processed';
    const MEDIA_REGEX = {
        IMG: /https?:\/\/[^\s]+?\.(jpe?g|png|gif|webp)(\?.*)?$/i,
        VID: /https?:\/\/[^\s]+?\.(mp4|webm)(\?.*)?$/i,
    };
    const MEDIA_STYLES = "max-width: 312px; max-height: 312px; margin-top: 6px; border-radius: 6px;";
    const CHAT_CONTAINER_SELECTOR = '.relative.h-full.w-full.overflow-y-auto';
    const CHAT_LINK_SELECTORS = '.w-full.min-w-0 a[href]';
    const PROCESSED_ATTR = 'data-media-embedded';
    function extractHost(url) {
        try {
            const { hostname } = new URL(url);
            return hostname.replace(/^www\./i, '');
        } catch {
            return null;
        }
    }

    function isAllowedHost(url) {
        const host = extractHost(url);
        if (!host) return false;
        if (SECURE_HOSTS.has(host)) {
            return true;
        }
        for (const allowedHost of SECURE_HOSTS) {
            if (host.endsWith(`.${allowedHost}`)) {
                return true;
            }
        }
        return false;
    }

    function buildMediaEmbed(anchorElement, mediaUrl, mediaType, buttonElement) {
        const el = document.createElement(mediaType === 'img' ? 'img' : 'video');
        el.src = mediaUrl;
        el.style.cssText = MEDIA_STYLES;
        if (mediaType === 'video') {
            el.controls = true;
            el.muted = true;
            el.autoplay = false;
        }
        el.addEventListener('error', function() {
            const errorImg = document.createElement('img');
            errorImg.src = chrome.runtime.getURL('images/eror.jpg'); 
            errorImg.style.cssText = MEDIA_STYLES;
            this.replaceWith(errorImg); 
        });

        if (buttonElement) {
            buttonElement.remove();
        }
        anchorElement.textContent = '';
        anchorElement.appendChild(el);
        anchorElement.style.removeProperty('display');
        anchorElement.setAttribute(PROCESSED_ATTR, 'true');
        anchorElement.removeAttribute(PROCESSED_CONTAINER_ATTR); 
    }
    
    function insertLoadButton(link, url, host, type) {
        const button = document.createElement('span');
        button.textContent = `[${host}] Неизвестен, нажмите чтобы загрузить ${type === 'img' ? 'изображение' : 'видео'}`;
        button.style.cssText = `
            display: inline-block; 
            padding: 4px 8px; 
            margin-top: 6px;
            cursor: pointer; 
            color: #fff;
            background-color: #00BA7C;
            border-radius: 4px;
            font-size: 1.0rem;
            max-width: 312px;
            word-break: break-word;
            text-decoration: none !important;
        `;
        link.insertAdjacentElement('afterend', button);
        link.setAttribute(PROCESSED_CONTAINER_ATTR, 'true');
        link.textContent = ''; 
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            buildMediaEmbed(link, url, type, button); 
        });
        link.style.display = 'none'; 
    }


    function processLinksInNode(node) {
        const links = node.nodeType === 1 && node.matches(CHAT_LINK_SELECTORS) 
            ? [node] 
            : node.querySelectorAll(CHAT_LINK_SELECTORS);
        links.forEach(link => {
            const url = link.href;
            if (!url || link.hasAttribute(PROCESSED_ATTR) || link.hasAttribute(PROCESSED_CONTAINER_ATTR)) return;
            const host = extractHost(url);
            if (!host) {
                link.setAttribute(PROCESSED_CONTAINER_ATTR, 'true'); 
                return;
            }
            let type = null;
            if (MEDIA_REGEX.IMG.test(url)) type = 'img';
            else if (MEDIA_REGEX.VID.test(url)) type = 'video';

            if (!type) {
                link.setAttribute(PROCESSED_CONTAINER_ATTR, 'true'); 
                return;
            }
            if (FORCE_EMBED_ALL || isAllowedHost(url)) {
                buildMediaEmbed(link, url, type, null); 
            } else {
                insertLoadButton(link, url, host, type);
            }
        });
    }

    function handleMutations(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        processLinksInNode(node);
                    }
                });
            }
        }
    }

    (function setupObserver() {
        const container = document.querySelector(CHAT_CONTAINER_SELECTOR);

        if (!container) {
            setTimeout(setupObserver, 1000); 
            return;
        }
        const observer = new MutationObserver(handleMutations);
        observer.observe(container, { childList: true, subtree: true });
        document.querySelectorAll(CHAT_LINK_SELECTORS)
            .forEach(link => processLinksInNode(link));
    })();
});