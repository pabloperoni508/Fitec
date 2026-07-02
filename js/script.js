import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://dvqwzttgskkorfhtdavu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cXd6dHRnc2trb3JmaHRkYXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTc1NTYsImV4cCI6MjA5MzU3MzU1Nn0.JaBMkSUiwms1oRtk9wsomB5XW3ssrQMplLaMf7K-OtE';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function imgUrl(path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/fitec-images/${path}`;
}

function buildMapEmbedUrl(mapsLink) {
  if (!mapsLink) return null;
  const coordMatch = mapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) {
    const [, lat, lng] = coordMatch;
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(mapsLink)}&z=15&output=embed`;
}

let detailBackPage = 'index';

// ── NAVEGACIÓN ────────────────────────────────────────────────
window.goTo = function (pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
  const slug = pageId.replace('-list', '');
  const btn = document.getElementById('nav-' + pageId)
           || document.getElementById('nav-' + slug)
           || document.getElementById('nav-index');
  if (btn) btn.classList.add('active');
};

// ── GRILLAS ───────────────────────────────────────────────────
function renderGrid(items, gridId, backPage) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (!items || items.length === 0) {
    grid.innerHTML = '<p style="color:#999;padding:48px 0;text-align:center;grid-column:1/-1;">No hay modelos cargados aún.</p>';
    return;
  }
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'model-card';
    const thumb = item.imagen_principal
      ? `<img src="${imgUrl(item.imagen_principal)}" alt="${item.nombre}" style="width:100%;height:100%;object-fit:cover;">`
      : `<div class="ph-box"><span>${item.nombre}</span></div>`;
    card.innerHTML = `
      <div class="model-thumb">${thumb}</div>
      <div class="model-name">${item.nombre}</div>
    `;
    card.addEventListener('click', () => showDetail(item, backPage));
    grid.appendChild(card);
  });
}

// ── DETALLE ───────────────────────────────────────────────────
function showDetail(item, backPage) {
  detailBackPage = backPage;
  window._fitecItemActual = item;

  document.getElementById('detail-cat').textContent   = item.categoria || '';
  document.getElementById('detail-title').textContent = item.nombre;
  document.getElementById('detail-desc').textContent  = item.descripcion  || '';
  document.getElementById('detail-desc2').textContent = item.descripcion2 || '';

  const detailImg = document.getElementById('detail-img');
  detailImg.innerHTML = item.imagen_principal
    ? `<img src="${imgUrl(item.imagen_principal)}" alt="${item.nombre}" style="width:100%;height:100%;object-fit:cover;">`
    : `<div class="ph-box" style="height:100%;"><span>/img ${item.nombre}</span></div>`;

  const specsEl = document.getElementById('detail-specs');
  specsEl.innerHTML = '';
  if (item.specs && typeof item.specs === 'object') {
    Object.entries(item.specs).forEach(([key, val]) => {
      specsEl.innerHTML += `
        <div class="spec-row">
          <span class="spec-label">${key}</span>
          <span class="spec-val">${val}</span>
        </div>
      `;
    });
  }

  const gallery = document.getElementById('detail-gallery');
  gallery.innerHTML = '';
  if (item.galeria && item.galeria.length > 0) {
    item.galeria.forEach(path => {
      gallery.innerHTML += `
        <div style="aspect-ratio:4/3;border-radius:8px;overflow:hidden;border:1px solid #e5e0d8;">
          <img src="${imgUrl(path)}" style="width:100%;height:100%;object-fit:cover;">
        </div>
      `;
    });
  }

  document.getElementById('detail-back-btn').onclick = () => goTo(detailBackPage);
  goTo('detail');
}

// ── GENERAR PÁGINAS Y NAV POR CATEGORÍA ──────────────────────
function buildCategoriaPages(categorias) {
  const navLinks    = document.getElementById('nav-links');
  const catGrid     = document.getElementById('cat-grid');
  const pagesWrap   = document.getElementById('categoria-pages');

  // Limpiar los dinámicos (dejar solo el botón Inicio)
  navLinks.querySelectorAll('.nav-cat').forEach(el => el.remove());
  catGrid.innerHTML   = '';
  pagesWrap.innerHTML = '';

  categorias.forEach(cat => {
    const slug = cat.slug;

    // Botón en el nav
    const navBtn = document.createElement('button');
    navBtn.id        = `nav-${slug}`;
    navBtn.className = 'nav-cat';
    navBtn.textContent = cat.nombre;
    navBtn.onclick = () => goTo(`${slug}-list`);
    navLinks.appendChild(navBtn);

    // Tarjeta en la home
    catGrid.innerHTML += `
      <div class="cat-card" onclick="goTo('${slug}-list')">
        <div class="cat-thumb" id="cat-thumb-${slug}">
          <div class="ph-box"><span>${cat.nombre}</span></div>
        </div>
        <div class="cat-label">
          ${cat.nombre}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>
          </svg>
        </div>
      </div>
    `;

    // Página de lista de la categoría
    pagesWrap.innerHTML += `
      <div class="page" id="page-${slug}-list">
        <div class="wrap">
          <div class="page-header">
            <button class="back-btn" onclick="goTo('index')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/>
              </svg>
              Volver
            </button>
            <h1 class="page-title">${cat.nombre.toUpperCase()}</h1>
          </div>
          <div class="model-grid" id="${slug}-grid">
            <div class="ph-box" style="grid-column:1/-1;padding:60px;text-align:center;">Cargando…</div>
          </div>
        </div>
        <footer>© <span class="year"></span> <span>Fitec</span> — Todos los derechos reservados | desarrollado por <b>Peroni Pablo</b> — Contacto: 3471670049 — Gmail: pabloperoni508@gmail.com</footer>
      </div>
    `;
  });

  // Actualizar año en todos los footers
  document.querySelectorAll('.year').forEach(el => el.textContent = new Date().getFullYear());
}

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  // Año en footers
  document.querySelectorAll('.year').forEach(el => el.textContent = new Date().getFullYear());

  // Textos home
  const { data: textos, error: texError } = await db
    .from('textos_home').select('*').eq('id', 1).maybeSingle();

  if (textos) {
    const elQ = document.getElementById('texto-quienes');
    const elH = document.getElementById('texto-que');
    if (elQ) elQ.textContent = textos.quienes_somos || '';
    if (elH) elH.textContent = textos.que_hacemos   || '';
    window._fitecTelefono = textos.telefono || '';

    const elTel = document.getElementById('texto-telefono');
    const contactoSection = document.getElementById('contacto-section');
    if (elTel && textos.telefono) {
      elTel.textContent = `📞 ${textos.telefono}`;
      if (contactoSection) contactoSection.style.display = 'block';
    }

    if (textos.hero_imagen) {
      const heroBg = document.getElementById('hero-bg');
      if (heroBg) {
        heroBg.innerHTML = `<img src="${imgUrl(textos.hero_imagen)}" style="width:100%;height:100%;object-fit:cover;">`;
        heroBg.style.opacity   = '1';
        heroBg.style.background = 'none';
      }
    }

    const mapaSection = document.getElementById('mapa-section');
    if (mapaSection && textos.maps_link) {
      document.getElementById('mapa-contenedor').innerHTML = `
        <iframe src="${buildMapEmbedUrl(textos.maps_link)}"
          width="100%" height="320" style="border:0;"
          allowfullscreen loading="lazy"
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      `;
      mapaSection.style.display = 'block';
    }
  } else if (texError) {
    console.warn('textos_home:', texError.message);
  }

  // Categorías
  const { data: categorias } = await db
    .from('categorias').select('*').eq('activo', true).order('orden', { ascending: true });

  if (!categorias || categorias.length === 0) return;

  buildCategoriaPages(categorias);

  // Cargar productos por categoría
  for (const cat of categorias) {
    const { data: items } = await db
      .from('productos')
      .select('*')
      .eq('categoria', cat.slug)
      .eq('activo', true)
      .order('orden', { ascending: true });

    renderGrid(items || [], `${cat.slug}-grid`, `${cat.slug}-list`);

    if (items && items[0]?.imagen_principal) {
      const thumb = document.getElementById(`cat-thumb-${cat.slug}`);
      if (thumb) thumb.innerHTML =
        `<img src="${imgUrl(items[0].imagen_principal)}" style="width:100%;height:100%;object-fit:cover;">`;
    }
  }

  document.getElementById('nav-index').classList.add('active');
}

init();

// ── WHATSAPP ──────────────────────────────────────────────────
window.consultarWhatsapp = function () {
  if (!window._fitecTelefono) {
    alert('El número de contacto no está configurado aún.');
    return;
  }
  const item = window._fitecItemActual;
  const msg = item
    ? `Hola, me interesa "${item.nombre}". ¿Podrían darme más información?`
    : 'Hola, quisiera más información sobre sus productos.';
  window.open(`https://wa.me/${window._fitecTelefono}?text=${encodeURIComponent(msg)}`, '_blank');
};