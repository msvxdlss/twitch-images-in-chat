chrome.storage.local.get('secureHostsList', (data) => {
    const SECURE_HOSTS = new Set(data.secureHostsList || []);
    const MEDIA_REGEX = {
        IMG: /https?:\/\/[^\s]+?\.(jpe?g|png|gif|webp)(\?.*)?$/i,
        VID: /https?:\/\/\S+?\.(mp4|webm)(\?.*)?$/i,
    };
    const MEDIA_STYLES = "max-width: 312px; max-height: 312px; margin-top: 6px; border-radius: 6px;";
    const CHAT_CONTAINER_SELECTOR = '.ChatBoxBase_root_k1P9S';
    const CHAT_LINK_SELECTORS = '[data-role="messageMainContent"] .BlockRenderer_markup_Wtipg a[href]';
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
    
    function scrollToBottom(behavior = 'smooth', delay = 0) {
        setTimeout(() => {
            let finalContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
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
        anchorElement.replaceChildren(el); 
        anchorElement.style.removeProperty('display'); 
        anchorElement.style.removeProperty('text-decoration'); 
        anchorElement.style.removeProperty('color');
        anchorElement.setAttribute(PROCESSED_ATTR, 'true');
        anchorElement.removeAttribute(PROCESSED_CONTAINER_ATTR); 
        el.onload = () => scrollToBottom('smooth', 50); 
    }
    
    function insertLoadButton(link, url, host, type) {
        const button = document.createElement('span');
        button.textContent = `[${host}] неизвестен, нажмите чтобы загрузить ${type === 'img' ? 'img' : 'vid'}`;
        button.style.cssText = `
            display: inline-block; 
            padding: 4px 8px; 
            margin-top: 6px;
            cursor: pointer; 
            color: #fff;
            background-color: #0077FF;
            border-radius: 4px;
            font-size: 1.0rem;
            max-width: 312px;
            word-break: break-word;
            text-decoration: none !important;
        `;
        
        link.parentNode.insertBefore(button, link.nextSibling);
        link.setAttribute(PROCESSED_CONTAINER_ATTR, 'true');
        link.textContent = ''; 
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            buildMediaEmbed(link, url, type, button); 
        });
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
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

            if (isAllowedHost(url)) {
                buildMediaEmbed(link, url, type, null); 
            } else {
                insertLoadButton(link, url, host, type);
            }
        });
    }

    function handleMutations(mutations) {
        let newMessage = false;

        for (const m of mutations) {
            if (m.type === 'childList') {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        processLinksInNode(node);
                        if (node.matches?.('.vk-live-chat-message') || node.matches?.('.BlockRenderer_root_m6N2i')) {
                            newMessage = true;
                        }
                    }
                });
            }
        }

        if (newMessage) scrollToBottom('auto', 200);
    }

    (function setupObserver() {
        const container = document.querySelector(CHAT_CONTAINER_SELECTOR); 
        if (!container) return setTimeout(setupObserver, 1000);
        const observer = new MutationObserver(handleMutations);
        observer.observe(container, { childList: true, subtree: true });
        processLinksInNode(document);
        scrollToBottom('auto', 1000);
    })();
});