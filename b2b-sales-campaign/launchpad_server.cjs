const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ExcelJS = require('exceljs');

const PORT = 3300;
const CAMPAIGN_DIR = __dirname;
const ROOT_DIR = path.join(__dirname, '..');
const EXCEL_PATH = path.join(CAMPAIGN_DIR, 'NEXT_CHALLENGE_INVENTORY_V2_CUSTOMER_PROSPECTS.xlsx');
const ROOT_EXCEL_PATH = path.join(ROOT_DIR, 'NEXT_CHALLENGE_INVENTORY_V2_CUSTOMER_PROSPECTS.xlsx');
const REPORT_PATH = path.join(CAMPAIGN_DIR, 'INVENTORY_V2_OUTREACH_ACTIVITY_REPORT.md');
const ROOT_REPORT_PATH = path.join(ROOT_DIR, 'INVENTORY_V2_OUTREACH_ACTIVITY_REPORT.md');

let cachedProspects = null;

async function loadProspects() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const sAll = wb.getWorksheet('All Prospects');
  const sEmail = wb.getWorksheet('Email Campaign');
  const sWa = wb.getWorksheet('WhatsApp Campaign');

  const emailMap = {};
  sEmail.eachRow((r, i) => {
    if (i > 1) {
      emailMap[r.getCell(1).value] = {
        email: r.getCell(2).value,
        subject: r.getCell(4).value,
        fr: r.getCell(5).value,
        ar: r.getCell(6).value,
        status: r.getCell(7).value,
        dateSent: r.getCell(8).value
      };
    }
  });

  const waMap = {};
  sWa.eachRow((r, i) => {
    if (i > 1) {
      waMap[r.getCell(1).value] = {
        phone: r.getCell(2).value,
        fr: r.getCell(4).value,
        ar: r.getCell(5).value,
        status: r.getCell(6).value,
        dateSent: r.getCell(7).value
      };
    }
  });

  const prospects = [];
  sAll.eachRow((r, i) => {
    if (i > 1) {
      const name = r.getCell(2).value;
      prospects.push({
        id: r.getCell(1).value,
        name: name,
        category: r.getCell(3).value,
        city: r.getCell(4).value,
        wilaya: r.getCell(5).value,
        address: r.getCell(6).value,
        website: r.getCell(7).value,
        email: r.getCell(10).value,
        whatsapp: r.getCell(11).value,
        phone: r.getCell(12).value,
        score: r.getCell(17).value,
        priority: r.getCell(18).value,
        benefits: r.getCell(19).value,
        emailStatus: r.getCell(22).value,
        whatsappStatus: r.getCell(23).value,
        firstContactDate: r.getCell(24).value,
        followupDate: r.getCell(25).value,
        response: r.getCell(26).value,
        interestLevel: r.getCell(27).value,
        nextAction: r.getCell(28).value,
        emailData: emailMap[name] || null,
        waData: waMap[name] || null
      });
    }
  });

  cachedProspects = prospects;
  return prospects;
}

