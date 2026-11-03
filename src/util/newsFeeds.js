/*
    Copyright (C) 2026 Pratinav Verma
    SPDX-License-Identifier: GPL-3.0-or-later
*/

/*
    Posts new articles from RSS feeds into news channels, found by name in each Discord server.
    Only the title, a short snippet and a link are posted.
*/

const Axios = require('axios');
const Fs = require('fs');
const RssParser = require('rss-parser');

const dataPath = require('./dataPaths');

const NEWS_CHANNELS = [
    {
        channel: '🌐・ai-news',
        color: '#8e44ad',
        feeds: [
            { name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
            { name: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
            { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' }
        ]
    },
    {
        channel: '🟠・anthropic',
        color: '#d97757',
        feeds: [
            {
                name: 'Anthropic',
                sitemap: 'https://www.anthropic.com/sitemap.xml',
                prefix: 'https://www.anthropic.com/news/',
                genericSummary: 'Anthropic is an AI safety and research company'
            }
        ]
    },
    {
        channel: '🟢・openai',
        color: '#10a37f',
        feeds: [
            { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' }
        ]
    },
    {
        channel: '🔵・google',
        color: '#4285f4',
        feeds: [
            { name: 'Google', url: 'https://blog.google/technology/ai/rss/' }
        ]
    }
];

const POLL_INTERVAL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20 * 1000;
const MAX_FEED_BYTES = 10 * 1024 * 1024;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const FIRST_RUN_POSTS = 3;
const MAX_POSTS_PER_POLL = 5;
const MAX_REMEMBERED = 5000;
const MAX_PAGES_PER_POLL = 5;
const SNIPPET_LENGTH = 280;

const parser = new RssParser();
let polling = false;

function statePath() {
    return dataPath('news.json');
}

function readState() {
    return Fs.existsSync(statePath()) ? JSON.parse(Fs.readFileSync(statePath(), 'utf8')) : {};
}

function writeState(state) {
    Fs.writeFileSync(statePath(), JSON.stringify(state, null, 2));
}

function shorten(text, length) {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    return clean.length > length ? `${clean.slice(0, length - 1).trimEnd()}…` : clean;
}

function isWebLink(url) {
    try {
        return ['https:', 'http:'].includes(new URL(url).protocol);
    }
    catch (e) {
        return false;
    }
}

/* The same story can appear in several feeds, so articles are also remembered by title. */
function titleKey(title) {
    return `title:${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}`;
}

function linkKey(link) {
    return `link:${link}`;
}

function articleKeys(article) {
    return [linkKey(article.link), titleKey(article.title)];
}

function toArticle(item, source) {
    const date = new Date(item.isoDate || item.pubDate);
    if (!item.title || !isWebLink(item.link) || Number.isNaN(date.getTime())) return null;

    return {
        title: shorten(item.title, 256),
        link: item.link,
        snippet: shorten(item.contentSnippet || item.summary, SNIPPET_LENGTH),
        image: isWebLink(item.enclosure?.url) && /^image\//.test(item.enclosure.type || '') ? item.enclosure.url : null,
        date: date,
        source: source
    };
}

async function download(url) {
    const response = await Axios.get(url, {
        timeout: FETCH_TIMEOUT_MS,
        maxContentLength: MAX_FEED_BYTES,
        responseType: 'text',
        headers: { 'User-Agent': 'pratinavv-news/1.0 (+https://github.com/pratinavv/rust_bot)' }
    });
    return response.data;
}

function decodeHtml(text) {
    return text.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function pageMeta(html, property) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
        if (new RegExp(`(?:property|name)=["']${property}["']`, 'i').test(tag)) {
            const content = /content=["']([^"']*)["']/i.exec(tag);
            if (content) return decodeHtml(content[1]);
        }
    }
    return null;
}

/* For a site with no RSS feed: a new page in its sitemap is a new article. */
async function fetchSitemapFeed(feed, seen, seeded) {
    const xml = await download(feed.sitemap);
    const pages = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)]
        .map(match => ({ link: match[1], lastmod: match[2] }))
        .filter(page => page.link.startsWith(feed.prefix));
    const known = pages.map(page => linkKey(page.link));
    if (!seeded) return { articles: [], known: known };

    /* Undated pages are section indexes such as /news/features, not articles. */
    const fresh = pages.filter(page => page.lastmod && !seen.has(linkKey(page.link)))
        .sort((a, b) => String(b.lastmod).localeCompare(String(a.lastmod)))
        .slice(0, MAX_PAGES_PER_POLL);

    const articles = [];
    for (const page of fresh) {
        const html = await download(page.link);
        const summary = pageMeta(html, 'og:description') ?? pageMeta(html, 'description');
        const article = toArticle({
            title: pageMeta(html, 'og:title'),
            link: page.link,
            summary: summary?.startsWith(feed.genericSummary) ? null : summary,
            isoDate: pageMeta(html, 'article:published_time') ?? page.lastmod ?? new Date().toISOString()
        }, feed.name);
        if (article) articles.push(article);
    }
    return { articles: articles, known: [...known, ...articles.flatMap(articleKeys)] };
}

async function fetchFeed(feed, seen, seeded) {
    if (feed.sitemap) return fetchSitemapFeed(feed, seen, seeded);

    const parsed = await parser.parseString(await download(feed.url));
    const articles = parsed.items.map(item => toArticle(item, feed.name)).filter(article => article !== null);
    return { articles: articles, known: articles.flatMap(articleKeys) };
}

async function fetchArticles(client, feeds, seen, seededFeeds) {
    const results = await Promise.allSettled(
        feeds.map(feed => fetchFeed(feed, seen, seededFeeds.includes(feed.name))));
    const fetched = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            fetched.push({ feed: feeds[index], ...result.value });
        }
        else {
            client.log(client.intlGet(null, 'warningCap'),
                `News feed ${feeds[index].name} failed: ${result.reason?.message ?? result.reason}`);
        }
    });

    return fetched;
}

