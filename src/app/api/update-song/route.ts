import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSongsCollection } from '@/lib/mongo';

export async function POST(request: NextRequest) {
  try {
    const { songId, updates } = await request.json();
    
    if (!songId || !updates || typeof updates !== 'object') {
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

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Felder für Update' },
        { status: 400 }
      );
    }

    // Füge updatedAt hinzu
    filteredUpdates.updatedAt = new Date();

    const filter = ObjectId.isValid(songId)
      ? { _id: new ObjectId(songId) }
      : { folder: songId };

    const result = await songsCol.updateOne(
      filter,
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
