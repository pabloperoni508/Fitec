// ═══════════════════════════════════════
//   FITEC — admin.js
//   Lógica del panel de administración
// ═══════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ Reemplazá estos valores con los de tu proyecto Supabase
const SUPABASE_URL  = 'https://dvqwzttgskkorfhtdavu.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cXd6dHRnc2trb3JmaHRkYXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTc1NTYsImV4cCI6MjA5MzU3MzU1Nn0.JaBMkSUiwms1oRtk9wsomB5XW3ssrQMplLaMf7K-OtE';

let ADMIN_PASS = 'fitec2025';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function imgUrl(path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/fitec-images/${path}`;
}

let currentCategoria = 'cabina';
let editingId        = null;
let pendingFiles     = [];
let existingImages   = [];
let removedImages    = [];
let heroImageFile    = null;
let currentHeroPath  = null;

window.doLogin = async function () {
  const pass = document.getElementById('login-pass').value;

  // Cargar contraseña actual desde Supabase antes de validar
  const { data } = await db.from('textos_home').select('admin_pass').eq('id', 1).maybeSingle();
  if (data?.admin_pass) ADMIN_PASS = data.admin_pass;

  if (pass === ADMIN_PASS) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = 'block';
    loadAll();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
};

document.getElementById('login-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') window.doLogin();
});

window.doLogout = function () {
  document.getElementById('admin-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
};

window.setTab = function (tab) {
  const names = ['cabinas', 'campers', 'home'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', names[i] === tab);
  });
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
};

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  setTimeout(() => { el.className = ''; }, 3000);
}

async function loadAll() {
  await loadProductos('cabina', 'grid-cabinas');
  await loadProductos('camper', 'grid-campers');
  await loadTextos();
}

async function loadProductos(cat, gridId) {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .eq('categoria', cat)
    .order('orden', { ascending: true });

  const grid = document.getElementById(gridId);
  if (error) { grid.innerHTML = `<p style="color:var(--danger);">Error al cargar</p>`; return; }
  if (!data || data.length === 0) {
    grid.innerHTML = `<p style="color:var(--muted);padding:40px 0;">Sin modelos aún. ¡Agregá el primero!</p>`;
    return;
  }

  grid.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const imgSrc = item.imagen_principal ? imgUrl(item.imagen_principal) : null;
    card.innerHTML = `
      ${imgSrc
        ? `<img class="product-card-img" src="${imgSrc}" alt="${item.nombre}">`
        : `<div class="product-card-img-placeholder">Sin imagen</div>`
      }
      <div class="product-card-body">
        <div class="product-card-name">
          ${item.nombre}
          ${!item.activo ? '<span class="inactive-badge">oculto</span>' : ''}
        </div>
        <div class="product-card-cat">${item.categoria} · orden ${item.orden}</div>
        <div class="product-card-actions">
          <button class="btn-sm btn-outline" style="color:var(--ink);border-color:var(--border);"
            onclick="editProducto('${item.id}')">✏️ Editar</button>
          <button class="btn-sm btn-danger"
            onclick="deleteProducto('${item.id}', '${item.nombre}')">🗑️ Borrar</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function loadTextos() {
  const { data } = await db.from('textos_home').select('*').eq('id', 1).maybeSingle();
  if (data) {
    document.getElementById('txt-quienes').value   = data.quienes_somos || '';
    document.getElementById('txt-que').value       = data.que_hacemos   || '';
    document.getElementById('txt-telefono').value  = data.telefono      || '';
    document.getElementById('txt-direccion').value = data.direccion     || '';
    document.getElementById('txt-maps').value      = data.maps_link     || '';
    if (data.admin_pass) ADMIN_PASS = data.admin_pass;
    currentHeroPath = data.hero_imagen || null;
    heroImageFile   = null;
    document.getElementById('hero-image-name').textContent = currentHeroPath ? 'Imagen actual cargada' : 'Ninguna imagen seleccionada';

    if (data.hero_imagen) {
      document.getElementById('hero-preview-img').src = imgUrl(data.hero_imagen);
      document.getElementById('hero-preview').style.display = 'block';
    } else {
      renderHeroPreview(null);
    }
  } else {
    currentHeroPath = null;
    heroImageFile   = null;
    document.getElementById('hero-image-name').textContent = 'Ninguna imagen seleccionada';
    renderHeroPreview(null);
  }
}

window.handleHeroImageSelect = function (event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  heroImageFile = file;
  document.getElementById('hero-image-name').textContent = file.name;

  const reader = new FileReader();
  reader.onload = e => renderHeroPreview(e.target.result);
  reader.readAsDataURL(file);
};

function renderHeroPreview(src) {
  const preview = document.getElementById('hero-preview');
  if (!preview) return;
  if (src) {
    preview.innerHTML = `<img src="${src}" alt="Hero preview" style="width:100%;height:100%;object-fit:cover;display:block;">`;
  } else {
    preview.innerHTML = '<span style="padding:16px;text-align:center;display:block;width:100%;">Aún no hay imagen de hero.</span>';
  }
}

window.saveHeroImage = async function () {
  if (!heroImageFile) {
    toast('Seleccioná una imagen para el hero', 'error');
    return;
  }

  const btn = document.getElementById('save-hero-btn');
  if (btn) {
    btn.innerHTML = '<span class="spinner"></span> Guardando…';
    btn.disabled = true;
  }

  try {
    const ext  = heroImageFile.name.split('.').pop();
    const path = `hero/hero_${Date.now()}.${ext}`;
    const { error: uploadError } = await db.storage.from('fitec-images').upload(path, heroImageFile, { upsert: true });
    if (uploadError) throw uploadError;

    const { error: dbError } = await db.from('textos_home').upsert({
      id: 1,
      hero_imagen: path,
    }, { onConflict: 'id' });
    if (dbError) throw dbError;

    if (currentHeroPath && currentHeroPath !== path) {
      await db.storage.from('fitec-images').remove([currentHeroPath]);
    }

    currentHeroPath = path;
    heroImageFile   = null;
    document.getElementById('hero-image-name').textContent = 'Imagen actual cargada';
    toast('Hero guardado correctamente', 'success');
  } catch (err) {
    console.error(err);
    toast('Error al guardar el hero: ' + (err.message || 'desconocido'), 'error');
  } finally {
    if (btn) {
      btn.innerHTML = 'Guardar hero';
      btn.disabled = false;
    }
  }
};

window.openModal = function (cat) {
  currentCategoria = cat;
  editingId        = null;
  pendingFiles     = [];
  existingImages   = [];
  removedImages    = [];

  document.getElementById('modal-title').textContent = cat === 'cabina' ? 'Nueva cabina' : 'Nuevo camper';
  document.getElementById('f-nombre').value          = '';
  document.getElementById('f-orden').value           = '1';
  document.getElementById('f-desc').value            = '';
  document.getElementById('f-desc2').value           = '';
  document.getElementById('f-activo').checked        = true;
  document.getElementById('specs-builder').innerHTML = '';
  document.getElementById('img-preview').innerHTML   = '';
  addSpecRow();

  document.getElementById('product-modal').classList.add('open');
};

window.closeModal = function () {
  document.getElementById('product-modal').classList.remove('open');
};

window.editProducto = async function (id) {
  const { data: item } = await db.from('productos').select('*').eq('id', id).single();
  if (!item) return;

  currentCategoria = item.categoria;
  editingId        = id;
  pendingFiles     = [];
  existingImages   = item.galeria ? [...item.galeria] : [];
  removedImages    = [];

  document.getElementById('modal-title').textContent = `Editar: ${item.nombre}`;
  document.getElementById('f-nombre').value          = item.nombre;
  document.getElementById('f-orden').value           = item.orden;
  document.getElementById('f-desc').value            = item.descripcion  || '';
  document.getElementById('f-desc2').value           = item.descripcion2 || '';
  document.getElementById('f-activo').checked        = item.activo;

  document.getElementById('specs-builder').innerHTML = '';
  if (item.specs && typeof item.specs === 'object') {
    Object.entries(item.specs).forEach(([k, v]) => addSpecRow(k, v));
  } else {
    addSpecRow();
  }

  const preview = document.getElementById('img-preview');
  preview.innerHTML = '';
  const allImgs = item.imagen_principal
    ? [item.imagen_principal, ...existingImages.filter(p => p !== item.imagen_principal)]
    : existingImages;
  allImgs.forEach((path, i) => addExistingPreview(path, i === 0));

  document.getElementById('product-modal').classList.add('open');
};

window.addSpecRow = function (key = '', val = '') {
  const builder = document.getElementById('specs-builder');
  const row = document.createElement('div');
  row.className = 'spec-row-input';
  row.innerHTML = `
    <input type="text" placeholder="Nombre (ej: Largo)" value="${key}" style="flex:1;">
    <input type="text" placeholder="Valor (ej: 3.50 m)"  value="${val}" style="flex:1;">
    <button class="btn-icon remove" onclick="this.parentElement.remove()">✕</button>
  `;
  builder.appendChild(row);
};

function getSpecs() {
  const specs = {};
  document.querySelectorAll('#specs-builder .spec-row-input').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const k = inputs[0].value.trim();
    const v = inputs[1].value.trim();
    if (k) specs[k] = v;
  });
  return specs;
}

