import { supabase, isConfigured } from './supabase-client.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));


function sanitizeStyle(element) {
  const raw = element.getAttribute('style') || '';
  if (!raw) return;
  const safe = [];
  for (const declaration of raw.split(';')) {
    const [nameRaw, ...valueParts] = declaration.split(':');
    if (!nameRaw || !valueParts.length) continue;
    const name = nameRaw.trim().toLowerCase();
    const value = valueParts.join(':').trim().toLowerCase();
    if (name === 'text-align' && /^(left|right|center|justify)$/.test(value)) safe.push(`text-align:${value}`);
    else if (name === 'margin-left') {
      const match = value.match(/^(-?\d+(?:\.\d+)?)(px|pt|em|rem)$/);
      if (match) {
        const n = Math.max(0, Math.min(Number(match[1]), 120));
        safe.push(`margin-left:${n}${match[2]}`);
      }
    } else if (name === 'font-weight' && /^(bold|[6-9]00)$/.test(value)) safe.push('font-weight:bold');
    else if (name === 'font-style' && value === 'italic') safe.push('font-style:italic');
    else if (name === 'text-decoration' && /underline/.test(value)) safe.push('text-decoration:underline');
  }
  if (safe.length) element.setAttribute('style', safe.join(';'));
  else element.removeAttribute('style');
}

function sanitizeArticleHtml(html) {
  const allowedTags = new Set(['P','H2','H3','H4','STRONG','B','EM','I','U','SPAN','UL','OL','LI','BLOCKQUOTE','A','BR','IMG','HR','CODE','PRE']);
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const elements = [...template.content.querySelectorAll('*')].reverse();
  for (const element of elements) {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    const allowedAttributes = element.tagName === 'A'
      ? new Set(['href','title','target','style'])
      : element.tagName === 'IMG'
        ? new Set(['src','alt','title','width','height','loading'])
        : new Set(['style']);
    for (const attribute of [...element.attributes]) {
      if (!allowedAttributes.has(attribute.name.toLowerCase())) element.removeAttribute(attribute.name);
    }
    sanitizeStyle(element);
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

const ui = {
  setup: $('setupWarning'), login: $('loginPanel'), admin: $('adminPanel'),
  loginForm: $('loginForm'), loginMsg: $('loginMsg'), logout: $('logoutBtn'),
  form: $('articleForm'), rows: $('articleRows'), formMsg: $('formMsg'),
  reset: $('resetBtn'), formTitle: $('formTitle'), id: $('articleId'),
  titleTr: $('titleTr'), titleEn: $('titleEn'), slug: $('slug'),
  category: $('category'), status: $('status'), summaryTr: $('summaryTr'),
  summaryEn: $('summaryEn'), contentHtml: $('contentHtml'),
  contentEnHtml: $('contentEnHtml'), contentEditorTr: $('contentEditorTr'), contentEditorEn: $('contentEditorEn'), coverFile: $('coverFile'), coverUrl: $('coverUrl')
};

let articles = [];
let currentUser = null;


function syncEditorToTextarea(editor, textarea) {
  if (!editor || !textarea) return;
  textarea.value = editor.innerHTML.trim();
}

function setEditorHtml(editor, textarea, html = '') {
  if (editor) editor.innerHTML = html || '';
  if (textarea) textarea.value = html || '';
}

function syncAllEditors() {
  syncEditorToTextarea(ui.contentEditorTr, ui.contentHtml);
  syncEditorToTextarea(ui.contentEditorEn, ui.contentEnHtml);
}

function insertSanitizedHtml(editor, html) {
  const safe = sanitizeArticleHtml(html);
  editor.focus();
  document.execCommand('insertHTML', false, safe);
}

function initialiseRichEditor(editor, textarea) {
  if (!editor || !textarea) return;
  editor.addEventListener('input', () => syncEditorToTextarea(editor, textarea));
  editor.addEventListener('paste', (event) => {
    const html = event.clipboardData?.getData('text/html');
    if (!html) return; // plain text paste can use browser default
    event.preventDefault();
    insertSanitizedHtml(editor, html);
    syncEditorToTextarea(editor, textarea);
  });
  const toolbar = document.querySelector(`[data-toolbar-for="${editor.id}"]`);
  toolbar?.addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) event.preventDefault(); // keep editor selection
  });
  toolbar?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-cmd]');
    if (!button) return;
    editor.focus();
    document.execCommand(button.dataset.cmd, false, null);
    syncEditorToTextarea(editor, textarea);
  });
  toolbar?.querySelector('select[data-cmd="formatBlock"]')?.addEventListener('change', (event) => {
    editor.focus();
    document.execCommand('formatBlock', false, event.target.value);
    syncEditorToTextarea(editor, textarea);
    event.target.value = 'p';
  });
}

