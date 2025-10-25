const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./incidents.db');

db.serialize(() => {
  db.run("DELETE FROM incidents");
  db.run("DELETE FROM sqlite_sequence WHERE name='incidents'", function(err) {
    if (err) {
      console.error("Error resetting sequence:", err);
    } else {
      console.log("All incidents deleted and ID sequence reset.");
    }
    db.close();
  });
});
