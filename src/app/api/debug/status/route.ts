import { NextResponse } from 'next/server';
import { isWebdavEnabled, getWebdavClient } from '@/lib/webdav';
import { getSongsCollection, getVideoCollection, validateMongoUri } from '@/lib/mongo';

export async function GET() {
  const webdav = isWebdavEnabled();
  let webdavOk: boolean | string = false;
  if (webdav) {
    try {
      const client = getWebdavClient();
      await client.getDirectoryContents('/');
      webdavOk = true;
    } catch (e:any) {
      webdavOk = e.message || 'error';
    }
  }
  let dbOk: boolean | string = false;
  const uriIssue = validateMongoUri();
  if (uriIssue) {
    dbOk = uriIssue;
  } else {
    try {
      const songsCol = await getSongsCollection();
      const videosCol = await getVideoCollection();
      if (songsCol || videosCol) dbOk = true; else dbOk = 'no collections';
    } catch (e:any) { dbOk = e.message || 'error'; }
  }
  return NextResponse.json({ webdavEnabled: webdav, webdavOk, dbOk });
}
