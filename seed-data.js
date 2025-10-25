const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, 'incidents.db');

// Sample data arrays for variety
const titles = [
  'Server Downtime', 'Database Connection Failure', 'High Memory Usage',
  'Network Latency Issues', 'Authentication Error', 'API Response Timeout',
  'SSL Certificate Expired', 'Disk Space Critical', 'Service Unavailable',
  'Load Balancer Failure', 'Cache Server Down', 'Email Service Disruption',
  'Payment Gateway Error', 'CDN Performance Degradation', 'DNS Resolution Failed',
  'Application Crash', 'Memory Leak Detected', 'CPU Spike', 'Backup Failure',
  'Security Breach Attempt', 'DDoS Attack', 'Data Corruption', 'Sync Error',
  'Timeout Exception', 'Connection Pool Exhausted'
];

const descriptions = [
  'Users unable to access the service',
  'System experiencing performance degradation',
  'Critical error reported by monitoring system',
  'Multiple users reporting intermittent issues',
  'Automated alert triggered for resource threshold',
  'Third-party service integration failure',
  'Unexpected spike in error rates detected',
  'Routine maintenance escalated to incident',
  'Security vulnerability detected and patched',
  'Infrastructure component malfunctioning',
  'Service degradation affecting user experience',
  'Database query performance issues',
  'Network connectivity problems',
  'API endpoints returning errors',
  'Authentication service timeout'
];

const severities = ['Critical', 'High', 'Medium', 'Low'];
const categories = ['Infrastructure', 'Application', 'Network', 'Security', 'Database', 'Integration'];
const priorities = ['P1', 'P2', 'P3', 'P4'];
const statuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'Investigating'];
const websiteTypes = ['E-commerce', 'SaaS', 'Blog', 'Corporate', 'API Service', 'Mobile App Backend'];
const frequencies = ['First Time', 'Occasional', 'Frequent', 'Recurring'];
const services = ['Web Server', 'Database', 'API', 'Authentication', 'Payment', 'Email', 'Storage', 'CDN'];
const rootCauses = ['Hardware Failure', 'Software Bug', 'Configuration Error', 'Network Issue', 'Human Error', 'Capacity Planning', 'Third Party'];
const tagsList = [
  'urgent,customer-facing',
  'internal,low-impact',
  'maintenance,scheduled',
  'security,critical',
  'performance,optimization',
  'bug,frontend',
  'backend,database',
  'networking,infrastructure',
  'monitoring,alert',
  'deployment,rollback',
  'hotfix,patch',
  'incident,major',
  'outage,partial',
  'degraded,service'
];

// Helper function to get random item from array
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to generate random phone number
function generatePhone() {
  const formats = [
    `+1-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    `+91-${Math.floor(Math.random() * 90000 + 10000)}-${Math.floor(Math.random() * 90000 + 10000)}`,
    `+44-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 900000 + 100000)}`,
    null // Some entries without phone
  ];
  return getRandomItem(formats);
}

// Helper function to generate random date within last 180 days
function generateRandomDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 180);
  const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  return date.toISOString();
}

// Generate metadata JSON
function generateMetadata(incidentNum) {
  return JSON.stringify({
    reporter: `user${Math.floor(Math.random() * 100)}@example.com`,
    affectedUsers: Math.floor(Math.random() * 10000),
    region: getRandomItem(['US-East', 'US-West', 'EU', 'APAC', 'South America']),
    incidentNumber: `INC-${String(incidentNum).padStart(6, '0')}`,
    assignedTo: `engineer${Math.floor(Math.random() * 50)}@company.com`,
    estimatedResolutionTime: `${Math.floor(Math.random() * 24) + 1} hours`
  });
}

// Main insert function
async function insertSampleData(count = 300) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbFile);
    
    db.serialize(() => {
      const stmt = db.prepare(`INSERT INTO incidents
        (title, description, severity, category, priority, status, metadata, 
         phone, websiteType, incidentFrequency, serviceAffected, rootCauseCategory, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      let completed = 0;
      let errors = [];

      for (let i = 1; i <= count; i++) {
        const title = `${getRandomItem(titles)} #${i}`;
        const description = getRandomItem(descriptions);
        const severity = getRandomItem(severities);
        const category = getRandomItem(categories);
        const priority = getRandomItem(priorities);
        const status = getRandomItem(statuses);
        const metadata = generateMetadata(i);
        const phone = generatePhone();
        const websiteType = getRandomItem(websiteTypes);
        const incidentFrequency = getRandomItem(frequencies);
        const serviceAffected = getRandomItem(services);
        const rootCauseCategory = getRandomItem(rootCauses);
        const tags = getRandomItem(tagsList);
        const created_at = generateRandomDate();

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
          completed++;
          
          if (err) {
            errors.push({ row: i, error: err.message });
          }

          // Progress indicator
          if (completed % 50 === 0) {
            console.log(`Inserted ${completed}/${count} records...`);
          }

          if (completed === count) {
            stmt.finalize();
            db.close((closeErr) => {
              if (closeErr) {
                reject(closeErr);
              } else if (errors.length > 0) {
                console.error(`\nCompleted with ${errors.length} errors:`, errors);
                resolve({ success: count - errors.length, errors: errors.length });
              } else {
                console.log(`\n✓ Successfully inserted ${count} records!`);
                resolve({ success: count, errors: 0 });
              }
            });
          }
        });
      }
    });
  });
}

// CLI execution
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 300;
  
  console.log(`Starting to insert ${count} sample incidents...`);
  console.log('Database file:', dbFile);
  console.log('---');
  
  insertSampleData(count)
    .then(result => {
      console.log('\n=== Insertion Complete ===');
      console.log(`✓ Success: ${result.success} records`);
      if (result.errors > 0) {
        console.log(`✗ Errors: ${result.errors} records`);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('\n✗ Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { insertSampleData };