window.handleImgSelect = function (e) {
  Array.from(e.target.files).forEach(file => {
    pendingFiles.push(file);
    const reader = new FileReader();
    reader.onload = ev => addNewPreview(ev.target.result, pendingFiles.length - 1);
    reader.readAsDataURL(file);
  });
  e.target.value = '';
};

function addNewPreview(src, idx) {
  const preview = document.getElementById('img-preview');
  const isFirst = preview.children.length === 0;
  const div = document.createElement('div');
  div.className    = 'img-preview-item';
  div.dataset.type = 'new';
  div.dataset.idx  = idx;
  div.innerHTML = `
    <img src="${src}">
    ${isFirst ? '<span class="img-primary-badge">Principal</span>' : ''}
    <button class="remove-img" onclick="removeNewImg(this, ${idx})">✕</button>
  `;
  preview.appendChild(div);
  updatePrimaryBadge();
}

function addExistingPreview(path, isPrimary) {
  const preview = document.getElementById('img-preview');
  const div = document.createElement('div');
  div.className    = 'img-preview-item';
  div.dataset.type = 'existing';
  div.dataset.path = path;
  div.innerHTML = `
    <img src="${imgUrl(path)}">
    ${isPrimary ? '<span class="img-primary-badge">Principal</span>' : ''}
    <button class="remove-img" onclick="removeExistingImg(this, '${path}')">✕</button>
  `;
  preview.appendChild(div);
}

