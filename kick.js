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

// Используем Set для быстрого поиска
const SECURE_HOSTS_SET = new Set(SECURE_HOSTS); 

// Кеш для URL, которые не прошли проверку (не являются медиа или не разрешены).
const INVALID_URLS = new Set(); 

const MEDIA_REGEX = {
    IMG: /https?:\/\/.+?\.(?:jpe?g|png|gif|webp)/i,
    VID: /https?:\/\/.+?\.(?:mp4|webm)/i,
};

const MEDIA_STYLES = "max-width: 312px; max-height: 312px; margin-top: 6px; border-radius: 6px;";
const CHAT_CONTAINER_SELECTOR = '.relative.h-full.w-full.overflow-y-auto'; 
const CHAT_LINK_SELECTORS = '.w-full.min-w-0 a[href]'; 
const PROCESSED_ATTR = 'data-media-embedded'; // Определяем константу для удобства

const isAllowedHost = (url) => {
    try {
        const host = new URL(url).hostname;
        const rootHost = host.substring(host.indexOf('.') + 1); // Для субдоменов
        return SECURE_HOSTS_SET.has(host) || SECURE_HOSTS_SET.has(rootHost);
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
    // Используем [${PROCESSED_ATTR}] для корректной выборки
    node.querySelectorAll(CHAT_LINK_SELECTORS + `:not([${PROCESSED_ATTR}])`).forEach(link => {
        const url = link.href;
        
        // 1. Проверка кеша "плохих" ссылок
        if (INVALID_URLS.has(url)) {
            // Помечаем DOM-элемент, чтобы его больше не выбирать
            link.dataset.mediaEmbedded = 'true'; 
            return;
        }

        // 2. Проверка хоста
        if (!isAllowedHost(url)) {
            INVALID_URLS.add(url);
            link.dataset.mediaEmbedded = 'true';
            return;
        }

        // 3. Анализ медиатипа
        let type = null;
        if (MEDIA_REGEX.IMG.test(url)) {
            type = 'img';
        } else if (MEDIA_REGEX.VID.test(url)) {
            type = 'video';
        }
        
        if (type) {
            // Если медиафайл найден, встраиваем его.
            // НЕ добавляем в INVALID_URLS, чтобы разрешить повторное встраивание
            buildMediaEmbed(link, url, type);
        } else {
            // Ссылка разрешена, но не является медиа (например, домен): кешируем
            INVALID_URLS.add(url);
            link.dataset.mediaEmbedded = 'true';
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
