import { MongoClient, Db, Collection } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.warn('[mongo] MONGODB_URI nicht gesetzt – Video-Funktionen fallen auf Dateisystem/WebDAV zurück.');
}

let clientPromise: Promise<MongoClient> | undefined;

export function getMongoClientPromise(): Promise<MongoClient> | undefined {
  if (!uri) return undefined;
  if (global._mongoClientPromise) return global._mongoClientPromise;
  if (!clientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect();
    global._mongoClientPromise = clientPromise;
  }
  return clientPromise;
}

export async function getDb(): Promise<Db | undefined> {
  const promise = getMongoClientPromise();
  if (!promise) return undefined;
  const client = await promise;
  const dbName = process.env.MONGODB_DB || client.options.dbName || 'notenverwaltung';
  return client.db(dbName);
}

export interface VideoDoc {
  _id?: string;
  slug: string;
  title: string;
  url: string;
  createdAt: Date;
}

export interface SongDoc {
  _id?: string;
  category: 'noten' | 'texte';
  folder: string; // Verzeichnisname auf WebDAV
  title: string;  // Anzeigename
  images: string[]; // Dateinamen (nur Dateinamen, ohne Pfad)
  createdAt: Date;
  updatedAt: Date;
}

export function makeSlug(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export async function getVideoCollection(): Promise<Collection<VideoDoc> | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const col = db.collection<VideoDoc>('videos');
  await col.createIndex({ slug: 1 }, { unique: true }).catch(() => {});
  return col;
}

export async function getSongsCollection(): Promise<Collection<SongDoc> | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const col = db.collection<SongDoc>('songs');
  await col.createIndex({ category: 1, folder: 1 }, { unique: true }).catch(() => {});
  return col;
}
