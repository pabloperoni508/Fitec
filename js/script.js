import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ Reemplazá estos valores con los de tu proyecto Supabase
const SUPABASE_URL  = 'https://dvqwzttgskkorfhtdavu.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cXd6dHRnc2trb3JmaHRkYXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTc1NTYsImV4cCI6MjA5MzU3MzU1Nn0.JaBMkSUiwms1oRtk9wsomB5XW3ssrQMplLaMf7K-OtE';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function imgUrl(path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/fitec-images/${path}`;
}

let detailBackPage = 'index';

window.goTo = function (pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
  const base = pageId.split('-')[0];
  const btn = document.getElementById('nav-' + base);
  if (btn) btn.classList.add('active');
};

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

function showDetail(item, backPage) {
  detailBackPage = backPage;
  window._fitecItemActual = item;;

  document.getElementById('detail-cat').textContent   = item.categoria || '';
  document.getElementById('detail-title').textContent = item.nombre;
  document.getElementById('detail-desc').textContent  = item.descripcion  || '';
  document.getElementById('detail-desc2').textContent = item.descripcion2 || '';

  const detailImg = document.getElementById('detail-img');
  if (item.imagen_principal) {
    detailImg.innerHTML = `<img src="${imgUrl(item.imagen_principal)}" alt="${item.nombre}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    detailImg.innerHTML = `<div class="ph-box" style="height:100%;"><span>/img ${item.nombre}</span></div>`;
  }

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

  // Actualizar link de WhatsApp con el modelo en el mensaje
  const waLink = document.getElementById('whatsapp-link');
  if (waLink && window._fitecTelefono) {
    const msg = encodeURIComponent(`Hola, me interesa el ${item.categoria} "${item.nombre}". ¿Podrían darme más información?`);
    waLink.href = `https://wa.me/${window._fitecTelefono}?text=${msg}`;
  }

  goTo('detail');
}

async function init() {
  const { data: textos, error: texError } = await db
    .from('textos_home')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (textos) {
    document.getElementById('texto-quienes').textContent = textos.quienes_somos || '';
    document.getElementById('texto-que').textContent     = textos.que_hacemos   || '';
    window._fitecTelefono = textos.telefono || '';

    // Foto hero
    if (textos.hero_imagen) {
      const heroBg = document.getElementById('hero-bg');
      heroBg.innerHTML = `<img src="${imgUrl(textos.hero_imagen)}" style="width:100%;height:100%;object-fit:cover;">`;
      heroBg.style.opacity = '1';
      heroBg.style.background = 'none';
    }
  } else {
    document.getElementById('texto-quienes').textContent = '';
    document.getElementById('texto-que').textContent     = '';
    if (texError) console.warn('textos_home:', texError.message);
  }

  const { data: cabinas } = await db
    .from('productos')
    .select('*')
    .eq('categoria', 'cabina')
    .eq('activo', true)
    .order('orden', { ascending: true });

  renderGrid(cabinas || [], 'cabinas-grid', 'cabinas-list');

  if (cabinas && cabinas[0]?.imagen_principal) {
    document.getElementById('cat-thumb-cabinas').innerHTML =
      `<img src="${imgUrl(cabinas[0].imagen_principal)}" style="width:100%;height:100%;object-fit:cover;">`;
  }

  const { data: campers } = await db
    .from('productos')
    .select('*')
    .eq('categoria', 'camper')
    .eq('activo', true)
    .order('orden', { ascending: true });

  renderGrid(campers || [], 'campers-grid', 'campers-list');

  if (campers && campers[0]?.imagen_principal) {
    document.getElementById('cat-thumb-campers').innerHTML =
      `<img src="${imgUrl(campers[0].imagen_principal)}" style="width:100%;height:100%;object-fit:cover;">`;
  }

  document.getElementById('nav-index').classList.add('active');
}

init();

window.consultarWhatsapp = function () {
  if (!window._fitecTelefono) {
    alert('El número de contacto no está configurado aún.');
    return;
  }
  const item = window._fitecItemActual;
  const msg  = item
    ? `Hola, me interesa el ${item.categoria} "${item.nombre}". ¿Podrían darme más información?`
    : 'Hola, quisiera más información sobre sus productos.';
  window.open(`https://wa.me/${window._fitecTelefono}?text=${encodeURIComponent(msg)}`, '_blank');
};