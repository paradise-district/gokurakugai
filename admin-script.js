/* ════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD JAVASCRIPT
   ─────────────────────────────────────────────────────────────────────
   WHERE TO INSERT: Inside the <script> block at the bottom of index.html,
   just before the final updateGateUI() call (very last line of the script).

   PREREQUISITES: Firebase JS SDK v9 compat must be loaded in <head>:
   Add these TWO scripts before the existing closing </head> tag:
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>

   Also add the Admin nav tab to the desktop nav (in <ul class="nav-tabs">):
     <li id="nav-admin-tab">
       <a href="#" class="tab" data-tab="admin">
         <svg class="icon icon-sm"><use href="#i-shield"/></svg> Admin
       </a>
     </li>

   And to VALID_TABS array in the existing JS:
     const VALID_TABS=['about','manga','news','theories','rules','info','staff','admin'];
════════════════════════════════════════════════════════════════════════ */

/* ── Firebase Client Config ──────────────────────────────────────────────
   Replace these values with your Firebase project's config.
   Get it from: Firebase Console → Project Settings → Your apps → Web app
───────────────────────────────────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyD0wvSd9pj00r8LHMVi-nN889JGzyMEOls',
  authDomain:        'gokurakugai-community.firebaseapp.com',
  projectId:         'gokurakugai-community',
  storageBucket:     'gokurakugai-community.firebasestorage.app',
  messagingSenderId: '856861492305',
  appId:             '1:856861492305:web:1adfe1e8e8f2a4a148e470',
};

// Initialize Firebase (guard against double-init)
if (!firebase.apps?.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const fdb      = firebase.firestore();
const fstorage = firebase.storage();

// ── Constants ─────────────────────────────────────────────────────────────
const SUPPORT_TEAM_ROLE_ID = '995870854481203241';
const ADMIN_COLS = {
  theories:     () => fdb.collection('theories'),
  applications: () => fdb.collection('applications'),
  settings:     () => fdb.collection('settings').doc('global'),
  gallery:      () => fdb.collection('gallery'),
  admins:       () => fdb.collection('admins'),
};

// State
let _isStaff            = false;
let _admCurrentFilter   = 'all';
let _appsCurrentFilter  = 'all';
let _rejectTargetId     = null;
let _unsubTheories      = null;
let _unsubApps          = null;
let _galListeners       = {};

// ════════════════════════════════════════════════════════════════════════
//  STAFF VERIFICATION
// ════════════════════════════════════════════════════════════════════════

async function verifyAdminAccess() {
  const section = document.getElementById('admin');
  if (!section) return;

  // Must be logged in
  if (!dcUser || !dcUser.id) {
    showAdminState('denied');
    return;
  }

  showAdminState('loading');

  try {
    // Check Firestore admins collection (maintained by bot)
    const snap = await ADMIN_COLS.admins().doc(dcUser.id).get();
    if (!snap.exists || !snap.data().isAdmin) {
      _isStaff = false;
      showAdminState('denied');
      return;
    }

    _isStaff = true;
    showAdminState('dashboard');

    // Show nav tab
    const navTab = document.getElementById('nav-admin-tab');
    if (navTab) navTab.style.display = '';
    const mobTab = document.getElementById('mob-admin-item');
    if (mobTab) mobTab.style.display = '';

    // Set staff badge
    const badge = document.getElementById('adm-staff-badge');
    if (badge) badge.textContent = '⚔ Support Team';

    // Initialize all panels
    await initAdminDashboard();

  } catch (err) {
    console.error('[ADMIN] Access check failed:', err);
    showAdminState('denied');
  }
}

function showAdminState(state) {
  document.getElementById('admin-loading')?.style && (document.getElementById('admin-loading').style.display      = state === 'loading'   ? 'block' : 'none');
  document.getElementById('admin-access-denied')  && (document.getElementById('admin-access-denied').style.display = state === 'denied'    ? 'block' : 'none');
  document.getElementById('admin-dash')            && (document.getElementById('admin-dash').style.display          = state === 'dashboard' ? 'block' : 'none');
}

// ════════════════════════════════════════════════════════════════════════
//  DASHBOARD INIT
// ════════════════════════════════════════════════════════════════════════

async function initAdminDashboard() {
  // Tab switching
  document.querySelectorAll('.adm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panelId = tab.dataset.adm;
      document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(panelId)?.classList.add('active');
    });
  });

  // Wire filter buttons — theories
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _admCurrentFilter = btn.dataset.filter;
      loadTheories();
    });
  });

  // Wire filter buttons — applications
  document.querySelectorAll('[data-appfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-appfilter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _appsCurrentFilter = btn.dataset.appfilter;
      loadApplications();
    });
  });

  // Wire file upload inputs
  document.querySelectorAll('.adm-file-input').forEach(input => {
    input.addEventListener('change', e => {
      const folder = input.dataset.folder;
      const files = Array.from(e.target.files);
      if (files.length) handleGalleryUpload(folder, files);
      input.value = '';
    });
  });

  // Load all panels
  loadTheories();
  loadApplications();
  loadGallery();
  loadSettings();
  buildRejectModal();
}

function adminReloadAll() {
  loadTheories();
  loadApplications();
  loadGallery();
  loadSettings();
  showToast('Dashboard refreshed ✦');
}

// ════════════════════════════════════════════════════════════════════════
//  THEORIES PANEL
// ════════════════════════════════════════════════════════════════════════

async function loadTheories() {
  const list    = document.getElementById('adm-theories-list');
  const loading = document.getElementById('adm-theories-loading');
  const empty   = document.getElementById('adm-theories-empty');
  if (!list) return;

  list.innerHTML    = '';
  loading.style.display = 'flex';
  empty.style.display   = 'none';

  // Unsubscribe previous listener
  if (_unsubTheories) _unsubTheories();

  let q = ADMIN_COLS.theories().orderBy('timestamp', 'desc');
  if (_admCurrentFilter !== 'all') q = q.where('status', '==', _admCurrentFilter);

  _unsubTheories = q.onSnapshot(snap => {
    loading.style.display = 'none';
    list.innerHTML = '';

    if (snap.empty) {
      empty.style.display = 'flex';
      document.getElementById('adm-badge-theories').textContent = '0';
      return;
    }

    empty.style.display = 'none';
    const pending = snap.docs.filter(d => d.data().status === 'pending').length;
    document.getElementById('adm-badge-theories').textContent = pending;

    snap.docs.forEach(doc => {
      list.appendChild(buildTheoryCard(doc.id, doc.data()));
    });
  }, err => {
    loading.style.display = 'none';
    console.error('[ADMIN] Theory snapshot error:', err);
  });
}

function buildTheoryCard(id, t) {
  const card = document.createElement('div');
  card.className = 'adm-theory-card';
  card.dataset.theoryId = id;

  const ts = t.timestamp?.toDate?.() ?? new Date();
  const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const avatarHtml = t.avatar
    ? `<img class="adm-theory-avatar" src="https://cdn.discordapp.com/avatars/${t.userId}/${t.avatar}.png?size=64" alt="">`
    : `<div class="adm-theory-avatar-ph">${(t.displayName || t.username || '?')[0].toUpperCase()}</div>`;

  const statusClass = `adm-status-${t.status || 'pending'}`;
  const statusLabel = (t.status || 'pending').charAt(0).toUpperCase() + (t.status || 'pending').slice(1);

  const rejectionHtml = t.status === 'rejected' && t.rejectionReason
    ? `<div class="adm-rejection-reason"><strong>Rejection reason:</strong> ${escHtml(t.rejectionReason)}</div>`
    : '';

  // Action buttons vary by status
  const actionHtml = buildTheoryActions(id, t.status);

  card.innerHTML = `
    <div class="adm-theory-top">
      <div class="adm-theory-meta">
        ${avatarHtml}
        <div>
          <div class="adm-theory-user">${escHtml(t.displayName || t.username || 'Unknown')}</div>
          <div class="adm-theory-date">${escHtml(t.username || '')} · ${dateStr}${t.source === 'discord' ? ' · via Discord' : ''}</div>
        </div>
      </div>
      <div class="adm-status-pill ${statusClass}">${statusLabel}</div>
    </div>

    <div class="adm-theory-title">${escHtml(t.title || '(Untitled)')}</div>
    <span class="adm-theory-tag">${escHtml(t.tag || 'Uncategorized')}</span>
    ${t.chapters ? `<span class="adm-theory-tag" style="margin-left:.4rem;">📖 ${escHtml(t.chapters)}</span>` : ''}
    ${t.containsSpoilers ? `<span class="adm-theory-tag" style="margin-left:.4rem;color:#F5A623;border-color:rgba(245,166,35,.4)">⚠ Spoilers</span>` : ''}

    <div class="adm-theory-body" id="tbody-${id}">${escHtml(t.body || '(No content)')}</div>
    <button style="font-size:.75rem;color:var(--accent);background:none;border:none;cursor:pointer;padding:0;margin-bottom:.5rem;"
      onclick="adminExpandBody('${id}')">Read more ▾</button>

    ${rejectionHtml}

    <div class="adm-theory-actions">${actionHtml}</div>
  `;

  return card;
}

function buildTheoryActions(theoryId, status) {
  if (status === 'pending') {
    return `
      <button class="adm-btn adm-btn-approve" onclick="adminApproveTheory('${theoryId}')">✅ Approve</button>
      <button class="adm-btn adm-btn-reject" onclick="adminOpenRejectModal('${theoryId}')">❌ Reject</button>
      <button class="adm-btn adm-btn-delete" onclick="adminDeleteTheory('${theoryId}')">🗑️ Delete</button>
    `;
  }
  if (status === 'approved') {
    return `
      <button class="adm-btn adm-btn-reject" onclick="adminOpenRejectModal('${theoryId}')">⏩ Change to Rejected</button>
      <button class="adm-btn adm-btn-delete" onclick="adminDeleteTheory('${theoryId}')">🗑️ Delete</button>
    `;
  }
  if (status === 'rejected') {
    return `
      <button class="adm-btn adm-btn-approve" onclick="adminApproveTheory('${theoryId}')">✅ Approve</button>
      <button class="adm-btn adm-btn-delete" onclick="adminDeleteTheory('${theoryId}')">🗑️ Delete</button>
    `;
  }
  return `<button class="adm-btn adm-btn-delete" onclick="adminDeleteTheory('${theoryId}')">🗑️ Delete</button>`;
}

function adminExpandBody(id) {
  const el = document.getElementById(`tbody-${id}`);
  if (!el) return;
  el.classList.toggle('expanded');
}

// ── CRUD operations ────────────────────────────────────────────────────

async function adminApproveTheory(theoryId) {
  if (!_isStaff) return;
  try {
    const snap = await ADMIN_COLS.theories().doc(theoryId).get();
    if (!snap.exists) return;
    const t = { id: theoryId, ...snap.data() };

    await ADMIN_COLS.theories().doc(theoryId).update({
      status:     'approved',
      reviewedBy: dcUser?.id || 'website',
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast('✅ Theory approved!');

    // The bot handles posting to public channel and DM via Firestore listener.
    // Update the approved theories visible on the site
    loadApprovedTheoriesPublic();

  } catch (err) {
    console.error('[ADMIN] Approve error:', err);
    showToast('❌ Error approving theory.', 'err');
  }
}

function adminOpenRejectModal(theoryId) {
  _rejectTargetId = theoryId;
  const modal = document.getElementById('adm-reject-modal-ov');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const ta = document.getElementById('adm-reject-reason-input');
    if (ta) ta.value = '';
    setTimeout(() => ta?.focus(), 100);
  }
}

function adminCloseRejectModal() {
  _rejectTargetId = null;
  document.getElementById('adm-reject-modal-ov')?.classList.remove('open');
  document.body.style.overflow = '';
}

async function adminConfirmReject() {
  if (!_rejectTargetId || !_isStaff) return;
  const reason = (document.getElementById('adm-reject-reason-input')?.value || '').trim();

  try {
    await ADMIN_COLS.theories().doc(_rejectTargetId).update({
      status:          'rejected',
      rejectionReason: reason || 'No reason provided.',
      reviewedBy:      dcUser?.id || 'website',
      reviewedAt:      firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast('❌ Theory rejected.');
    adminCloseRejectModal();
  } catch (err) {
    console.error('[ADMIN] Reject error:', err);
    showToast('❌ Error rejecting theory.', 'err');
  }
}

async function adminDeleteTheory(theoryId) {
  if (!_isStaff) return;
  if (!confirm('Permanently delete this theory? This cannot be undone.')) return;

  try {
    await ADMIN_COLS.theories().doc(theoryId).delete();
    showToast('🗑️ Theory deleted.');
    // Also remove from public theories list
    loadApprovedTheoriesPublic();
  } catch (err) {
    console.error('[ADMIN] Delete error:', err);
    showToast('❌ Error deleting theory.', 'err');
  }
}

// ── Build reject modal DOM (injected once) ──────────────────────────────
function buildRejectModal() {
  if (document.getElementById('adm-reject-modal-ov')) return;

  const modal = document.createElement('div');
  modal.id = 'adm-reject-modal-ov';
  modal.innerHTML = `
    <div class="adm-reject-modal">
      <h4>❌ Reject Theory</h4>
      <label for="adm-reject-reason-input">Reason for Rejection <span style="color:var(--text-muted);font-family:'Crimson Pro',serif;font-size:.88rem;">(optional)</span></label>
      <textarea id="adm-reject-reason-input" placeholder="Explain why this theory isn't being approved..."></textarea>
      <div class="adm-reject-modal-actions">
        <button class="btn" onclick="adminCloseRejectModal()">Cancel</button>
        <button class="btn btn-p" onclick="adminConfirmReject()">Confirm Rejection</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => {
    if (e.target === modal) adminCloseRejectModal();
  });
}

// ════════════════════════════════════════════════════════════════════════
//  GALLERY PANEL
// ════════════════════════════════════════════════════════════════════════

const GAL_FOLDERS = [
  'chapter-covers', 'volume-covers', 'magazines',
  'official-illustrations', 'extra-illustrations', 'archived-illustrations'
];

async function loadGallery() {
  GAL_FOLDERS.forEach(folder => loadFolderImages(folder));
}

function loadFolderImages(folder) {
  const grid = document.getElementById(`adm-gal-grid-${folder}`);
  if (!grid) return;

  grid.innerHTML = '<div class="adm-gal-loading"><div class="adm-spinner-sm"></div></div>';

  // Unsubscribe previous listener for this folder
  if (_galListeners[folder]) {
    _galListeners[folder]();
    delete _galListeners[folder];
  }

  _galListeners[folder] = ADMIN_COLS.gallery()
    .where('folder', '==', folder)
    .orderBy('timestamp', 'desc')
    .onSnapshot(snap => {
      grid.innerHTML = '';

      if (snap.empty) {
        grid.innerHTML = '<div class="adm-gal-empty">No images yet. Upload some above.</div>';
        // Also update the public GAL_DATA
        updatePublicGalData(folder, []);
        return;
      }

      const images = [];
      snap.docs.forEach(doc => {
        const img = doc.data();
        images.push({ src: img.src, srcHigh: img.src, title: img.title });

        const wrap = document.createElement('div');
        wrap.className = 'adm-gal-img-wrap';
        wrap.innerHTML = `
          <img src="${escHtml(img.src)}" alt="${escHtml(img.title || '')}" loading="lazy">
          <button class="adm-gal-del-btn" onclick="adminDeleteGalleryImg('${doc.id}', '${escHtml(img.src)}', '${escHtml(folder)}')" title="Delete">✕</button>
        `;
        grid.appendChild(wrap);
      });

      // Update public GAL_DATA so gallery tab reflects changes
      updatePublicGalData(folder, images);
    });
}

function updatePublicGalData(folder, images) {
  if (typeof GAL_DATA !== 'undefined') {
    GAL_DATA[folder] = images;
    if (typeof updateFolderCounts === 'function') updateFolderCounts();
    // If gallery folder is currently open, refresh it
    if (typeof currentFolder !== 'undefined' && currentFolder === folder) {
      if (typeof openGalFolder === 'function') openGalFolder(folder, false);
    }
  }
}

async function handleGalleryUpload(folder, files) {
  const grid = document.getElementById(`adm-gal-grid-${folder}`);

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      showToast(`Skipped ${file.name} — not an image.`, 'err');
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 10MB).`, 'err');
      continue;
    }

    // Create placeholder with progress
    const placeholder = document.createElement('div');
    placeholder.className = 'adm-gal-img-wrap';
    placeholder.innerHTML = `
      <div class="adm-gal-uploading">
        <div class="adm-spinner-sm"></div>
        <div class="adm-gal-uploading-bar"><div class="adm-gal-uploading-fill" id="fill-${file.name.replace(/\W/g,'')}" style="width:0%"></div></div>
      </div>
    `;
    grid.insertBefore(placeholder, grid.firstChild);

    try {
      const timestamp = Date.now();
      const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path      = `gallery/${folder}/${timestamp}_${safeName}`;
      const ref       = fstorage.ref(path);
      const task      = ref.put(file);

      task.on('state_changed', snap => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        const fill = document.getElementById(`fill-${file.name.replace(/\W/g,'')}`);
        if (fill) fill.style.width = pct + '%';
      });

      await task;
      const url = await ref.getDownloadURL();

      // Save metadata to Firestore
      await ADMIN_COLS.gallery().add({
        folder,
        src:       url,
        title:     file.name.replace(/\.[^.]+$/, ''),
        storagePath: path,
        uploadedBy: dcUser?.id || 'unknown',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });

      placeholder.remove();
      showToast(`✅ ${file.name} uploaded!`);

    } catch (err) {
      placeholder.remove();
      console.error('[GALLERY] Upload error:', err);
      showToast(`❌ Failed to upload ${file.name}`, 'err');
    }
  }
}

async function adminDeleteGalleryImg(docId, src, folder) {
  if (!confirm('Delete this image? This cannot be undone.')) return;

  try {
    // Delete from Firestore
    await ADMIN_COLS.gallery().doc(docId).delete();

    // Try to delete from Storage (may fail if path not stored — non-fatal)
    try {
      const storageRef = fstorage.refFromURL(src);
      await storageRef.delete();
    } catch (_) {}

    showToast('🗑️ Image deleted.');
  } catch (err) {
    console.error('[GALLERY] Delete error:', err);
    showToast('❌ Error deleting image.', 'err');
  }
}

// ════════════════════════════════════════════════════════════════════════
//  APPLICATIONS PANEL
// ════════════════════════════════════════════════════════════════════════

async function loadApplications() {
  const list    = document.getElementById('adm-apps-list');
  const loading = document.getElementById('adm-apps-loading');
  const empty   = document.getElementById('adm-apps-empty');
  if (!list) return;

  list.innerHTML = '';
  loading.style.display = 'flex';
  empty.style.display   = 'none';

  if (_unsubApps) _unsubApps();

  let q = ADMIN_COLS.applications().orderBy('timestamp', 'desc');
  if (_appsCurrentFilter !== 'all') q = q.where('status', '==', _appsCurrentFilter);

  _unsubApps = q.onSnapshot(snap => {
    loading.style.display = 'none';
    list.innerHTML = '';

    if (snap.empty) {
      empty.style.display = 'flex';
      document.getElementById('adm-badge-apps').textContent = '0';
      return;
    }

    const pending = snap.docs.filter(d => (d.data().status || 'pending') === 'pending').length;
    document.getElementById('adm-badge-apps').textContent = pending;

    snap.docs.forEach(doc => {
      list.appendChild(buildAppCard(doc.id, doc.data()));
    });
  });
}

function buildAppCard(id, a) {
  const card = document.createElement('div');
  card.className = 'adm-app-card';
  const ts = a.timestamp?.toDate?.() ?? new Date();
  const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const status = a.status || 'pending';
  const statusClass = `adm-status-${status}`;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  card.innerHTML = `
    <div class="adm-app-top">
      <div class="adm-app-who">
        <div>
          <div class="adm-app-name">${escHtml(a.displayName || a.username || 'Unknown')}</div>
          <div class="adm-app-handle">@${escHtml(a.username || '—')} · ${escHtml(a.discord || '—')}</div>
        </div>
      </div>
      <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;">
        <div class="adm-app-pos">${escHtml(a.position || 'N/A')}</div>
        <div class="adm-status-pill ${statusClass}">${statusLabel}</div>
      </div>
    </div>

    <div class="adm-app-fields">
      <div class="adm-app-field">
        <div class="adm-app-field-label">Age</div>
        <div class="adm-app-field-val">${escHtml(String(a.age || '—'))}</div>
      </div>
      <div class="adm-app-field">
        <div class="adm-app-field-label">Timezone</div>
        <div class="adm-app-field-val">${escHtml(a.timezone || '—')}</div>
      </div>
      <div class="adm-app-field">
        <div class="adm-app-field-label">Server Tenure</div>
        <div class="adm-app-field-val">${escHtml(a.tenure || '—')}</div>
      </div>
      <div class="adm-app-field">
        <div class="adm-app-field-label">Hrs / Week</div>
        <div class="adm-app-field-val">${escHtml(a.hoursPerWeek || '—')}</div>
      </div>
      <div class="adm-app-field">
        <div class="adm-app-field-label">Applied</div>
        <div class="adm-app-field-val">${dateStr}</div>
      </div>
      <div class="adm-app-field">
        <div class="adm-app-field-label">User ID</div>
        <div class="adm-app-field-val" style="font-family:monospace;font-size:.8rem;">${escHtml(a.userId || '—')}</div>
      </div>
    </div>

    ${buildEssayBlock(id, 'Prior Experience', a.experience, 'exp')}
    ${buildEssayBlock(id, 'Why Join the Team?', a.why, 'why')}
    ${buildEssayBlock(id, 'Conflict Scenario', a.scenario, 'scen')}
    ${a.extra ? buildEssayBlock(id, 'Additional Info', a.extra, 'extra') : ''}

    <div class="adm-theory-actions">
      ${status !== 'accepted' ? `<button class="adm-btn adm-btn-approve" onclick="adminUpdateApp('${id}','accepted')">✅ Accept</button>` : ''}
      ${status !== 'rejected' ? `<button class="adm-btn adm-btn-reject" onclick="adminUpdateApp('${id}','rejected')">❌ Reject</button>` : ''}
      ${status !== 'reviewed' ? `<button class="adm-btn adm-btn-neutral" onclick="adminUpdateApp('${id}','reviewed')">👁 Mark Reviewed</button>` : ''}
      <button class="adm-btn adm-btn-delete" onclick="adminDeleteApp('${id}')">🗑️ Delete</button>
    </div>
  `;

  return card;
}

function buildEssayBlock(id, label, text, key) {
  if (!text) return '';
  return `
    <div class="adm-app-essay">
      <div class="adm-app-essay-label">${escHtml(label)}</div>
      <div class="adm-app-essay-text" id="essay-${id}-${key}">${escHtml(text)}</div>
      <button style="font-size:.75rem;color:var(--accent);background:none;border:none;cursor:pointer;padding:0;margin-top:.3rem;"
        onclick="this.previousElementSibling.classList.toggle('expanded');this.textContent=this.previousElementSibling.classList.contains('expanded')?'Read less ▴':'Read more ▾'">Read more ▾</button>
    </div>
  `;
}

async function adminUpdateApp(appId, newStatus) {
  try {
    await ADMIN_COLS.applications().doc(appId).update({
      status:     newStatus,
      reviewedBy: dcUser?.id || 'website',
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    const labels = { accepted: 'accepted ✅', rejected: 'rejected ❌', reviewed: 'marked reviewed 👁' };
    showToast(`Application ${labels[newStatus] || 'updated'}.`);
  } catch (err) {
    console.error('[ADMIN] App update error:', err);
    showToast('❌ Error updating application.', 'err');
  }
}

async function adminDeleteApp(appId) {
  if (!confirm('Permanently delete this application?')) return;
  try {
    await ADMIN_COLS.applications().doc(appId).delete();
    showToast('🗑️ Application deleted.');
  } catch (err) {
    console.error('[ADMIN] App delete error:', err);
    showToast('❌ Error deleting application.', 'err');
  }
}

// ════════════════════════════════════════════════════════════════════════
//  SETTINGS PANEL
// ════════════════════════════════════════════════════════════════════════

async function loadSettings() {
  try {
    const snap = await ADMIN_COLS.settings().get();
    const applicationsOpen = snap.exists ? (snap.data().applicationsOpen ?? true) : true;
    updateAppStatusUI(applicationsOpen);
  } catch (err) {
    console.error('[ADMIN] Load settings error:', err);
  }
}

function updateAppStatusUI(isOpen) {
  const label = document.getElementById('adm-apps-status-label');
  const btn   = document.getElementById('adm-toggle-apps-btn');
  if (label) {
    label.textContent  = isOpen ? 'OPEN' : 'CLOSED';
    label.className    = `adm-setting-status ${isOpen ? 'open' : 'closed'}`;
  }
  if (btn) {
    btn.textContent = isOpen ? '⛔ Close Applications' : '✅ Open Applications';
    btn.disabled    = false;
  }
}

async function adminToggleApplications() {
  const btn = document.getElementById('adm-toggle-apps-btn');
  if (btn) btn.disabled = true;

  try {
    const snap = await ADMIN_COLS.settings().get();
    const current = snap.exists ? (snap.data().applicationsOpen ?? true) : true;
    await ADMIN_COLS.settings().set({ applicationsOpen: !current }, { merge: true });
    updateAppStatusUI(!current);
    updateApplyFormVisibility(!current);
    showToast(`Applications ${!current ? 'opened ✅' : 'closed ⛔'}`);
  } catch (err) {
    console.error('[ADMIN] Toggle error:', err);
    showToast('❌ Error toggling applications.', 'err');
    if (btn) btn.disabled = false;
  }
}

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC THEORY DISPLAY (Approved theories list on theories tab)
// ════════════════════════════════════════════════════════════════════════

async function loadApprovedTheoriesPublic() {
  const list  = document.getElementById('theories-list');
  const empty = document.getElementById('theories-empty');
  if (!list) return;

  try {
    const snap = await ADMIN_COLS.theories()
      .where('status', '==', 'approved')
      .orderBy('timestamp', 'desc')
      .get();

    list.innerHTML = '';

    if (snap.empty) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    snap.docs.forEach(doc => {
      const t = doc.data();
      const ts = t.timestamp?.toDate?.() ?? new Date();
      const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const card = document.createElement('div');
      card.className = 'th-card';
      const avatarHtml = t.avatar
        ? `<img src="https://cdn.discordapp.com/avatars/${t.userId}/${t.avatar}.png?size=64" class="th-card-av" alt="">`
        : `<div class="th-card-av-ph">${(t.displayName || '?')[0]}</div>`;

      card.innerHTML = `
        <div class="th-card-head">
          ${avatarHtml}
          <div class="th-card-user">
            <div class="th-card-name">${escHtml(t.displayName || t.username || 'Unknown')}</div>
            <div class="th-card-date">${dateStr}</div>
          </div>
          <span class="th-tag">${escHtml(t.tag || 'Theory')}</span>
        </div>
        <div class="th-card-title">${escHtml(t.title || 'Untitled')}</div>
        <div class="th-card-body">${escHtml((t.body || '').substring(0, 220))}${t.body?.length > 220 ? '…' : ''}</div>
        ${t.chapters ? `<div class="th-card-chap">📖 ${escHtml(t.chapters)}</div>` : ''}
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error('[THEORIES] Load approved error:', err);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  APPLY FORM — read settings on load, hide/show based on applicationsOpen
// ════════════════════════════════════════════════════════════════════════

async function checkApplicationsOpen() {
  try {
    const snap = await ADMIN_COLS.settings().get();
    const isOpen = snap.exists ? (snap.data().applicationsOpen ?? true) : true;
    updateApplyFormVisibility(isOpen);
  } catch (_) {
    // Firestore may not be available — show form by default
    updateApplyFormVisibility(true);
  }
}

function updateApplyFormVisibility(isOpen) {
  const form = document.getElementById('apply-form');
  const ok   = document.getElementById('apply-ok');

  if (!form) return;

  if (!isOpen) {
    // Replace form with a closed notice
    let closed = document.getElementById('apply-closed-notice');
    if (!closed) {
      closed = document.createElement('div');
      closed.id = 'apply-closed-notice';
      closed.className = 'apply-ok';
      closed.style.display = 'block';
      closed.innerHTML = `
        <div class="ao-ico"><svg class="icon-xl" style="color:var(--text-muted);"><use href="#i-lock"/></svg></div>
        <h3>Applications Closed</h3>
        <p>Staff applications are not currently open. Follow our Discord server for announcements when the next application period begins.</p>
        <a href="https://discord.gg/gokurakugai" target="_blank" class="btn btn-dc" style="margin-top:.8rem;">Join Discord</a>
      `;
      form.parentNode.insertBefore(closed, form);
    }
    form.style.display   = 'none';
    closed.style.display = 'block';
  } else {
    const closed = document.getElementById('apply-closed-notice');
    if (closed) closed.style.display = 'none';
    form.style.display = 'block';
  }
}

// ════════════════════════════════════════════════════════════════════════
//  PATCHED submitTheory — writes to Firestore so bot picks it up
// ════════════════════════════════════════════════════════════════════════

async function submitTheory() {
  if (!dcUser) { showToast('Please log in with Discord first.', 'err'); return; }
  if (!isMember) { showToast('You must be a server member to submit theories.', 'err'); return; }

  const title    = document.getElementById('th-title')?.value?.trim();
  const tag      = document.getElementById('th-tag')?.value;
  const chapters = document.getElementById('th-chapters')?.value?.trim();
  const body     = document.getElementById('th-body')?.value?.trim();
  const spoilers = document.getElementById('th-spoilers')?.checked;
  const agree    = document.getElementById('th-agree')?.checked;

  if (!title) { showToast('Please enter a theory title.', 'err'); return; }
  if (!tag)   { showToast('Please select a category.', 'err'); return; }
  if (!body)  { showToast('Please write your theory.', 'err'); return; }
  if (!agree) { showToast('Please agree to the community guidelines.', 'err'); return; }

  const btn = document.getElementById('th-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    const docRef = await ADMIN_COLS.theories().add({
      title,
      tag,
      chapters:        chapters || 'Not specified',
      body,
      containsSpoilers: spoilers,
      userId:          dcUser.id,
      username:        dcUser.username || dcUser.global_name || '',
      displayName:     dcUser.global_name || dcUser.username || '',
      avatar:          dcUser.avatar || null,
      status:          'pending',
      discordMsgId:    null,
      source:          'website',
      timestamp:       firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast('✦ Theory submitted! The team will review it shortly.');

    // Reset form
    ['th-title','th-chapters','th-body'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['th-spoilers','th-agree'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
    const tagEl = document.getElementById('th-tag');
    if (tagEl) tagEl.selectedIndex = 0;
    document.getElementById('th-body-count') && (document.getElementById('th-body-count').textContent = '0');

  } catch (err) {
    console.error('[THEORY] Submit error:', err);
    showToast('❌ Submission failed. Please try again.', 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg class="icon icon-sm"><use href="#i-arrowright"/></svg> Submit Theory'; }
  }
}

// ════════════════════════════════════════════════════════════════════════
//  PATCHED submitApplication — writes to Firestore
// ════════════════════════════════════════════════════════════════════════

async function submitApplication(e) {
  e.preventDefault();
  if (!dcUser) { showToast('Please log in with Discord first.', 'err'); return; }
  if (!isMember) { showToast('You must be a server member to apply.', 'err'); return; }

  const btn = document.getElementById('af-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  const getVal = id => document.getElementById(id)?.value?.trim() || '';

  try {
    await ADMIN_COLS.applications().add({
      userId:      dcUser.id,
      username:    dcUser.username || '',
      displayName: dcUser.global_name || dcUser.username || '',
      discord:     getVal('af-disc'),
      age:         getVal('af-age'),
      timezone:    getVal('af-tz'),
      position:    getVal('af-pos'),
      tenure:      getVal('af-tenure'),
      hoursPerWeek: getVal('af-hours'),
      experience:  getVal('af-exp'),
      why:         getVal('af-why'),
      scenario:    getVal('af-scenario'),
      extra:       getVal('af-extra'),
      status:      'pending',
      timestamp:   firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Show success state
    document.getElementById('apply-form').style.display = 'none';
    document.getElementById('apply-ok').style.display   = 'block';

  } catch (err) {
    console.error('[APPLY] Submit error:', err);
    showToast('❌ Submission failed. Please try again.', 'err');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Application'; }
  }
}

// ════════════════════════════════════════════════════════════════════════
//  STARTUP — hook into existing page load flow
// ════════════════════════════════════════════════════════════════════════

// Load approved theories on theories tab
loadApprovedTheoriesPublic();

// Check applications open/closed
checkApplicationsOpen();

// When user logs in (existing tab activation hook — extend it)
const _origActivateTab = typeof activateTab === 'function' ? activateTab : null;
if (_origActivateTab) {
  window.activateTab = function(tabId, scroll, pushHash) {
    _origActivateTab(tabId, scroll, pushHash);
    if (tabId === 'admin') {
      verifyAdminAccess();
    }
    if (tabId === 'theories') {
      loadApprovedTheoriesPublic();
    }
  };
}

// Also trigger verify if user is already on admin tab (e.g. page reload)
if (window.location.hash.includes('admin')) {
  verifyAdminAccess();
}
