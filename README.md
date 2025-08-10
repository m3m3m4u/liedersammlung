# Noten-Verwaltung

Eine moderne Next.js-Anwendung zur Verwaltung von Musiknoten und Liedtexten.

## Features

- 📄 **Dual Content System**: Unterstützt sowohl Noten (`/public/images/noten/`) als auch Texte (`/public/images/texte/`)
- 🔐 **Password Protection**: Einfache localStorage-basierte Authentifizierung
- 🎨 **Responsive Design**: Optimiert für Desktop und mobile Geräte
- ⌨️ **Keyboard Navigation**: Vollständige Tastatursteuerung für schnelle Navigation
- 🖼️ **Image Optimization**: Automatische Bildgrößenanpassung mit Next.js Image-Komponente
- 🔍 **A-Z Navigation**: Alphabetische Sortierung und Filterung
- 📱 **Fullscreen Mode**: Vollbildmodus für optimale Anzeige

## Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd noten-verwaltung
```

2. Dependencies installieren:
```bash
npm install
```

3. Development Server starten:
```bash
npm run dev
```

4. Öffne [http://localhost:3000](http://localhost:3000) im Browser

## Projektstruktur

```
noten-verwaltung/
├── src/
│   ├── app/
│   │   ├── api/songs/route.ts    # API Endpoint für Songs
│   │   ├── layout.tsx            # Root Layout
│   │   └── page.tsx             # Main Page
│   └── components/
│       ├── Login.tsx            # Login Komponente
│       ├── SongDetail.tsx       # Song Detail View
│       └── SongList.tsx         # Song Übersicht
├── public/
│   └── images/
│       ├── noten/               # Noten-Bilder
│       │   └── [song-name]/
│       └── texte/               # Text-Bilder
│           └── [song-name]/
└── README.md
```

## Verwendung

### Content Types

Die Anwendung unterstützt zwei Content-Types:

- **Noten**: Musiknoten-Bilder (Standard-Pfad: `/public/images/noten/`)
- **Texte**: Liedtext-Bilder (Standard-Pfad: `/public/images/texte/`)

### Ordnerstruktur für Inhalte

Jeder Song sollte einen eigenen Ordner haben:
```
public/images/noten/Song Name/
├── 1.jpg
├── 2.jpg
└── 3.jpg
```

### Tastatursteuerung

- `←/→` - Zwischen Seiten navigieren
- `ESC` - Zurück zur Übersicht
- `H` - Home (zur Hauptseite)
- `1-9` - Direkte Seitenauswahl
- `Page Up/Down` - Seiten blättern

### Authentication

Standard-Passwort: `noten123` (kann in `src/components/Login.tsx` geändert werden)

## Technologie-Stack

- **Framework**: Next.js 15 mit App Router
- **Language**: TypeScript
- **Styling**: CSS-in-JS mit Bootstrap-Klassen
- **Bildverarbeitung**: Next.js Image-Komponente
- **State Management**: React Hooks (useState, useEffect)

## API

### GET /api/songs

Listet Songs (oder Videos mit `type=videos`). Nutzt MongoDB falls vorhanden, fällt sonst auf WebDAV oder lokale Dateien zurück.

**Parameter:**
- `type` (optional): `'noten'`, `'texte'` oder `videos` (Standard: `'texte'`)

### GET /api/cache-songs

Schneller Abruf gecachter Songtitel (nur Metadaten: Ordner, Titel). Wenn die Songs-Collection leer ist und WebDAV aktiv ist, werden Verzeichnisnamen einmalig eingelesen und in MongoDB upserted.

### POST /api/cache-songs

Erzwingt einen Refresh Scan aller Song-Verzeichnisse (`noten` und `texte`). Nützlich für einen "Warmup" beim Deployment.

**Beispiel Warmup Skript (PowerShell):**
```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/cache-songs | Out-Null
```

## Entwicklung

### Neue Features hinzufügen

1. Komponenten in `src/components/` erstellen
2. API-Routen in `src/app/api/` hinzufügen
3. Styling direkt in den Komponenten

### Build für Production

```bash
npm run build
npm start
```

## Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## License

MIT License - siehe LICENSE Datei für Details.