/* Which articles to post now, newest first in the list and oldest first in the channel. */
function pickArticles(articles, seen, firstRun, now = Date.now()) {
    const picked = [];
    const titles = new Set();

    for (const article of articles) {
        const title = titleKey(article.title);
        if (seen.has(linkKey(article.link)) || seen.has(title) || titles.has(title)) continue;
        if (now - article.date.getTime() > MAX_AGE_MS && !firstRun) continue;

        titles.add(title);
        picked.push(article);
    }

    return picked.slice(0, firstRun ? FIRST_RUN_POSTS : MAX_POSTS_PER_POLL).reverse();
}

function toMessage(article, color) {
    const embed = {
        title: article.title,
        url: article.link,
        color: parseInt(color.slice(1), 16),
        footer: { text: article.source },
        timestamp: article.date.toISOString()
    };
    if (article.snippet) embed.description = article.snippet;
    if (article.image) embed.image = { url: article.image };

    return { embeds: [embed], allowedMentions: { parse: [] } };
}

function remember(entry, keys) {
    entry.seen.push(...keys);
    entry.seen = entry.seen.slice(-MAX_REMEMBERED);
}

async function pollChannel(client, state, guild, config) {
    const channel = guild.channels.cache.find(c => c.name === config.channel && c.isTextBased());
    if (!channel) return;

    const key = `${guild.id}:${config.channel}`;
    const firstRun = !state[key];
    const entry = state[key] ?? { seen: [], feeds: [] };
    if (!entry.feeds) entry.feeds = [];

    const seededFeeds = firstRun ? config.feeds.map(feed => feed.name) : entry.feeds;
    const fetched = await fetchArticles(client, config.feeds, new Set(entry.seen), seededFeeds);
    if (fetched.length === 0) return;
    state[key] = entry;

    /* A source added later starts quietly, so everything it has ever published is not posted at once. */
    const newFeeds = fetched.filter(({ feed }) => !entry.feeds.includes(feed.name));
    const quiet = firstRun ? [] : newFeeds;
    remember(entry, quiet.flatMap(({ known }) => known));

    const articles = fetched.filter(result => !quiet.includes(result)).flatMap(result => result.articles)
        .sort((a, b) => b.date - a.date);

    for (const article of pickArticles(articles, new Set(entry.seen), firstRun)) {
        await channel.send(toMessage(article, config.color));
        remember(entry, articleKeys(article));
        writeState(state);
    }

    /* The first run only shows a few, the rest of what is already out there should never be posted. */
    if (firstRun) {
        const known = new Set(entry.seen);
        remember(entry, [...new Set(fetched.flatMap(result => result.known))].filter(item => !known.has(item)));
    }

    entry.feeds.push(...newFeeds.map(({ feed }) => feed.name));
    writeState(state);
}

async function poll(client) {
    if (polling) return;
    polling = true;

    try {
        const state = readState();
        for (const guild of client.guilds.cache.values()) {
            for (const config of NEWS_CHANNELS) {
                try {
                    await pollChannel(client, state, guild, config);
                }
                catch (e) {
                    client.log(client.intlGet(null, 'warningCap'), `News for ${config.channel} failed: ${e.message}`);
                }
            }
        }
    }
    finally {
        polling = false;
    }
}

module.exports = {
    NEWS_CHANNELS,
    FIRST_RUN_POSTS,
    MAX_POSTS_PER_POLL,
    pageMeta,
    poll,

    start: function (client) {
        poll(client);
        setInterval(poll, POLL_INTERVAL_MS, client);
    },
};
