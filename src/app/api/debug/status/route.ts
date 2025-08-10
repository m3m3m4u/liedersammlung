import { NextResponse } from 'next/server';
import { isWebdavEnabled, getWebdavClient } from '@/lib/webdav';
import { getSongsCollection, getVideoCollection, validateMongoUri } from '@/lib/mongo';

function safeErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'error';
}

export async function GET() {
  const webdav = isWebdavEnabled();
  let webdavOk: boolean | string = false;
  if (webdav) {
    try {
      const client = getWebdavClient();
      await client.getDirectoryContents('/');
      webdavOk = true;
    } catch (e) {
      webdavOk = safeErrorMessage(e) || 'error';
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
  } catch (e) { dbOk = safeErrorMessage(e); }
  }
  return NextResponse.json({ webdavEnabled: webdav, webdavOk, dbOk });
}