initialiseRichEditor(ui.contentEditorTr, ui.contentHtml);
initialiseRichEditor(ui.contentEditorEn, ui.contentEnHtml);

function showMessage(element, text, isError = false) {
  if (!element) return;
  element.innerHTML = text
    ? `<div class="msg${isError ? ' error' : ''}">${escapeHtml(text)}</div>`
    : '';
}

function slugify(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function showLogin() {
  ui.login?.classList.remove('hidden');
  ui.admin?.classList.add('hidden');
  ui.logout?.classList.add('hidden');
}

function showAdmin() {
  ui.login?.classList.add('hidden');
  ui.admin?.classList.remove('hidden');
  ui.logout?.classList.remove('hidden');
}

async function verifyAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw new Error(`Admin kontrolü başarısız: ${error.message}`);
  if (data !== true) throw new Error('Bu hesap admin_users tablosunda yetkilendirilmemiş.');
}

async function refresh() {
  if (!isConfigured) {
    ui.setup?.classList.remove('hidden');
    ui.login?.classList.add('hidden');
    return;
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    showLogin();
    showMessage(ui.loginMsg, error.message, true);
    return;
  }

  currentUser = session?.user || null;
  if (!currentUser) {
    showLogin();
    return;
  }

  try {
    await verifyAdmin();
    showAdmin();
    await loadArticles();
  } catch (err) {
    await supabase.auth.signOut();
    showLogin();
    showMessage(ui.loginMsg, err.message, true);
  }
}

ui.loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(ui.loginMsg, 'Giriş yapılıyor…');

  const { error } = await supabase.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value
  });

  if (error) {
    showMessage(ui.loginMsg, `Giriş başarısız: ${error.message}`, true);
    return;
  }

  showMessage(ui.loginMsg, '');
  await refresh();
});

ui.logout?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  resetForm();
  showLogin();
});

ui.titleTr?.addEventListener('input', () => {
  if (!ui.id.value && !ui.slug.dataset.manual) ui.slug.value = slugify(ui.titleTr.value);
});
ui.slug?.addEventListener('input', () => { ui.slug.dataset.manual = '1'; });
ui.reset?.addEventListener('click', resetForm);

function resetForm() {
  ui.form?.reset();
  ui.id.value = '';
  ui.coverUrl.value = '';
  setEditorHtml(ui.contentEditorTr, ui.contentHtml, '');
  setEditorHtml(ui.contentEditorEn, ui.contentEnHtml, '');
  delete ui.slug.dataset.manual;
  ui.formTitle.textContent = 'Yeni Makale';
  showMessage(ui.formMsg, '');
}

async function uploadCover(file) {
  if (!file) return ui.coverUrl.value || null;
  if (file.size > 5 * 1024 * 1024) throw new Error('Görsel 5 MB’tan büyük olamaz.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Yalnızca JPEG, PNG veya WebP görsel yüklenebilir.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('article-images').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw new Error(`Görsel yüklenemedi: ${error.message}`);

  return supabase.storage.from('article-images').getPublicUrl(path).data.publicUrl;
}


function storagePathFromPublicUrl(url) {
  if (!url) return null;
  try {
    const marker = '/storage/v1/object/public/article-images/';
    const parsed = new URL(url);
    const index = parsed.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(parsed.pathname.slice(index + marker.length)) : null;
  } catch { return null; }
}

async function removeCoverByUrl(url) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from('article-images').remove([path]);
  if (error) console.warn('Eski görsel silinemedi:', error.message);
}

