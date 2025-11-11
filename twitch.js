chrome.storage.local.get(['secureHostsList', 'forceEmbedAll'], (data) => {
    const SECURE_HOSTS = new Set(data.secureHostsList || []);
    const FORCE_EMBED_ALL = data.forceEmbedAll || false; 
    const MEDIA_REGEX = {
        IMG: /https?:\/\/[^\s]+?\.(jpe?g|png|gif|webp)(\?.*)?$/i,
        VID: /https?:\/\/\S+?\.(mp4|webm)(\?.*)?$/i,
    };
    const CHAT_LINK_SELECTORS = [
        'span[data-a-target="chat-line-message-body"] a[href]',
        'span.seventv-chat-message-body a[href]',
        'div.chat-line__message a[href]'
    ].join(', ');
    const MEDIA_STYLES = "max-width: 312px; max-height: 312px; margin-top: 6px; border-radius: 6px;";
    const PROCESSED_ATTR = 'data-media-embedded';
    const PROCESSED_CONTAINER_ATTR = 'data-media-processed'; 

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
            el.style.display = 'block'; 
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
            background-color: #9146FF;
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

    function processLink(link) {
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
    }

    const chatContainer = document.querySelector('div.chat-list__list-container') 
        ?? document.querySelector('main.seventv-chat-list') 
        ?? document.querySelector('div[data-test-selector="chat-scrollable-area__message-container"]');
    if (chatContainer) {
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        if (node.matches?.(CHAT_LINK_SELECTORS)) {
                            processLink(node);
                        }

                        const links = node.querySelectorAll?.(CHAT_LINK_SELECTORS);
                        links && links.forEach(processLink);
                    });
                }
            }
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
        document.querySelectorAll(`${CHAT_LINK_SELECTORS}`)
            .forEach(processLink);

    } else {
        (function scanFallback() {
            document.querySelectorAll(`${CHAT_LINK_SELECTORS}:not([${PROCESSED_ATTR}]):not([${PROCESSED_CONTAINER_ATTR}])`)
                .forEach(processLink);
            setTimeout(scanFallback, 1000);
        })();
    }
});