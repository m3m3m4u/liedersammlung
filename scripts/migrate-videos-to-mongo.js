// Migration vorhandener lokaler Video JSON Dateien in MongoDB
// Aufruf: npm run migrate:videos (benötigt MONGODB_URI in .env.local)
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI nicht gesetzt – Abbruch');
  process.exit(1);
}

const dbNameEnv = process.env.MONGODB_DB;

function makeSlug(title) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = dbNameEnv || client.options.dbName || 'notenverwaltung';
  const db = client.db(dbName);
  const col = db.collection('videos');
  await col.createIndex({ slug: 1 }, { unique: true });

  const videosDir = path.join(process.cwd(), 'public', 'videos');
  if (!existsSync(videosDir)) {
    console.log('Kein lokales Verzeichnis public/videos – nichts zu migrieren.');
    await client.close();
    return;
  }

  const files = (await readdir(videosDir)).filter(f => f.endsWith('.json'));
  let inserted = 0, updated = 0, failed = 0;
  for (const file of files) {
    try {
      const raw = await readFile(path.join(videosDir, file), 'utf-8');
      const data = JSON.parse(raw);
      if (!data.title || !data.url) continue;
      const slug = makeSlug(data.title);
      const created = data.created ? new Date(data.created) : new Date();
      const res = await col.updateOne(
        { slug },
        { $setOnInsert: { createdAt: created }, $set: { title: data.title, url: data.url } },
        { upsert: true }
      );
      if (res.upsertedCount === 1) inserted++; else updated++;
    } catch (e) {
      failed++; console.error('Fehler bei Datei', file, e);
    }
  }
  console.log(JSON.stringify({ files: files.length, inserted, updated, failed }, null, 2));
  await client.close();
}

run().catch(e => { console.error(e); process.exit(1); });
