(() => {
  const cfg = window.JBM_SUPABASE || {};
  const configured = cfg.url && !cfg.url.includes('YOUR_PROJECT') && cfg.publishableKey && !cfg.publishableKey.includes('REPLACE_ME');
  const listRoot = document.querySelector('[data-news-list]');
  const previewRoot = document.querySelector('[data-news-preview]');
  const articleRoot = document.querySelector('[data-news-article]');
  const lang = () => localStorage.getItem('jbm-lang') || 'ky';
  const pick = (row, field) => row[`${field}_${lang()}`] || row[`${field}_ru`] || row[`${field}_ky`] || '';

  function message(root, text, kind = '') {
    if (!root) return;
    root.innerHTML = '';
    const box = document.createElement('div');
    box.className = `news-state ${kind}`.trim();
    box.textContent = text;
    root.appendChild(box);
  }

  function formatDate(value) {
    const locale = lang() === 'ky' ? 'ky-KG' : 'ru-RU';
    try { return new Intl.DateTimeFormat(locale, { day:'2-digit', month:'long', year:'numeric' }).format(new Date(value)); }
    catch { return value || ''; }
  }

  function card(row, isPreview = false) {
    const article = document.createElement('article');
    article.className = 'news-card reveal visible';

    const link = document.createElement('a');
    const base = document.body.dataset.page === 'home' ? 'news/article/index.html' : 'article/index.html';
    link.href = `${base}?id=${encodeURIComponent(row.id)}`;
    link.className = 'news-card-link';

    const media = document.createElement('div');
    media.className = 'news-card-media';
    if (row.image_url) {
      const img = document.createElement('img');
      img.src = row.image_url;
      img.alt = pick(row, 'title');
      img.loading = 'lazy';
      img.width = 1200;
      img.height = 760;
      media.appendChild(img);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'news-card-fallback';
      fallback.textContent = 'М';
      media.appendChild(fallback);
    }

    const body = document.createElement('div');
    body.className = 'news-card-body';

    const meta = document.createElement('div');
    meta.className = 'news-card-meta';
    const category = document.createElement('span');
    category.textContent = pick(row, 'category') || (lang() === 'ky' ? 'Жаңылык' : 'Новость');
    const date = document.createElement('time');
    date.dateTime = row.published_at;
    date.textContent = formatDate(row.published_at);
    meta.append(category, date);

    const title = document.createElement('h3');
    title.textContent = pick(row, 'title');
    const excerpt = document.createElement('p');
    excerpt.textContent = pick(row, 'excerpt') || pick(row, 'content').slice(0, isPreview ? 145 : 220);
    const more = document.createElement('span');
    more.className = 'news-more';
    more.textContent = lang() === 'ky' ? 'Толук окуу →' : 'Читать полностью →';

    body.append(meta, title, excerpt, more);
    link.append(media, body);
    article.appendChild(link);
    return article;
  }

  function renderList(root, rows, limit = null) {
    if (!root) return;
    root.innerHTML = '';
    const visible = limit ? rows.slice(0, limit) : rows;
    if (!visible.length) {
      message(root, lang() === 'ky' ? 'Азырынча жарыяланган жаңылык жок.' : 'Пока нет опубликованных новостей.');
      return;
    }
    visible.forEach((row) => root.appendChild(card(row, Boolean(limit))));
  }

  function renderArticle(row) {
    if (!articleRoot) return;
    articleRoot.innerHTML = '';
    const wrap = document.createElement('article');
    wrap.className = 'article-page';

    const meta = document.createElement('div');
    meta.className = 'article-meta';
    const cat = document.createElement('span');
    cat.textContent = pick(row, 'category') || (lang() === 'ky' ? 'Жаңылык' : 'Новость');
    const date = document.createElement('time');
    date.textContent = formatDate(row.published_at);
    meta.append(cat, date);

    const title = document.createElement('h1');
    title.textContent = pick(row, 'title');
    wrap.append(meta, title);

    if (row.image_url) {
      const img = document.createElement('img');
      img.className = 'article-cover';
      img.src = row.image_url;
      img.alt = pick(row, 'title');
      wrap.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'article-content';
    const text = pick(row, 'content');
    text.split(/\n{2,}/).filter(Boolean).forEach((block) => {
      const p = document.createElement('p');
      p.textContent = block.trim();
      body.appendChild(p);
    });
    wrap.appendChild(body);
    articleRoot.appendChild(wrap);
    document.title = `${pick(row, 'title')} — Жаштар Борбору Манас`;
  }

  async function init() {
    if (!configured || !window.supabase) {
      const text = lang() === 'ky'
        ? 'Жаңылыктар базасы азырынча туташтырылган эмес.'
        : 'База новостей пока не подключена.';
      message(listRoot, text);
      message(previewRoot, text);
      message(articleRoot, text, 'error');
      return;
    }

    const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
    if (articleRoot) {
      const id = new URLSearchParams(location.search).get('id');
      if (!id) { message(articleRoot, lang() === 'ky' ? 'Жаңылык табылган жок.' : 'Новость не найдена.', 'error'); return; }
      const { data, error } = await client.from('news').select('*').eq('id', id).eq('published', true).single();
      if (error || !data) { message(articleRoot, lang() === 'ky' ? 'Жаңылык табылган жок.' : 'Новость не найдена.', 'error'); return; }
      renderArticle(data);
      return;
    }

    const { data, error } = await client.from('news')
      .select('*')
      .eq('published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending:false });

    if (error) {
      const text = lang() === 'ky' ? 'Жаңылыктарды жүктөө мүмкүн болгон жок.' : 'Не удалось загрузить новости.';
      message(listRoot, text, 'error');
      message(previewRoot, text, 'error');
      return;
    }
    renderList(listRoot, data || []);
    renderList(previewRoot, data || [], 3);
  }

  window.addEventListener('jbm:languagechange', init);
  init();
})();
