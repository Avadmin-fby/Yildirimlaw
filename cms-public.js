import { supabase, isConfigured } from './supabase-client.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const grid = document.getElementById('dynamicArticlesGrid');
const statusElement = document.getElementById('articlesCmsStatus');
const detail = document.getElementById('articleDetailPage');
let articles = [];
const currentLang = () => document.documentElement.lang === 'en' ? 'en' : 'tr';
const field = (article, trKey, enKey) => currentLang() === 'en' && article[enKey] ? article[enKey] : article[trKey];

function safeHtml(html) {
  const allowedTags = new Set(['P','H2','H3','H4','STRONG','B','EM','I','UL','OL','LI','BLOCKQUOTE','A','BR','IMG','HR','CODE','PRE']);
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const elements = [...template.content.querySelectorAll('*')].reverse();
  for (const element of elements) {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    const allowedAttributes = element.tagName === 'A'
      ? new Set(['href','title','target'])
      : element.tagName === 'IMG'
        ? new Set(['src','alt','title','width','height','loading'])
        : new Set([]);
    for (const attribute of [...element.attributes]) {
      if (!allowedAttributes.has(attribute.name.toLowerCase())) element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'A') {
      const href = (element.getAttribute('href') || '').trim();
      if (!/^(https?:|mailto:|tel:|#)/i.test(href)) element.removeAttribute('href');
      if (element.getAttribute('target') === '_blank') element.setAttribute('rel','noopener noreferrer nofollow');
      else element.removeAttribute('target');
    }
    if (element.tagName === 'IMG') {
      const src = (element.getAttribute('src') || '').trim();
      if (!/^https:\/\//i.test(src)) element.remove();
      else {
        element.setAttribute('loading','lazy');
        element.removeAttribute('width');
        element.removeAttribute('height');
      }
    }
  }
  return template.innerHTML.trim();
}

const categoryTranslations = {
  'Aile Hukuku':'Family Law',
  'İş Hukuku':'Employment Law',
  'Ticaret Hukuku':'Commercial Law',
  'Şirketler Hukuku':'Corporate Law',
  'Sözleşmeler Hukuku':'Contract Law',
  'Birleşme ve Devralmalar':'Mergers & Acquisitions',
  'Fikri Mülkiyet Hukuku':'Intellectual Property Law',
  'Yabancılar ve Vatandaşlık Hukuku':'Immigration & Citizenship Law',
  'Yabancılar Hukuku':'Immigration Law',
  'İdare Hukuku':'Administrative Law',
  'İcra ve İflas Hukuku':'Enforcement & Bankruptcy Law',
  'Gayrimenkul Hukuku':'Real Estate Law',
  'Kira Hukuku':'Lease Law',
  'Ceza Hukuku':'Criminal Law'
};

const categoryLabel = (article) => {
  const value = article.category || (currentLang()==='en' ? 'Article' : 'Makale');
  return currentLang()==='en' ? (categoryTranslations[value] || value) : value;
};

function renderLoadedArticles() {
  if (!grid) return;
  grid.dataset.cmsLoaded = articles.length ? 'true' : 'false';
  grid.innerHTML = articles.length
    ? articles.map((article, index) => `
      <article class="article-page-card" data-article-id="${escapeHtml(article.id)}" data-slug="${escapeHtml(article.slug)}">
        <div class="article-page-image"${article.cover_image_url ? ` style="background-image:url('${escapeHtml(article.cover_image_url)}')"` : ''}></div>
        <div class="article-page-body">
          <small>${escapeHtml(categoryLabel(article))}</small>
          <h2>${escapeHtml(field(article,'title_tr','title_en'))}</h2>
          <p>${escapeHtml(field(article,'summary_tr','summary_en'))}</p>
          <a href="#article-${escapeHtml(article.slug)}" class="article-page-link" data-article="${index}">${currentLang()==='en'?'Read More →':'Devamını Oku →'}</a>
        </div>
      </article>`).join('')
    : `<p class="articles-empty">${currentLang()==='en'?'No articles have been published yet.':'Henüz yayımlanmış makale bulunmuyor.'}</p>`;

  const activeIndex = Number(detail?.dataset.cmsArticleIndex);
  if (detail?.classList.contains('active') && Number.isInteger(activeIndex) && articles[activeIndex]) {
    openArticle(activeIndex, false);
  }
}

async function loadArticles() {
  if (!grid) return;
  if (!isConfigured) {
    statusElement.textContent = 'Makale sistemi yapılandırılmadı.';
    return;
  }

  statusElement.textContent = 'Makaleler yükleniyor…';
  const { data, error } = await supabase.from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    statusElement.textContent = `Makaleler yüklenemedi: ${error.message}`;
    return;
  }

  articles = data || [];
  statusElement.textContent = '';
  renderLoadedArticles();

  const hash = location.hash || '';
  if (hash.startsWith('#article-')) {
    const slug = decodeURIComponent(hash.slice('#article-'.length));
    const index = articles.findIndex((article) => article.slug === slug);
    if (index >= 0) openArticle(index, false);
  }

}

function openArticle(index, push = true) {
  const article = articles[index];
  if (!article || !detail) return;

  document.getElementById('home').style.display = 'none';
  document.getElementById('detail').classList.remove('active');
  document.querySelectorAll('.site-page').forEach((page) => page.classList.remove('active'));
  detail.classList.add('active');
  detail.dataset.cmsArticleIndex = String(index);
  detail.innerHTML = `
    <section class="article-detail-hero">
      <small>${escapeHtml(categoryLabel(article))}</small>
      <h1>${escapeHtml(field(article,'title_tr','title_en'))}</h1>
      <p>${escapeHtml(field(article,'summary_tr','summary_en'))}</p>
    </section>
    <section class="article-detail-content">
      <a class="back-link" href="#articles-page">${currentLang()==='en'?'← Back to Articles':'← Makalelere Dön'}</a>
      ${article.cover_image_url ? `<img src="${escapeHtml(article.cover_image_url)}" alt="${escapeHtml(field(article,'title_tr','title_en'))}">` : ''}
      <div class="article-body">${safeHtml(field(article,'content_html','content_en_html'))}</div>
    </section>`;

  document.title = `${field(article,'title_tr','title_en')} | Yıldırım Law & Consultancy`;
  if (push) history.pushState({ page: 'cms-article', index }, '', `#article-${article.slug}`);
  window.scrollTo(0, 0);
}

grid?.addEventListener('click', (event) => {
  const link = event.target.closest('[data-article]');
  if (!link) return;
  event.preventDefault();
  openArticle(Number(link.dataset.article));
});

detail?.addEventListener('click', (event) => {
  const back = event.target.closest('.back-link');
  if (!back) return;
  event.preventDefault();
  window.showSitePage ? window.showSitePage(null, 'articles') : (location.hash = '#articles-page');
});

window.refreshCmsLanguage = renderLoadedArticles;
window.openCmsArticleByIndex = (index, push = true) => openArticle(Number(index), push);
window.openCmsArticleBySlug = (slug, push = true) => {
  const index = articles.findIndex((article) => article.slug === slug);
  if (index >= 0) openArticle(index, push);
};

await loadArticles();
