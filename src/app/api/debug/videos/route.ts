import { NextResponse } from 'next/server';
import { getVideoCollection } from '@/lib/mongo';
import { isWebdavEnabled, getWebdavClient } from '@/lib/webdav';

export async function GET() {
  const out: any = { db: null as any, webdav: null as any, local: null as any };
  try {
    const col = await getVideoCollection();
    if (col) {
      out.db = await col.find({}).limit(200).toArray();
    } else {
      out.db = 'no-db';
    }
  } catch (e:any) { out.db = { error: e.message }; }

  if (isWebdavEnabled()) {
    try {
      const client = getWebdavClient();
      const entries = await client.getDirectoryContents('/videos').catch(()=>[]) as any[];
      out.webdav = entries.filter(e=> e.type==='file' && e.basename.endsWith('.json')).map(e=> e.basename);
    } catch (e:any) { out.webdav = { error: e.message }; }
  } else {
    out.webdav = 'disabled';
  }
  return NextResponse.json(out);
}
