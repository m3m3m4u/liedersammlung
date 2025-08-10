#!/usr/bin/env node
/*
 * Lokales Migrationsskript: Kopiert vorhandene Bilder aus public/images/{noten,texte}
 * in die WebDAV Storage Box (sofern ENV konfiguriert).
 * Nutzung: npm run migrate:webdav
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { createClient } = require('webdav');

function isWebdavEnabled() {
  return !!(process.env.STORAGEBOX_WEBDAV_URL && process.env.STORAGEBOX_USER && process.env.STORAGEBOX_PASS);
}

async function ensureDir(client, dir) {
  const parts = dir.split('/').filter(Boolean);
  let current = '';
  for (const p of parts) {
    current += '/' + p;
    try {
      // eslint-disable-next-line no-await-in-loop
      const exists = await client.exists(current);
      if (!exists) {
        // eslint-disable-next-line no-await-in-loop
        await client.createDirectory(current);
      }
    } catch (e) {
      console.error('Fehler beim Erstellen', current, e.message);
      throw e;
    }
  }
}

async function migrateCategory(client, cat) {
  const base = path.join(process.cwd(), 'public', 'images', cat);
  if (!fs.existsSync(base)) return { skipped: true };
  const entries = await fsp.readdir(base, { withFileTypes: true });
  let uploaded = 0, failed = 0, folders = 0;
  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    folders++;
    const songDirLocal = path.join(base, dirent.name);
    const songFiles = await fsp.readdir(songDirLocal);
    const images = songFiles.filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
    if (images.length === 0) continue;
    const remoteDir = `/${cat}/${dirent.name}`;
    await ensureDir(client, remoteDir);
    for (const img of images) {
      const pLocal = path.join(songDirLocal, img);
      try {
        const data = await fsp.readFile(pLocal);
        await client.putFileContents(`${remoteDir}/${img}`, data, { overwrite: true });
        uploaded++;
      } catch (e) {
        failed++;
        console.error('Upload Fehler', pLocal, e.message);
      }
    }
  }
  return { folders, uploaded, failed };
}

(async () => {
  if (!isWebdavEnabled()) {
    console.error('WebDAV ENV nicht gesetzt. Abbruch.');
    process.exit(1);
  }
  const client = createClient(process.env.STORAGEBOX_WEBDAV_URL, {
    username: process.env.STORAGEBOX_USER,
    password: process.env.STORAGEBOX_PASS,
  });
  console.log('Starte Migration -> WebDAV');
  try {
    const noten = await migrateCategory(client, 'noten');
    const texte = await migrateCategory(client, 'texte');
    console.log('Ergebnis:', JSON.stringify({ noten, texte }, null, 2));
    console.log('Fertig.');
  } catch (e) {
    console.error('Migration fehlgeschlagen:', e.message);
    process.exit(1);
  }
})();
