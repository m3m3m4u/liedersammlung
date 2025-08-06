import { NextResponse } from 'next/server';
import { readdir, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'texte'; // Default: texte
    
    const baseDir = path.join(process.cwd(), 'public', 'images', type);
    
    console.log('Current working directory:', process.cwd());
    console.log('Looking for directory:', baseDir);
    
    // Prüfen ob das Verzeichnis existiert
    try {
      await access(baseDir, constants.F_OK);
      console.log('Directory exists:', baseDir);
    } catch (accessError) {
      console.error('Directory does not exist:', baseDir);
      console.error('Access error:', accessError);
      
      // Alternative Pfade versuchen
      const altPath1 = path.join(__dirname, '..', '..', '..', '..', 'public', 'images', type);
      const altPath2 = path.join(process.cwd(), '..', 'public', 'images', type);
      
      console.log('Trying alternative path 1:', altPath1);
      console.log('Trying alternative path 2:', altPath2);
      
      return NextResponse.json(
        { 
          error: `Directory not found: ${baseDir}`,
          debug: {
            cwd: process.cwd(),
            baseDir,
            type,
            altPath1,
            altPath2
          }
        },
        { status: 404 }
      );
    }
    
    // Alle Unterordner im entsprechenden Verzeichnis lesen
    const folders = await readdir(baseDir, { withFileTypes: true });
    const songFolders = folders.filter(dirent => dirent.isDirectory());
    
    console.log(`Found ${songFolders.length} song folders in ${type}`);
    
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
    
    console.log(`Returning ${validSongs.length} valid songs`);
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
