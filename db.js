const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, 'incidents.db');

function openDB() {
  return new sqlite3.Database(dbFile);
}

module.exports.init = function() {
  return new Promise((resolve, reject) => {
    const db = openDB();
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        severity TEXT,
        category TEXT,
        priority TEXT,
        status TEXT,
        metadata TEXT,
        phone TEXT,
        websiteType TEXT,
        incidentFrequency TEXT,
        serviceAffected TEXT,
        rootCauseCategory TEXT,
        tags TEXT,
        created_at TEXT
      )`, (err) => {
        if (err) {
          db.close();
          return reject(err);
        }
        // Add missing columns on older DBs to avoid breaking changes
        db.all("PRAGMA table_info(incidents)", (err, rows) => {
          if (err) {
            db.close();
            return reject(err);
          }
          const columns = rows.map(r => r.name);
          const promises = [];
          if (!columns.includes('phone')) {
            promises.push(new Promise((res, rej) => {
              db.run("ALTER TABLE incidents ADD COLUMN phone TEXT", (err) => err ? rej(err) : res());
            }));
          }
          if (!columns.includes('websiteType')) {
            promises.push(new Promise((res, rej) => {
              db.run("ALTER TABLE incidents ADD COLUMN websiteType TEXT", (err) => err ? rej(err) : res());
            }));
          }
          if (!columns.includes('incidentFrequency')) {
            promises.push(new Promise((res, rej) => {
              db.run("ALTER TABLE incidents ADD COLUMN incidentFrequency TEXT", (err) => err ? rej(err) : res());
            }));
          }
          if (!columns.includes('serviceAffected')) {
            promises.push(new Promise((res, rej) => {
              db.run("ALTER TABLE incidents ADD COLUMN serviceAffected TEXT", (err) => err ? rej(err) : res());
            }));
          }
          if (!columns.includes('rootCauseCategory')) {
            promises.push(new Promise((res, rej) => {
              db.run("ALTER TABLE incidents ADD COLUMN rootCauseCategory TEXT", (err) => err ? rej(err) : res());
            }));
          }
          if (!columns.includes('tags')) {
            promises.push(new Promise((res, rej) => {
              db.run("ALTER TABLE incidents ADD COLUMN tags TEXT", (err) => err ? rej(err) : res());
            }));
          }
          Promise.all(promises).then(() => {
            db.close();
            resolve();
          }).catch(e => {
            db.close();
            reject(e);
          });
        });
      });
    });
  });
};

module.exports.createIncident = function(incident) {
  return new Promise((resolve, reject) => {
    const db = openDB();

    const title = incident.title || null;
    const description = incident.description || null;
    const severity = incident.severity || null;
    const category = incident.category || null;
    const priority = incident.priority || null;
    const status = incident.status || null;
    const metadata = incident.metadata || null;
    const phone = (incident.phone === undefined) ? null : incident.phone;
    const websiteType = incident.websiteType || null;
    const incidentFrequency = incident.incidentFrequency || null;
    const serviceAffected = incident.serviceAffected || null;
    const rootCauseCategory = incident.rootCauseCategory || null;
    const tags = incident.tags || null;
    const created_at = incident.created_at || new Date().toISOString();

    const stmt = db.prepare(`INSERT INTO incidents
      (title,description,severity,category,priority,status,metadata,phone,websiteType,incidentFrequency,serviceAffected,rootCauseCategory,tags,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    stmt.run([
      title,
      description,
      severity,
      category,
      priority,
      status,
      metadata,
      phone,
      websiteType,
      incidentFrequency,
      serviceAffected,
      rootCauseCategory,
      tags,
      created_at
    ], function(err) {
      stmt.finalize();
      db.close();
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
};

module.exports.listIncidents = function() {
  return new Promise((resolve, reject) => {
    const db = openDB();
    db.all('SELECT * FROM incidents ORDER BY created_at DESC', (err, rows) => {
      db.close();
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports.getIncidentById = function(id) {
  return new Promise((resolve, reject) => {
    const db = openDB();
    db.get('SELECT * FROM incidents WHERE id = ?', [id], (err, row) => {
      db.close();
      if (err) return reject(err);
      resolve(row);
    });
  });
};

module.exports.updateStatus = function(id, status) {
  return new Promise((resolve, reject) => {
    const db = openDB();
    db.run('UPDATE incidents SET status = ? WHERE id = ?', [status, id], function(err) {
      db.close();
      if (err) return reject(err);
      resolve();
    });
  });
};

// CLI init option
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--init') {
    module.exports.init().then(() => console.log('DB init done')).catch(e => console.error(e));
  }
}
