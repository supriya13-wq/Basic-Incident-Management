const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const classifier = require('./classifier');
const nodemailer = require('nodemailer');
const { sendSMS } = require('./sendSMS');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Simple email transporter - configure via env vars
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

app.post('/incident', async (req, res) => {
  try {
    // DEBUG: log incoming request body to verify fields are received
    console.log('POST /incident body:', req.body);

    const { title, description, severity, metadata, phone, websiteType, incidentFrequency, serviceAffected, rootCauseCategory, tags } = req.body;
    if (!title || !description) return res.status(400).json({error: 'title and description required'});

    if (phone && !/^\+\d{7,15}$/.test(phone)) {
      return res.status(400).json({ error: 'phone must be in E.164 format (e.g. +15551234567)' });
    }

    const result = classifier.categorizeAndPrioritize({title, description, severity, metadata});

    const incident = {
      title,
      description,
      severity: severity || result.severity || 'medium',
      category: result.category,
      priority: result.priority,
      status: 'Open',
      metadata: JSON.stringify(metadata || {}),
      phone: phone || null,
      websiteType: websiteType || null,
      incidentFrequency: incidentFrequency || null,
      serviceAffected: serviceAffected || null,
      rootCauseCategory: rootCauseCategory || null,
      tags: tags || null,
      created_at: new Date().toISOString()
    };

    const id = await db.createIncident(incident);
    console.log('Inserted incident id:', id, 'phone:', incident.phone);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_TO || process.env.SMTP_USER,
        subject: `[${incident.priority}] Incident #${id}: ${incident.title}`,
        text: `${incident.description}\n\nCategory: ${incident.category}\nPriority: ${incident.priority}`
      };
      transporter.sendMail(mailOptions).catch(err => console.error('Mail send error:', err));
    }

    if (phone) {
      sendSMS({
        to: phone,
        body: 'Hey there, your issue has been recorded on our incident management dashboard. We are working on creating a smoother experience for you. Thank you'
      })
      .then(r => console.log(`SMS sent to ${phone}`, r && r.sid ? r.sid : ''))
      .catch(err => console.error('SMS send failed:', err && err.message ? err.message : err));
    }

    const saved = await db.getIncidentById(id);
    // DEBUG: log fetched DB row to ensure phone persisted
    console.log('Saved record from DB:', saved);
    return res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    return res.status(500).json({error: 'internal error', details: err.message});
  }
});

app.get('/incidents', async (req, res) => {
  const list = await db.listIncidents();
  res.json(list);
});

app.post('/incident/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['Open','Acknowledged','Resolved'].includes(status)) return res.status(400).json({error:'invalid status'});
  await db.updateStatus(id, status);
  const inc = await db.getIncidentById(id);
  res.json(inc);
});

app.listen(PORT, async () => {
  console.log('Server running on port', PORT);
  await db.init();
  console.log('DB initialized (incidents.db)');
});
