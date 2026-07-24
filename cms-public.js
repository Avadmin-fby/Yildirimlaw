import { supabase, isConfigured } from './supabase-client.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const grid = document.getElementById('dynamicArticlesGrid');
const statusElement = document.getElementById('articlesCmsStatus');
const detail = document.getElementById('articleDetailPage');
let articles = [];

function safeHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  template.content.querySelectorAll('script,iframe,object,embed,link,meta,style').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (/^on/i.test(attribute.name) || (/^(href|src)$/i.test(attribute.name) && /^javascript:/i.test(attribute.value))) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
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
  grid.innerHTML = articles.length
    ? articles.map((article, index) => `
      <article class="article-page-card">
        <div class="article-page-image" style="background-image:url('${escapeHtml(article.cover_image_url || '')}')"></div>
        <div class="article-page-body">
          <small>${escapeHtml(article.category || 'Makale')}</small>
          <h2>${escapeHtml(article.title_tr)}</h2>
          <p>${escapeHtml(article.summary_tr)}</p>
          <a href="#article-${escapeHtml(article.slug)}" class="article-page-link" data-article="${index}">Devamını Oku →</a>
        </div>
      </article>`).join('')
    : '<p>Henüz yayımlanmış makale bulunmuyor.</p>';
}

function openArticle(index) {
  const article = articles[index];
  if (!article || !detail) return;

  document.getElementById('home').style.display = 'none';
  document.getElementById('detail').classList.remove('active');
  document.querySelectorAll('.site-page').forEach((page) => page.classList.remove('active'));
  detail.classList.add('active');
  detail.innerHTML = `
    <section class="article-detail-hero">
      <small>${escapeHtml(article.category || 'Makale')}</small>
      <h1>${escapeHtml(article.title_tr)}</h1>
      <p>${escapeHtml(article.summary_tr)}</p>
    </section>
    <section class="article-detail-content">
      <a class="back-link" href="#articles-page">← Makalelere Dön</a>
      ${article.cover_image_url ? `<img src="${escapeHtml(article.cover_image_url)}" alt="${escapeHtml(article.title_tr)}">` : ''}
      <div class="article-body">${safeHtml(article.content_html)}</div>
    </section>`;

  document.title = `${article.title_tr} | Yıldırım Law & Consultancy`;
  history.pushState({ page: 'cms-article', index }, '', `#article-${article.slug}`);
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

await loadArticles();
