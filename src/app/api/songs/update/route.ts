import { NextResponse } from 'next/server';
import { getSongsCollection } from '@/lib/mongo';

export async function POST(request: Request) {
  try {
    const { songId, updates } = await request.json();
    
    if (!songId || !updates) {
      return NextResponse.json(
        { error: 'songId und updates erforderlich' },
        { status: 400 }
      );
    }

    const songsCol = await getSongsCollection();
    if (!songsCol) {
      return NextResponse.json(
        { error: 'Datenbankverbindung fehlgeschlagen' },
        { status: 500 }
      );
    }

    // Erlaubte Felder für Update
    const allowedFields = [
      'title',
      'isChristmas',
      'languageGerman',
      'languageEnglish',
      'languageOther'
    ];

    // Filtere nur erlaubte Felder
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Füge updatedAt hinzu
    filteredUpdates.updatedAt = new Date();

    const result = await songsCol.updateOne(
      { _id: songId },
      { $set: filteredUpdates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Song nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount > 0
    });

  } catch (error) {
    console.error('Song update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