async function updateProspectInWorkbook(leadId, updates) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const sAll = wb.getWorksheet('All Prospects');
  const sEmail = wb.getWorksheet('Email Campaign');
  const sWa = wb.getWorksheet('WhatsApp Campaign');
  const sHigh = wb.getWorksheet('High Priority Leads');
  const sStats = wb.getWorksheet('Campaign Statistics');

  let targetName = '';

  // Update All Prospects
  sAll.eachRow((r, i) => {
    if (i > 1 && r.getCell(1).value === leadId) {
      targetName = r.getCell(2).value;
      if (updates.emailStatus) r.getCell(22).value = updates.emailStatus;
      if (updates.whatsappStatus) r.getCell(23).value = updates.whatsappStatus;
      if (updates.firstContactDate) r.getCell(24).value = updates.firstContactDate;
      if (updates.followupDate) r.getCell(25).value = updates.followupDate;
      if (updates.response) r.getCell(26).value = updates.response;
      if (updates.interestLevel) r.getCell(27).value = updates.interestLevel;
      if (updates.nextAction) r.getCell(28).value = updates.nextAction;
    }
  });

  // Update High Priority Leads
  if (sHigh) {
    sHigh.eachRow((r, i) => {
      if (i > 1 && r.getCell(1).value === leadId) {
        if (updates.emailStatus) r.getCell(22).value = updates.emailStatus;
        if (updates.whatsappStatus) r.getCell(23).value = updates.whatsappStatus;
        if (updates.firstContactDate) r.getCell(24).value = updates.firstContactDate;
        if (updates.followupDate) r.getCell(25).value = updates.followupDate;
        if (updates.response) r.getCell(26).value = updates.response;
        if (updates.interestLevel) r.getCell(27).value = updates.interestLevel;
        if (updates.nextAction) r.getCell(28).value = updates.nextAction;
      }
    });
  }

  // Update Email Campaign sheet
  if (targetName && sEmail) {
    sEmail.eachRow((r, i) => {
      if (i > 1 && r.getCell(1).value === targetName) {
        if (updates.emailStatus) r.getCell(7).value = updates.emailStatus;
        if (updates.firstContactDate) r.getCell(8).value = updates.firstContactDate;
        if (updates.response) r.getCell(9).value = updates.response;
        if (updates.followupDate) r.getCell(10).value = updates.followupDate;
      }
    });
  }

  // Update WhatsApp Campaign sheet
  if (targetName && sWa) {
    sWa.eachRow((r, i) => {
      if (i > 1 && r.getCell(1).value === targetName) {
        if (updates.whatsappStatus) r.getCell(6).value = updates.whatsappStatus;
        if (updates.firstContactDate) r.getCell(7).value = updates.firstContactDate;
        if (updates.response) r.getCell(8).value = updates.response;
        if (updates.followupDate) r.getCell(9).value = updates.followupDate;
      }
    });
  }

  // Recalculate stats
  let emailsSent = 0;
  let waSent = 0;
  let interestedCount = 0;
  let demoCount = 0;

  sAll.eachRow((r, i) => {
    if (i > 1) {
      const eStatus = r.getCell(22).value || '';
      const wStatus = r.getCell(23).value || '';
      const interest = r.getCell(27).value || '';
      if (eStatus.includes('sent') || eStatus.includes('Sent')) emailsSent++;
      if (wStatus.includes('sent') || wStatus.includes('Sent')) waSent++;
      if (interest.includes('Interested') || interest.includes('Intéressé')) interestedCount++;
      if (interest.includes('Demo') || interest.includes('Démo')) demoCount++;
    }
  });

  if (sStats) {
    sStats.getCell('C8').value = emailsSent;
    sStats.getCell('C9').value = waSent;
    sStats.getCell('C14').value = interestedCount;
    sStats.getCell('C15').value = demoCount;
  }

  await wb.xlsx.writeFile(EXCEL_PATH);
  await wb.xlsx.writeFile(ROOT_EXCEL_PATH);

  // Reload cache
  await loadProspects();
  return { success: true, emailsSent, waSent, interestedCount, demoCount };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve static HTML launchpad
  if (pathname === '/' || pathname === '/index.html') {
    const htmlPath = path.join(CAMPAIGN_DIR, 'CAMPAIGN_LAUNCHPAD.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(htmlPath).pipe(res);
      return;
    }
  }

  // API: Get prospects
  if (pathname === '/api/prospects' && req.method === 'GET') {
    try {
      const prospects = await loadProspects();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, prospects }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Open Gmail compose tab in Chrome
  if (pathname === '/api/open-mail' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const prospects = cachedProspects || await loadProspects();
        const p = prospects.find(x => x.id === data.id);
        if (!p || !p.emailData) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Prospect or email not found' }));
          return;
        }

        const emailText = data.lang === 'ar' ? p.emailData.ar : p.emailData.fr;
        const composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(p.emailData.email)}&su=${encodeURIComponent(p.emailData.subject)}&body=${encodeURIComponent(emailText)}`;

        // Execute in Chrome Profile 1 (nextchallenge2021@gmail.com)
        exec(`google-chrome --profile-directory="Profile 1" "${composeUrl}" &`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Compose window opened for ${p.name}` }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Open WhatsApp Web tab in Chrome
  if (pathname === '/api/open-wa' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const prospects = cachedProspects || await loadProspects();
        const p = prospects.find(x => x.id === data.id);
        if (!p || !p.waData) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Prospect or WhatsApp number not found' }));
          return;
        }

        const cleanPhone = p.waData.phone.replace(/[^0-9]/g, '');
        const waText = data.lang === 'ar' ? p.waData.ar : p.waData.fr;
        const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;

        exec(`google-chrome --profile-directory="Profile 1" "${waUrl}" &`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `WhatsApp conversation opened for ${p.name}` }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Confirm Sent & Update Excel/Report
  if (pathname === '/api/confirm-send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body); // { id, channel: 'email'|'whatsapp'|'both', response, interest }
        const today = new Date().toISOString().split('T')[0];
        
        // Calculate follow-up J+5
        const d = new Date();
        d.setDate(d.getDate() + 5);
        const followup = d.toISOString().split('T')[0];

        const updates = {
          firstContactDate: today,
          followupDate: followup,
          response: data.response || 'Message Delivered — Awaiting Reply',
          interestLevel: data.interest || 'Contacted / Pitch Delivered',
          nextAction: `Follow-up wave 1 scheduled for ${followup} (J+5)`
        };

        if (data.channel === 'email') {
          updates.emailStatus = 'Email sent';
        } else if (data.channel === 'whatsapp') {
          updates.whatsappStatus = 'WhatsApp sent';
        } else if (data.channel === 'both') {
          updates.emailStatus = 'Email sent';
          updates.whatsappStatus = 'WhatsApp sent';
        }

        const result = await updateProspectInWorkbook(data.id, updates);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result, updates }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Campaign Launchpad Daemon running on http://127.0.0.1:${PORT}`);
});