ui.form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = ui.form.querySelector('button:not([type="button"])');
  if (submitButton) submitButton.disabled = true;
  showMessage(ui.formMsg, 'Kaydediliyor…');

  try {
    await verifyAdmin();

    syncAllEditors();
    const status = ui.status.value;
    const slug = slugify(ui.slug.value || ui.titleTr.value);
    if (!slug) throw new Error('Makale bağlantısı (slug) oluşturulamadı.');

    const sanitizedTr = sanitizeArticleHtml(ui.contentHtml.value);
    if (!sanitizedTr) throw new Error('Makale içeriği boş veya izin verilmeyen HTML öğelerinden oluşuyor.');

    const existingArticle = ui.id.value ? articles.find((item) => item.id === ui.id.value) : null;
    const oldCoverUrl = existingArticle?.cover_image_url || null;
    const newCoverFile = ui.coverFile.files[0];

    const payload = {
      title_tr: ui.titleTr.value.trim(),
      title_en: ui.titleEn?.value.trim() || null,
      slug,
      category: ui.category.value.trim() || null,
      status,
      summary_tr: ui.summaryTr.value.trim(),
      summary_en: ui.summaryEn?.value.trim() || null,
      content_html: sanitizedTr,
      content_en_html: ui.contentEnHtml?.value.trim() ? sanitizeArticleHtml(ui.contentEnHtml.value) : null,
      cover_image_url: await uploadCover(newCoverFile),
      author_id: currentUser.id
    };

    let result;
    if (ui.id.value) {
      result = await supabase.from('articles')
        .update(payload)
        .eq('id', ui.id.value)
        .select('*')
        .single();
    } else {
      result = await supabase.from('articles')
        .insert([payload])
        .select('*')
        .single();
    }

    if (result.error) throw new Error(result.error.message);
    if (newCoverFile && oldCoverUrl && oldCoverUrl !== result.data.cover_image_url) await removeCoverByUrl(oldCoverUrl);

    resetForm();
    await loadArticles();
    showMessage(ui.formMsg, `Makale başarıyla ${status === 'published' ? 'yayımlandı' : 'taslak olarak kaydedildi'}.`);
    alert(`Makale başarıyla ${status === 'published' ? 'yayımlandı' : 'kaydedildi'}.`);
  } catch (err) {
    console.error(err);
    showMessage(ui.formMsg, `Kayıt başarısız: ${err.message}`, true);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

async function loadArticles() {
  ui.rows.innerHTML = '<p class="hint">Yükleniyor…</p>';
  const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false });

  if (error) {
    ui.rows.innerHTML = `<div class="msg error">${escapeHtml(error.message)}</div>`;
    return;
  }

  articles = data || [];
  ui.rows.innerHTML = articles.length
    ? articles.map((article) => `
      <div class="row">
        <div><strong>${escapeHtml(article.title_tr)}</strong><div class="hint">/${escapeHtml(article.slug)}</div></div>
        <div>${article.status === 'published' ? 'Yayında' : 'Taslak'}</div>
        <div class="row-actions">
          <button class="btn" data-edit="${article.id}" type="button">Düzenle</button>
          <button class="btn danger" data-delete="${article.id}" type="button">Sil</button>
        </div>
      </div>`).join('')
    : '<p class="hint">Henüz makale yok.</p>';
}

ui.rows?.addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const article = articles.find((item) => item.id === editId);
    if (!article) return;
    ui.id.value = article.id;
    ui.titleTr.value = article.title_tr || '';
    if (ui.titleEn) ui.titleEn.value = article.title_en || '';
    ui.slug.value = article.slug || '';
    ui.slug.dataset.manual = '1';
    ui.category.value = article.category || '';
    ui.status.value = article.status || 'draft';
    ui.summaryTr.value = article.summary_tr || '';
    if (ui.summaryEn) ui.summaryEn.value = article.summary_en || '';
    setEditorHtml(ui.contentEditorTr, ui.contentHtml, article.content_html || '');
    setEditorHtml(ui.contentEditorEn, ui.contentEnHtml, article.content_en_html || '');
    ui.coverUrl.value = article.cover_image_url || '';
    ui.formTitle.textContent = 'Makaleyi Düzenle';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (deleteId) {
    const article = articles.find((item) => item.id === deleteId);
    if (!article || !confirm(`“${article.title_tr}” silinsin mi?`)) return;
    const { error } = await supabase.from('articles').delete().eq('id', deleteId);
    if (error) {
      alert(`Makale silinemedi: ${error.message}`);
      return;
    }
    await removeCoverByUrl(article.cover_image_url);
    if (ui.id.value === deleteId) resetForm();
    await loadArticles();
  }
});

supabase?.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
