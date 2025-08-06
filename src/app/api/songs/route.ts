import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'texte'; // Default: texte
    
    const baseDir = path.join(process.cwd(), 'public', 'images', type);
    
    // Alle Unterordner im entsprechenden Verzeichnis lesen
    const folders = await readdir(baseDir, { withFileTypes: true });
    const songFolders = folders.filter(dirent => dirent.isDirectory());
    
    const songs = await Promise.all(
      songFolders.map(async (folder) => {
        const songDir = path.join(baseDir, folder.name);
        
        try {
          // Alle Bilder im Song-Ordner lesen
          const files = await readdir(songDir);
          const imageFiles = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .sort() // Alphabetische Sortierung für konsistente Reihenfolge
            .map(file => `/images/${type}/${folder.name}/${file}`);
          
          return {
            _id: folder.name.toLowerCase().replace(/\s+/g, '-'), // ID für React key
            title: folder.name,
            images: imageFiles
          };
        } catch (error) {
          console.error(`Error reading folder ${folder.name}:`, error);
          return null;
        }
      })
    );
    
    // Null-Werte herausfiltern (falls ein Ordner nicht lesbar war)
    const validSongs = songs.filter(song => song !== null);
    
    return NextResponse.json(validSongs);
  } catch (error) {
    const { searchParams } = new URL(request.url);
    console.error(`Error reading ${searchParams?.get('type') || 'texte'} directory:`, error);
    return NextResponse.json(
      { error: `Failed to read songs from filesystem` },
      { status: 500 }
    );
  }
}
