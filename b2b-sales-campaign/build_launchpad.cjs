const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function buildHtmlLaunchpad() {
  const wb = new ExcelJS.Workbook();
  const xlsxPath = path.join(__dirname, 'NEXT_CHALLENGE_INVENTORY_V2_CUSTOMER_PROSPECTS.xlsx');
  await wb.xlsx.readFile(xlsxPath);

  const sAll = wb.getWorksheet('All Prospects');
  const sEmail = wb.getWorksheet('Email Campaign');
  const sWa = wb.getWorksheet('WhatsApp Campaign');

  const emailMap = {};
  sEmail.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = row.getCell(1).value;
      emailMap[name] = {
        email: row.getCell(2).value,
        subject: row.getCell(4).value,
        fr: row.getCell(5).value,
        ar: row.getCell(6).value
      };
    }
  });

  const waMap = {};
  sWa.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = row.getCell(1).value;
      waMap[name] = {
        phone: row.getCell(2).value,
        fr: row.getCell(4).value,
        ar: row.getCell(5).value
      };
    }
  });

  const prospects = [];
  sAll.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = row.getCell(2).value;
      prospects.push({
        id: row.getCell(1).value,
        name: name,
        category: row.getCell(3).value,
        city: row.getCell(4).value,
        wilaya: row.getCell(5).value,
        address: row.getCell(6).value,
        website: row.getCell(7).value,
        email: row.getCell(10).value,
        whatsapp: row.getCell(11).value,
        phone: row.getCell(12).value,
        score: row.getCell(17).value,
        priority: row.getCell(18).value,
        benefits: row.getCell(19).value,
        emailStatus: row.getCell(22).value,
        whatsappStatus: row.getCell(23).value,
        firstContactDate: row.getCell(24).value,
        followupDate: row.getCell(25).value,
        response: row.getCell(26).value,
        interestLevel: row.getCell(27).value,
        nextAction: row.getCell(28).value,
        emailData: emailMap[name] || null,
        waData: waMap[name] || null
      });
    }
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventory V2 — B2B Sales Outreach Command Center | Next Challenge</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1E3A8A;
      --primary-dark: #172554;
      --accent: #2563EB;
      --wa-green: #059669;
      --wa-dark: #047857;
      --slate-50: #F8FAFC;
      --slate-100: #F1F5F9;
      --slate-200: #E2E8F0;
      --slate-600: #475569;
      --slate-800: #1E293B;
      --slate-900: #0F172A;
      --amber: #D97706;
      --emerald: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background-color: #0F172A; color: #F8FAFC; padding-bottom: 80px; }
    .header { background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border-bottom: 1px solid #334155; padding: 24px 32px; }
    .header-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 800; color: #FFFFFF; display: flex; align-items: center; gap: 12px; }
    .brand-badge { background: #2563EB; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
    .header-info { display: flex; gap: 20px; font-size: 13px; color: #94A3B8; }
    .header-info strong { color: #E2E8F0; }
    
    .status-alert { background: rgba(30, 41, 59, 0.9); border: 1px solid #334155; border-radius: 10px; padding: 12px 18px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .channel-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 9999px; }
    .pill-green { background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .pill-amber { background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.4); }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 16px; }
    .stat-card { background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; border-radius: 10px; padding: 14px 18px; }
    .stat-num { font-size: 22px; font-weight: 800; color: #FFFFFF; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: #94A3B8; margin-top: 4px; font-weight: 600; letter-spacing: 0.5px; }

    .container { max-width: 1500px; margin: 0 auto; padding: 24px 32px; }
    
    .filter-bar { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .filter-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-btn { background: #0F172A; border: 1px solid #334155; color: #94A3B8; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
    .filter-btn:hover { background: #334155; color: #FFF; }
    .filter-btn.active { background: #2563EB; border-color: #2563EB; color: #FFF; }
    .search-input { background: #0F172A; border: 1px solid #334155; color: #FFF; padding: 8px 16px; border-radius: 8px; font-size: 13px; width: 260px; }
    .search-input:focus { outline: none; border-color: #2563EB; }

    .lead-table-container { background: #1E293B; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    thead th { background: #0F172A; padding: 14px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; border-bottom: 1px solid #334155; }
    tbody tr { border-bottom: 1px solid #334155; transition: background 0.15s ease; }
    tbody tr:hover { background: rgba(51, 65, 85, 0.4); }
    tbody td { padding: 14px 16px; font-size: 13px; vertical-align: middle; }

    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .badge-a { background: #DCFCE7; color: #166534; }
    .badge-b { background: #FEF3C7; color: #B45309; }
    .badge-c { background: #F1F5F9; color: #475569; }
    .badge-status { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-block; }
    .status-pending { background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .status-sent { background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .status-both { background: rgba(59, 130, 246, 0.2); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.4); }

    .action-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.15s ease; border: none; }
    .btn-gmail { background: #EA4335; color: white; }
    .btn-gmail:hover { background: #C5221F; }
    .btn-wa { background: #059669; color: white; }
    .btn-wa:hover { background: #047857; }
    .btn-confirm { background: #1E3A8A; color: white; border: 1px solid #3B82F6; }
    .btn-confirm:hover { background: #2563EB; }
    .btn-drawer { background: #334155; color: #E2E8F0; }
    .btn-drawer:hover { background: #475569; }

    .status-select { background: #0F172A; border: 1px solid #475569; color: #E2E8F0; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .status-select:focus { outline: none; border-color: #2563EB; }

    .drawer-row { display: none; background: #0B1120; }
    .drawer-content { padding: 20px; border-top: 1px solid #334155; }
    .drawer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .message-card { background: #1E293B; border: 1px solid #334155; border-radius: 8px; padding: 14px; position: relative; }
    .message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    .message-title { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; }
    .btn-copy { background: #334155; border: 1px solid #475569; color: #F8FAFC; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .btn-copy:hover { background: #2563EB; border-color: #2563EB; }
    .message-body { font-size: 12px; line-height: 1.5; color: #CBD5E1; white-space: pre-line; max-height: 220px; overflow-y: auto; }
    .arabic-text { direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; font-size: 13px; }

    .toast { position: fixed; bottom: 20px; right: 20px; background: #10B981; color: white; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); opacity: 0; transform: translateY(10px); transition: all 0.2s ease; pointer-events: none; z-index: 9999; }
    .toast.show { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>

  <header class="header">
    <div class="header-top">
      <div>
        <div class="brand-title">
          <span>Inventory V2</span>
          <span class="brand-badge">B2B Sales Outreach Command Center</span>
        </div>
        <p style="font-size: 13px; color: #94A3B8; margin-top: 4px;">Campagne de prospection commerciale directe — Next Challenge (Cité El Hidhab, Sétif)</p>
      </div>
      <div class="header-info">
        <div>Émetteur Gmail : <strong>nextchallenge2021@gmail.com</strong></div>
        <div>WhatsApp Officiel : <strong>+213 552 56 96 54</strong></div>
        <div>Démo En Ligne : <a href="https://inventory-v2-web-demo.onrender.com" target="_blank" style="color: #60A5FA; text-decoration: underline;">inventory-v2-web-demo.onrender.com</a></div>
      </div>
    </div>

    <div class="status-alert">
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <span class="channel-pill pill-green">🟢 Gmail Connecté & Vérifié (nextchallenge2021@gmail.com)</span>
        <span class="channel-pill pill-amber">📱 WhatsApp Web : Session active dans Chrome (vérifier appairage +213 552 56 96 54)</span>
      </div>
      <button class="btn-action" style="background: #2563EB; color: white;" onclick="launchNextSetifBatch()">🚀 Ouvrir le prochain prospect Sétif dans Gmail</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num" id="stat-total">75</div>
        <div class="stat-label">Entreprises Traitées</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" style="color: #34D399;">58</div>
        <div class="stat-label">Haute Priorité (A)</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" style="color: #60A5FA;">42</div>
        <div class="stat-label">Sétif & El Eulma Core</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="stat-emails" style="color: #F87171;">0 / 54</div>
        <div class="stat-label">Emails Envoyés</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="stat-wa" style="color: #4ADE80;">0 / 64</div>
        <div class="stat-label">WhatsApp Envoyés</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="stat-demo" style="color: #FBBF24;">0</div>
        <div class="stat-label">Démos Planifiées</div>
      </div>
    </div>
  </header>

  <div class="container">
    <div class="filter-bar">
      <div class="filter-buttons">
        <button class="filter-btn active" onclick="applyFilter('all')">Tous les Prospects (75)</button>
        <button class="filter-btn" onclick="applyFilter('setif')">📍 Sétif & El Eulma Core (42)</button>
        <button class="filter-btn" onclick="applyFilter('p-a')">Priorité A (58)</button>
        <button class="filter-btn" onclick="applyFilter('has-email')">Avec Email (54)</button>
        <button class="filter-btn" onclick="applyFilter('has-wa')">Avec WhatsApp (64)</button>
      </div>
      <input type="text" id="searchInput" class="search-input" placeholder="Rechercher par nom, ville, secteur..." oninput="handleSearch()">
    </div>

    <div class="lead-table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 70px;">ID</th>
            <th>Entreprise & Coordonnées</th>
            <th>Secteur Métier</th>
            <th>Ville / Wilaya</th>
            <th style="width: 70px; text-align: center;">Prio.</th>
            <th style="width: 220px;">1-Clic Compose</th>
            <th style="width: 200px;">Confirmation d'Envoi</th>
            <th style="width: 50px; text-align: center;">Aperçu</th>
          </tr>
        </thead>
        <tbody id="prospectsTableBody">
          <!-- Populated by JavaScript -->
        </tbody>
      </table>
    </div>
  </div>

  <div id="toast" class="toast">Action effectuée avec succès !</div>

  <script>
    let PROSPECTS = ${JSON.stringify(prospects, null, 2)};
    let currentFilter = 'setif'; // Default to Setif & El Eulma
    let searchQuery = '';

    // Initialize filter button states
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.textContent.includes('Sétif')) btn.classList.add('active');
        else btn.classList.remove('active');
      });
      syncWithServer();
    });

    async function syncWithServer() {
      try {
        const res = await fetch('http://localhost:3300/api/prospects');
        if (res.ok) {
          const data = await res.json();
          if (data.prospects) {
            PROSPECTS = data.prospects;
            renderTable();
            updateStatsUI();
          }
        }
      } catch (e) {
        // Fallback to local storage
        renderTable();
        updateStatsUI();
      }
    }

    function getLeadStatus(id) {
      const p = PROSPECTS.find(x => x.id === id);
      const saved = localStorage.getItem('lead_status_' + id);
      if (saved) return saved;
      if (p && p.emailStatus && p.emailStatus.includes('sent')) return 'Email sent';
      if (p && p.whatsappStatus && p.whatsappStatus.includes('sent')) return 'WhatsApp sent';
      return 'Pending authentication';
    }

    async function openMail(id, lang = 'fr') {
      const p = PROSPECTS.find(x => x.id === id);
      if (!p || !p.emailData) return;

      const bodyText = lang === 'ar' ? p.emailData.ar : p.emailData.fr;
      const composeUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(p.emailData.email) + '&su=' + encodeURIComponent(p.emailData.subject) + '&body=' + encodeURIComponent(bodyText);

      try {
        await fetch('http://localhost:3300/api/open-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, lang })
        });
        showToast('Fenêtre Gmail ouverte pour ' + p.name);
      } catch (e) {
        window.open(composeUrl, '_blank');
      }
    }

    async function openWhatsApp(id, lang = 'fr') {
      const p = PROSPECTS.find(x => x.id === id);
      if (!p || !p.waData) return;

      const cleanPhone = p.waData.phone.replace(/[^0-9]/g, '');
      const bodyText = lang === 'ar' ? p.waData.ar : p.waData.fr;
      const waUrl = 'https://web.whatsapp.com/send?phone=' + cleanPhone + '&text=' + encodeURIComponent(bodyText);

      try {
        await fetch('http://localhost:3300/api/open-wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, lang })
        });
        showToast('Discussion WhatsApp ouverte pour ' + p.name);
      } catch (e) {
        window.open(waUrl, '_blank');
      }
    }

    async function confirmSend(id, channel) {
      localStorage.setItem('lead_status_' + id, channel === 'both' ? 'Both channels sent' : (channel === 'email' ? 'Email sent' : 'WhatsApp sent'));

      const p = PROSPECTS.find(x => x.id === id);
      if (p) {
        if (channel === 'email' || channel === 'both') p.emailStatus = 'Email sent';
        if (channel === 'whatsapp' || channel === 'both') p.whatsappStatus = 'WhatsApp sent';
      }

      try {
        await fetch('http://localhost:3300/api/confirm-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, channel })
        });
        showToast('Envoi confirmé & classeur Excel mis à jour pour ' + (p ? p.name : id));
      } catch (e) {
        showToast('Envoi enregistré localement pour ' + (p ? p.name : id));
      }

      renderTable();
      updateStatsUI();
    }

    async function updateLeadStatus(id, newStatus) {
      localStorage.setItem('lead_status_' + id, newStatus);
      const p = PROSPECTS.find(x => x.id === id);
      if (p) {
        p.interestLevel = newStatus;
        if (newStatus.includes('sent') || newStatus.includes('Sent')) {
          if (newStatus.includes('Email')) p.emailStatus = 'Email sent';
          if (newStatus.includes('WhatsApp')) p.whatsappStatus = 'WhatsApp sent';
        }
      }

      try {
        await fetch('http://localhost:3300/api/confirm-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, channel: 'email', interest: newStatus })
        });
      } catch (e) {}

      showToast('Statut mis à jour : ' + newStatus);
      renderTable();
      updateStatsUI();
    }

    function launchNextSetifBatch() {
      const nextLead = PROSPECTS.find(p => {
        const isSetif = p.city.toLowerCase().includes('sétif') || p.city.toLowerCase().includes('eulma');
        const st = getLeadStatus(p.id);
        return isSetif && p.emailData && !st.includes('sent') && !st.includes('Sent');
      });

      if (nextLead) {
        openMail(nextLead.id, 'fr');
        showToast('Ouverture de ' + nextLead.name + ' (' + nextLead.city + ')');
      } else {
        showToast('Tous les prospects de Sétif et El Eulma ont été traités !');
      }
    }

    function updateStatsUI() {
      let emailCount = 0;
      let waCount = 0;
      let demoCount = 0;

      PROSPECTS.forEach(p => {
        const st = getLeadStatus(p.id);
        if (st.includes('Email') || st.includes('Both')) emailCount++;
        if (st.includes('WhatsApp') || st.includes('Both')) waCount++;
        if (st.includes('Demo') || st.includes('Démo') || (p.interestLevel && p.interestLevel.includes('Demo'))) demoCount++;
      });

      document.getElementById('stat-emails').textContent = emailCount + ' / 54';
      document.getElementById('stat-wa').textContent = waCount + ' / 64';
      document.getElementById('stat-demo').textContent = demoCount;
    }

    function toggleDrawer(id) {
      const row = document.getElementById('drawer_' + id);
      if (row.style.display === 'table-row') {
        row.style.display = 'none';
      } else {
        row.style.display = 'table-row';
      }
    }

    function copyToClipboard(text, label) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(label + ' copié dans le presse-papier !');
      }).catch(err => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(label + ' copié !');
      });
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    }

    function applyFilter(f) {
      currentFilter = f;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      renderTable();
    }

    function handleSearch() {
      searchQuery = document.getElementById('searchInput').value.toLowerCase();
      renderTable();
    }

    function renderTable() {
      const tbody = document.getElementById('prospectsTableBody');
      tbody.innerHTML = '';

      const filtered = PROSPECTS.filter(p => {
        if (currentFilter === 'p-a' && p.priority !== 'A') return false;
        if (currentFilter === 'setif' && !p.city.toLowerCase().includes('sétif') && !p.city.toLowerCase().includes('eulma')) return false;
        if (currentFilter === 'has-email' && (!p.email || p.email.trim() === '')) return false;
        if (currentFilter === 'has-wa' && (!p.whatsapp || p.whatsapp.trim() === '')) return false;

        if (searchQuery) {
          const matchName = p.name.toLowerCase().includes(searchQuery);
          const matchCity = p.city.toLowerCase().includes(searchQuery);
          const matchCat = p.category.toLowerCase().includes(searchQuery);
          if (!matchName && !matchCity && !matchCat) return false;
        }
        return true;
      });

      filtered.forEach(p => {
        const tr = document.createElement('tr');
        const prioBadge = p.priority === 'A' ? 'badge-a' : (p.priority === 'B' ? 'badge-b' : 'badge-c');
        const status = getLeadStatus(p.id);

        let statusClass = 'status-pending';
        if (status.includes('Both')) statusClass = 'status-both';
        else if (status.includes('sent') || status.includes('Sent')) statusClass = 'status-sent';

        let emailAction = '';
        if (p.emailData) {
          emailAction = \`<button class="btn-action btn-gmail" onclick="openMail('\${p.id}', 'fr')" title="Ouvrir dans Gmail">📧 Gmail</button>\`;
        }

        let waAction = '';
        if (p.waData) {
          waAction = \`<button class="btn-action btn-wa" onclick="openWhatsApp('\${p.id}', 'fr')" title="Ouvrir dans WhatsApp Web">💬 WhatsApp</button>\`;
        }

        let confirmButtons = '';
        if (p.emailData && p.waData) {
          confirmButtons = \`
            <div style="display: flex; gap: 4px;">
              <button class="btn-action btn-confirm" style="font-size: 11px; padding: 4px 8px;" onclick="confirmSend('\${p.id}', 'email')">✓ Mail</button>
              <button class="btn-action btn-confirm" style="font-size: 11px; padding: 4px 8px;" onclick="confirmSend('\${p.id}', 'whatsapp')">✓ WA</button>
              <button class="btn-action btn-confirm" style="font-size: 11px; padding: 4px 8px; background: #059669; border-color: #10B981;" onclick="confirmSend('\${p.id}', 'both')">✓ 2 Envois</button>
            </div>
          \`;
        } else if (p.emailData) {
          confirmButtons = \`<button class="btn-action btn-confirm" style="font-size: 11px; padding: 4px 10px;" onclick="confirmSend('\${p.id}', 'email')">✓ Confirmer Email Envoyé</button>\`;
        } else if (p.waData) {
          confirmButtons = \`<button class="btn-action btn-confirm" style="font-size: 11px; padding: 4px 10px;" onclick="confirmSend('\${p.id}', 'whatsapp')">✓ Confirmer WhatsApp Envoyé</button>\`;
        }

        tr.innerHTML = \`
          <td><strong style="color: #60A5FA; font-size: 12px;">\${p.id}</strong></td>
          <td>
            <div style="font-weight: 700; color: #FFF;">\${p.name}</div>
            <div style="font-size: 11px; color: #94A3B8;">\${p.address}</div>
            <div style="font-size: 11px; color: #38BDF8; margin-top: 2px;">
              \${p.email ? '✉ ' + p.email : ''} \${p.whatsapp ? ' | ✆ ' + p.whatsapp : ''}
            </div>
          </td>
          <td>\${p.category}</td>
          <td>\${p.city} <span style="font-size: 11px; color: #94A3B8;">(\${p.wilaya})</span></td>
          <td style="text-align: center;"><span class="badge \${prioBadge}">\${p.priority}</span></td>
          <td>
            <div class="action-group">
              \${emailAction}
              \${waAction}
            </div>
          </td>
          <td>
            <div style="margin-bottom: 6px;">
              <span class="badge-status \${statusClass}">\${status}</span>
            </div>
            \${confirmButtons}
          </td>
          <td style="text-align: center;">
            <button class="btn-action btn-drawer" onclick="toggleDrawer('\${p.id}')">👁️</button>
          </td>
        \`;
        tbody.appendChild(tr);

        // Drawer row for messages preview
        const drawerTr = document.createElement('tr');
        drawerTr.id = 'drawer_' + p.id;
        drawerTr.className = 'drawer-row';

        let emailBlock = '<div class="message-card"><p style="color: #94A3B8; font-size: 12px;">Aucun email professionnel officiel répertorié.</p></div>';
        if (p.emailData) {
          emailBlock = \`
            <div class="message-card">
              <div class="message-header">
                <span class="message-title">📧 Email Français : \${p.emailData.email}</span>
                <div>
                  <button class="btn-copy" onclick="openMail('\${p.id}', 'fr')">🚀 Ouvrir Gmail FR</button>
                  <button class="btn-copy" onclick="copyToClipboard(PROSPECTS.find(x=>x.id==='\${p.id}').emailData.fr, 'Email Français')">📋 Copier</button>
                </div>
              </div>
              <div class="message-body">\${p.emailData.fr}</div>
              <div class="message-header" style="margin-top: 14px;">
                <span class="message-title">📧 البريد الإلكتروني بالعربية</span>
                <div>
                  <button class="btn-copy" onclick="openMail('\${p.id}', 'ar')">🚀 فتح Gmail بالعربية</button>
                  <button class="btn-copy" onclick="copyToClipboard(PROSPECTS.find(x=>x.id==='\${p.id}').emailData.ar, 'Email Arabe')">📋 نسخ</button>
                </div>
              </div>
              <div class="message-body arabic-text">\${p.emailData.ar}</div>
            </div>
          \`;
        }

        let waBlock = '<div class="message-card"><p style="color: #94A3B8; font-size: 12px;">Aucun numéro WhatsApp officiel répertorié.</p></div>';
        if (p.waData) {
          waBlock = \`
            <div class="message-card">
              <div class="message-header">
                <span class="message-title">💬 Message WhatsApp FR (\${p.waData.phone})</span>
                <div>
                  <button class="btn-copy" onclick="openWhatsApp('\${p.id}', 'fr')">🚀 Ouvrir WhatsApp FR</button>
                  <button class="btn-copy" onclick="copyToClipboard(PROSPECTS.find(x=>x.id==='\${p.id}').waData.fr, 'Message WhatsApp FR')">📋 Copier</button>
                </div>
              </div>
              <div class="message-body">\${p.waData.fr}</div>
              <div class="message-header" style="margin-top: 14px;">
                <span class="message-title">💬 رسالة واتساب بالعربية</span>
                <div>
                  <button class="btn-copy" onclick="openWhatsApp('\${p.id}', 'ar')">🚀 فتح واتساب بالعربية</button>
                  <button class="btn-copy" onclick="copyToClipboard(PROSPECTS.find(x=>x.id==='\${p.id}').waData.ar, 'Message WhatsApp AR')">📋 نسخ</button>
                </div>
              </div>
              <div class="message-body arabic-text">\${p.waData.ar}</div>
            </div>
          \`;
        }

        drawerTr.innerHTML = \`
          <td colspan="8" style="padding: 0;">
            <div class="drawer-content">
              <div style="margin-bottom: 12px; font-size: 12px; color: #94A3B8;">
                <strong style="color: #60A5FA;">Argumentation Clé pour \${p.name} :</strong> \${p.benefits} | 
                <strong style="color: #FBBF24;">Action Recommandée :</strong> \${p.nextAction}
              </div>
              <div class="drawer-grid">
                \${emailBlock}
                \${waBlock}
              </div>
            </div>
          </td>
        \`;
        tbody.appendChild(drawerTr);
      });
    }

    renderTable();
    updateStatsUI();
  </script>
</body>
</html>`;

  const outHtmlPath1 = path.join(__dirname, 'CAMPAIGN_LAUNCHPAD.html');
  const outHtmlPath2 = path.join(__dirname, '..', 'CAMPAIGN_LAUNCHPAD.html');
  fs.writeFileSync(outHtmlPath1, html, 'utf8');
  fs.writeFileSync(outHtmlPath2, html, 'utf8');
  console.log('Launchpad generated successfully at:', outHtmlPath1);
}

buildHtmlLaunchpad().catch(console.error);
