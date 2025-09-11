import { createClient, WebDAVClient } from 'webdav';

export function isWebdavEnabled(): boolean {
  return !!(process.env.STORAGEBOX_WEBDAV_URL && process.env.STORAGEBOX_USER && process.env.STORAGEBOX_PASS);
}

let cachedClient: WebDAVClient | null = null;

export function getWebdavClient(): WebDAVClient {
  if (!isWebdavEnabled()) {
    throw new Error('WebDAV ist nicht konfiguriert');
  }
  if (cachedClient) return cachedClient;
  cachedClient = createClient(process.env.STORAGEBOX_WEBDAV_URL as string, {
    username: process.env.STORAGEBOX_USER as string,
    password: process.env.STORAGEBOX_PASS as string,
  });
  return cachedClient;
}

export function buildPublicUrl(relativePath: string): string | null {
  const base = process.env.STORAGEBOX_PUBLIC_BASE_URL;
  if (!base) return null;
  // Unicode sicher: normalisieren und pro Segment encoden
  const normalized = relativePath.normalize('NFC').replace(/^\/+/, '');
  const encoded = normalized.split('/').map(encodeURIComponent).join('/');
  return `${base.replace(/\/$/, '')}/${encoded}`;
}

export async function ensureDirectories(client: WebDAVClient, dirs: string[]) {
  for (const dir of dirs) {
    try {
      const exists = await client.exists(dir);
      if (!exists) {
        await client.createDirectory(dir);
      }
    } catch (e) {
      console.error('Fehler beim Erstellen von Verzeichnis', dir, e);
      throw e;
    }
  }
}

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