window.removeNewImg = function (btn, idx) {
  pendingFiles[idx] = null;
  btn.parentElement.remove();
  updatePrimaryBadge();
};

window.removeExistingImg = function (btn, path) {
  removedImages.push(path);
  existingImages = existingImages.filter(p => p !== path);
  btn.parentElement.remove();
  updatePrimaryBadge();
};

function updatePrimaryBadge() {
  document.querySelectorAll('#img-preview .img-preview-item').forEach((item, i) => {
    const badge = item.querySelector('.img-primary-badge');
    if (i === 0) {
      if (!badge) {
        const b = document.createElement('span');
        b.className   = 'img-primary-badge';
        b.textContent = 'Principal';
        item.appendChild(b);
      }
    } else {
      if (badge) badge.remove();
    }
  });
}

window.saveProducto = async function () {
  const nombre = document.getElementById('f-nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  const btn = document.getElementById('save-btn');
  btn.innerHTML = '<span class="spinner"></span> Guardando…';
  btn.disabled  = true;

  try {
    const newPaths = [];
    for (const file of pendingFiles.filter(Boolean)) {
      const ext  = file.name.split('.').pop();
      const path = `${currentCategoria}s/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await db.storage.from('fitec-images').upload(path, file, { upsert: false });
      if (error) throw error;
      newPaths.push(path);
    }

    for (const path of removedImages) {
      await db.storage.from('fitec-images').remove([path]);
    }

    const orderedPaths = [];
    let newIdx = 0;
    document.querySelectorAll('#img-preview .img-preview-item').forEach(item => {
      if (item.dataset.type === 'existing') {
        orderedPaths.push(item.dataset.path);
      } else if (pendingFiles[parseInt(item.dataset.idx)]) {
        orderedPaths.push(newPaths[newIdx++]);
      }
    });

    const payload = {
      nombre,
      categoria:        currentCategoria,
      orden:            parseInt(document.getElementById('f-orden').value) || 1,
      descripcion:      document.getElementById('f-desc').value.trim(),
      descripcion2:     document.getElementById('f-desc2').value.trim(),
      specs:            getSpecs(),
      activo:           document.getElementById('f-activo').checked,
      imagen_principal: orderedPaths[0] || null,
      galeria:          orderedPaths.slice(1),
    };

    if (editingId) {
      const { error } = await db.from('productos').update(payload).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await db.from('productos').insert(payload);
      if (error) throw error;
    }

    closeModal();
    toast('¡Guardado correctamente!', 'success');
    await loadProductos(currentCategoria, currentCategoria === 'cabina' ? 'grid-cabinas' : 'grid-campers');

  } catch (err) {
    console.error(err);
    toast('Error al guardar: ' + (err.message || 'desconocido'), 'error');
  } finally {
    btn.innerHTML = 'Guardar';
    btn.disabled  = false;
  }
};

window.deleteProducto = async function (id, nombre) {
  if (!confirm(`¿Borrar "${nombre}"? Esta acción no se puede deshacer.`)) return;

  const { data: item } = await db.from('productos')
    .select('imagen_principal, galeria').eq('id', id).single();

  const paths = [];
  if (item?.imagen_principal) paths.push(item.imagen_principal);
  if (item?.galeria)          paths.push(...item.galeria);
  if (paths.length) await db.storage.from('fitec-images').remove(paths);

  const { error } = await db.from('productos').delete().eq('id', id);
  if (error) { toast('Error al borrar', 'error'); return; }

  toast('Producto eliminado', '');
  loadAll();
};

window.saveTextos = async function () {
  const { error } = await db.from('textos_home').upsert({
    id:            1,
    quienes_somos: document.getElementById('txt-quienes').value.trim(),
    que_hacemos:   document.getElementById('txt-que').value.trim(),
  }, { onConflict: 'id' });

  if (error) { toast('Error al guardar textos', 'error'); return; }
  toast('Textos guardados', 'success');
};

window.saveTelefono = async function () {
  const telefono = document.getElementById('txt-telefono').value.trim();
  if (!telefono) { toast('Ingresá un número', 'error'); return; }

  const { error } = await db.from('textos_home').upsert({
    id:       1,
    telefono,
  }, { onConflict: 'id' });

  if (error) { toast('Error al guardar teléfono', 'error'); return; }
  toast('Teléfono guardado', 'success');
};

window.cambiarPassword = async function () {
  const actual  = document.getElementById('pass-actual').value;
  const nueva   = document.getElementById('pass-nueva').value;
  const repetir = document.getElementById('pass-repetir').value;

  if (actual !== ADMIN_PASS) { toast('La contraseña actual es incorrecta', 'error'); return; }
  if (!nueva)                { toast('Ingresá una nueva contraseña', 'error'); return; }
  if (nueva !== repetir)     { toast('Las contraseñas no coinciden', 'error'); return; }

  const { error } = await db.from('textos_home').upsert({
    id:         1,
    admin_pass: nueva,
  }, { onConflict: 'id' });

  if (error) { toast('Error al guardar contraseña', 'error'); return; }

  ADMIN_PASS = nueva;
  document.getElementById('pass-actual').value  = '';
  document.getElementById('pass-nueva').value   = '';
  document.getElementById('pass-repetir').value = '';
  toast('Contraseña cambiada y guardada', 'success');
};
window.handleHeroSelect = async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // Preview inmediato
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('hero-preview-img').src = ev.target.result;
    document.getElementById('hero-preview').style.display = 'block';
  };
  reader.readAsDataURL(file);

  // Subir a Supabase
  const ext  = file.name.split('.').pop();
  const path = `hero/hero_${Date.now()}.${ext}`;

  toast('Subiendo imagen…', '');

  const { error } = await db.storage.from('fitec-images').upload(path, file, { upsert: true });
  if (error) { toast('Error al subir la imagen', 'error'); return; }

  // Guardar path en textos_home
  const { error: dbError } = await db.from('textos_home').upsert({
    id:           1,
    hero_imagen:  path,
  }, { onConflict: 'id' });

  if (dbError) { toast('Error al guardar', 'error'); return; }
  toast('Foto de fondo guardada', 'success');
};

window.removeHero = async function () {
  const { error } = await db.from('textos_home').upsert({
    id:          1,
    hero_imagen: '',
  }, { onConflict: 'id' });

  if (error) { toast('Error al quitar la foto', 'error'); return; }

  document.getElementById('hero-preview').style.display = 'none';
  document.getElementById('hero-preview-img').src = '';
  document.getElementById('hero-input').value = '';
  toast('Foto de fondo quitada', 'success');
};

window.saveDireccion = async function () {
  const direccion = document.getElementById('txt-direccion').value.trim();
  if (!direccion) { toast('Ingresá una dirección', 'error'); return; }

  const { error } = await db.from('textos_home').upsert({
    id: 1,
    direccion,
  }, { onConflict: 'id' });

  if (error) { toast('Error al guardar dirección', 'error'); return; }
  toast('Dirección guardada', 'success');
};

window.saveMapsLink = async function () {
  const link = document.getElementById('txt-maps').value.trim();
  if (!link) { toast('Pegá un link de Google Maps', 'error'); return; }

  const { error } = await db.from('textos_home').upsert({
    id: 1,
    maps_link: link,
  }, { onConflict: 'id' });

  if (error) { toast('Error al guardar ubicación', 'error'); return; }
  toast('Ubicación guardada', 'success');
};