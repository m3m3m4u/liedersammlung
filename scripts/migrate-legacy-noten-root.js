#!/usr/bin/env node
/*
 * Migration für Altstruktur: public/Noten/<SongOrdner> -> WebDAV /noten/<SongOrdner>
 * Optional: Upsert der Metadaten in MongoDB (songs Collection) falls MONGODB_URI gesetzt.
 * Aufruf: npm run migrate:legacy-noten
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { createClient } = require('webdav');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function isWebdavEnabled() {
  return !!(process.env.STORAGEBOX_WEBDAV_URL && process.env.STORAGEBOX_USER && process.env.STORAGEBOX_PASS);
}

async function ensureDir(client, dir) {
  const parts = dir.split('/').filter(Boolean);
  let current = '';
  for (const p of parts) {
    current += '/' + p;
    // eslint-disable-next-line no-await-in-loop
    const exists = await client.exists(current).catch(() => false);
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      await client.createDirectory(current);
    }
  }
}

async function main() {
  if (!isWebdavEnabled()) {
    console.error('WebDAV ENV nicht gesetzt. Abbruch.');
    process.exit(1);
  }
  const localBase = path.join(process.cwd(), 'public', 'Noten');
  if (!fs.existsSync(localBase)) {
    console.log('Kein Verzeichnis public/Noten gefunden – nichts zu tun.');
    return;
  }
  const client = createClient(process.env.STORAGEBOX_WEBDAV_URL, { username: process.env.STORAGEBOX_USER, password: process.env.STORAGEBOX_PASS });
  let mongoClient = null;
  let songsCol = null;
  if (process.env.MONGODB_URI) {
    try {
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      const dbName = process.env.MONGODB_DB || mongoClient.options?.dbName || 'notenverwaltung';
      const db = mongoClient.db(dbName);
      songsCol = db.collection('songs');
      await songsCol.createIndex({ folder: 1, category: 1 }, { unique: true });
    } catch (e) {
      console.warn('MongoDB Verbindung fehlgeschlagen – fahre ohne DB Update fort:', e.message);
      songsCol = null;
    }
  }

  const dirEntries = await fsp.readdir(localBase, { withFileTypes: true });
  const folders = dirEntries.filter(d => d.isDirectory());
  console.log(`Finde ${folders.length} Ordner in public/Noten`);
  let totalImages = 0, uploaded = 0, failed = 0, processedFolders = 0;
  for (const folder of folders) {
    processedFolders++;
    const folderName = folder.name;
    const localDir = path.join(localBase, folderName);
    const files = await fsp.readdir(localDir).catch(() => []);
    const imageFiles = files.filter(f => IMAGE_EXT.includes(path.extname(f).toLowerCase()));
    totalImages += imageFiles.length;
    if (imageFiles.length === 0) continue;
    const remoteDir = `/noten/${folderName}`; // Ziel immer klein geschrieben
    await ensureDir(client, remoteDir);
    for (const img of imageFiles) {
      const pLocal = path.join(localDir, img);
      try {
        const data = await fsp.readFile(pLocal);
        await client.putFileContents(`${remoteDir}/${img}`, data, { overwrite: true });
        uploaded++;
      } catch (e) {
        failed++; console.error('Upload Fehler', pLocal, e.message);
      }
    }
    if (songsCol) {
      try {
        const now = new Date();
        await songsCol.updateOne(
          { folder: folderName, category: 'noten' },
          { $setOnInsert: { createdAt: now }, $set: { title: folderName, images: imageFiles, updatedAt: now } },
          { upsert: true }
        );
      } catch (e) {
        console.warn('Mongo Upsert Warnung für', folderName, e.message);
      }
    }
    if (processedFolders % 20 === 0) {
      console.log(`Progress: ${processedFolders}/${folders.length} Ordner, ${uploaded}/${totalImages} Bilder hochgeladen.`);
    }
  }
  console.log(JSON.stringify({ folders: folders.length, processed: processedFolders, totalImages, uploaded, failed, mongo: !!songsCol }, null, 2));
  if (mongoClient) await mongoClient.close();
  console.log('Legacy Noten Migration abgeschlossen.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
