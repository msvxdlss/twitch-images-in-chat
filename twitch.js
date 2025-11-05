const SECURE_HOSTS = [
    'imgur.com',               // Крупный и один из самых популярных хостингов изображений
    'i.imgur.com',             // CDN для прямых ссылок Imgur (часто используется вместо imgur.com)
    'giphy.com',               // Основной домен для GIF-анимаций (может перенаправлять)
    'media.giphy.com',         // CDN для прямых ссылок Giphy
    'tenor.com',               // Популярный сервис для GIF-анимаций
    'media.tenor.com',         // CDN для прямых ссылок Tenor
    'gfycat.com',              // Сервис для высококачественных GIF/видео
    'ibb.co',                  // Сокращенный домен для ImgBB
    'i.ibb.co',                // Прямой CDN для ImgBB
    'imgbb.com',               // Основной домен ImgBB
    'postimg.cc',              // Популярный хостинг изображений
    'iimg.su',                 // Хостинг изображений (часто используется в Рунете)
    'imgbox.com',              // Хостинг изображений
    'catbox.moe',              // Хостинг файлов, часто используется для гифок и картинок
    'flickr.com',              // Крупный фотохостинг
    'prnt.sc',                 // Lightshot (сервис для скриншотов)
    'paste.pics',              // Сервис для размещения картинок/скриншотов
    'i.pinimg.com',            // CDN Pinterest (для изображений)
    'i.redd.it',               // CDN Reddit (для изображений)
    'discordapp.com',          // Основной домен Discord
    'cdn.discordapp.com',      // CDN Discord (для вложений, аватаров и медиа)
    'userapi.com',             // CDN ВКонтакте (для медиа и аватаров)
    'vk.com',               // Основной домен VK.com (уже покрыт userapi.com для медиа, но может быть добавлен для ссылок)
    'clips.twitchcdn.net',     // CDN для клипов Twitch
    'cdn.betterttv.net',       // CDN для эмоций BetterTTV (расширение Twitch)
    'cdn.frankerfacez.com',    // CDN для эмоций FrankerFaceZ (расширение Twitch)
    'cdn.7tv.app',             // CDN для эмоций 7TV (расширение Twitch)
    'i.ytimg.com',             // CDN YouTube (для превью и изображений)
    'yt3.ggph.com',            // CDN Google/YouTube (для аватаров пользователей)
    'scontent.cdninstagram.com', // CDN Instagram (для контента)
    'photos.google.com',       // Google Photos/пользовательский контент
    'drive.google.com',        // Google Drive (для расшаренных файлов)
    'i.stack.imgur.com',       // CDN Imgur, используемый Stack Exchange/Stack Overflow
    'pic.re',                  // Хостинг изображений
    '2ch.org',                 // Имиджборд (традиционно используется как источник контента)
    '2ch.su',                  // Имиджборд (традиционно используется как источник контента)
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
