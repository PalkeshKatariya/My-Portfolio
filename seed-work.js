/**
 * seed-work.js
 * Inserts the 7 original portfolio cards into the DB (skips if title already exists).
 * Run once: node seed-work.js
 */
const db = require('./database');

const items = [
  {
    title: 'Grudge',
    category: 'wedding',
    year: 2025,
    description: 'Short film',
    video_url: 'https://youtu.be/s4nC6PtPjmo?si=UoLTtSc3LLeFNfWj',
    image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80'
  },
  {
    title: 'knock knock — BRAND FILM',
    category: 'commercial',
    year: 2024,
    description: 'Brand film',
    video_url: 'https://www.youtube.com/embed/aqz-KE-bpKQ?autoplay=1',
    image_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&q=80'
  },
  {
    title: 'ECHOES — ARIA DAWN',
    category: 'music',
    year: 2024,
    description: 'Music video',
    video_url: 'https://www.youtube.com/embed/kN0iD0pI3o0?autoplay=1',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80'
  },
  {
    title: 'BLUE PLANET — MINI DOC',
    category: 'documentary',
    year: 2023,
    description: 'Mini documentary',
    video_url: 'https://www.youtube.com/embed/LhHj4AjFCbk?autoplay=1',
    image_url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&q=80'
  },
  {
    title: 'SOUNDWAVE FESTIVAL 2023',
    category: 'events',
    year: 2023,
    description: 'Live event coverage',
    video_url: 'https://www.youtube.com/embed/ZrOKjDZOtkA?autoplay=1',
    image_url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80'
  },
  {
    title: 'LUMIÈRE — LUXURY AD',
    category: 'commercial',
    year: 2023,
    description: 'Luxury commercial',
    video_url: 'https://www.youtube.com/embed/ywJn-mCZKKA?autoplay=1',
    image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80'
  },
  {
    title: 'MAYA & RAJ — THE CEREMONY',
    category: 'wedding',
    year: 2023,
    description: 'Wedding film',
    video_url: 'https://www.youtube.com/embed/3JZ_D3ELwOQ?autoplay=1',
    image_url: 'https://images.unsplash.com/photo-1583939411023-14783179e581?w=900&q=80'
  }
];

// Wait for DB to be ready, then seed
setTimeout(() => {
  let pending = items.length;
  let inserted = 0;
  let skipped = 0;

  items.forEach(item => {
    db.get('SELECT id FROM work WHERE title = ?', [item.title], (err, row) => {
      if (err) {
        console.error('Error checking:', err.message);
        if (--pending === 0) done();
        return;
      }
      if (row) {
        console.log(`  SKIP  "${item.title}" (already exists)`);
        skipped++;
        if (--pending === 0) done();
      } else {
        db.run(
          'INSERT INTO work (title, category, year, description, video_url, image_url) VALUES (?, ?, ?, ?, ?, ?)',
          [item.title, item.category, item.year, item.description, item.video_url, item.image_url],
          function(runErr) {
            if (runErr) {
              console.error(`  ERROR inserting "${item.title}":`, runErr.message);
            } else {
              console.log(`  INSERT "${item.title}" → id ${this.lastID}`);
              inserted++;
            }
            if (--pending === 0) done();
          }
        );
      }
    });
  });

  function done() {
    console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
    db.close();
  }
}, 500); // give database.js time to connect + init tables
