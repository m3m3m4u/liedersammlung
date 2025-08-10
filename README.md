# Noten-Verwaltung

Eine moderne Next.js-Anwendung zur Verwaltung von Musiknoten, Liedtexten und Videos mit MongoDB & Hetzner WebDAV.

## Kern-Features (Aktueller Stand)

- � **Remote Storage (Hetzner WebDAV)**: Bilder (Noten & Texte) liegen vollständig extern, keine lokalen Kopien nötig.
- 🗄️ **MongoDB**: Metadaten (Songs, Videos) + gecachte Bild-Dateiliste pro Song.
- � **Schneller Start**: Startseite lädt nur einen minimalen Index (Titel/Folders) via `?minimal=1` ohne Images.
- 🖼️ **Lazy Loading**: Bilder eines Songs werden erst beim Öffnen des Songs nachgeladen (`/api/song`).
- � **Video-Unterstützung**: YouTube-Links mit robuster ID-Erkennung (inkl. youtu.be Shortlinks).
- 🔐 **Lightweight Auth**: Einfache localStorage-Abfrage (optional später austauschbar).
- ⌨️ **Keyboard / Touch Navigation**: Blättern per Pfeiltaste, Zahlentasten, Swipe auf Touch.
- 📊 **Debug Endpoints**: `/api/debug/status` & `/api/debug/songs` helfen bei Deploy-/Connectivity-Problemen.
- ♻️ **Automatische Bild-Synchronisation**: Fehlen Bilder in der DB, werden sie bei Bedarf aus WebDAV nachgetragen.

## Architektur Überblick

```
Client UI (SongList, SongDetail, VideoDetail)
	│
	├── GET /api/songs?type=noten&minimal=1  → Minimaler Index (Titel/Folders)
	├── GET /api/song?folder=Folder&type=noten → Bilder eines Songs (lazy)
	├── GET /api/songs?type=videos            → Videos (Mongo / WebDAV JSON Fallback)
	├── POST /api/upload-song (optional / falls vorhanden)
	├── POST /api/upload-video
	└── Debug: /api/debug/status, /api/debug/songs

MongoDB (Collection songs / videos)
	▲         │
	│ Cache & Metadaten (images[], imageCount)
	│
WebDAV (Hetzner)  ← Primäre Quelle für Bilddateien
```

## Installation (Lokal)

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

## Projektstruktur (vereinfacht)

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
Remote über WebDAV (z.B. `/noten/Song Name/1.jpg`). Lokales `public/` wird für Bilder nicht mehr benötigt (nur Fallback / Assets).
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

## API Endpoints (aktuell)

| Endpoint | Beschreibung | Parameter | Bemerkung |
|----------|--------------|-----------|-----------|
| `GET /api/songs?type=noten&minimal=1` | Minimaler Index (ohne Images) | `type` (`noten|texte|videos`), `minimal=1` | Schnell für UI Start |
| `GET /api/song?folder=FOLDER&type=noten` | Vollständiger Song (mit Bild-URLs) | `folder`, `type` | Lazy Loading |
| `GET /api/songs?type=videos` | Videos | `type=videos` | Liest Mongo, sonst WebDAV JSON |
| `POST /api/upload-video` | Video hinzufügen | Body (JSON) | Speichert in Mongo |
| `GET /api/debug/status` | Health Check | – | webdavOk / dbOk |
| `GET /api/debug/songs` | Stichprobe + Verzeichnisliste | `type` optional | Diagnose |
| `GET /api/webdav-file?path=noten/...` | Proxy für Bild | `path` | Nutzt wenn kein `STORAGEBOX_PUBLIC_BASE_URL` gesetzt |

Historische Endpoints wie `/api/cache-songs` sind entfernt / obsolet.

## Umgebungsvariablen (Vercel)

Folgende Variablen im Vercel Dashboard setzen (Project → Settings → Environment Variables):

- `MONGODB_URI` (z.B. Atlas Connection String)
- `MONGODB_DB` (z.B. `liedersammlung`)
- `STORAGEBOX_WEBDAV_URL` (z.B. `https://<user>.your-storagebox.de`)
- `STORAGEBOX_USER`
- `STORAGEBOX_PASS`
- `STORAGEBOX_PUBLIC_BASE_URL` (optional – wenn gesetzt, direkte Auslieferung; sonst Proxy)
- `MIGRATION_TOKEN` (falls Migration-Route verwendet wird)

Hinweis: `.env.local` ist durch `.gitignore` geschützt und sollte nicht committed werden. Falls Credentials bereits im Git-Verlauf auftauchten → Schlüssel/Passwort rotieren.

## Deployment auf Vercel – Checkliste

1. Repository auf GitHub verbinden.
2. Environment Variables (siehe oben) in allen relevanten Environments (Production / Preview) hinterlegen.
3. (Optional) `STORAGEBOX_PUBLIC_BASE_URL` erst setzen, wenn CORS & Direct Access gewünscht.
4. Erster Aufruf produziert ggf. einen WebDAV-Scan wenn DB leer → kann je nach Anzahl Ordner dauern. Empfehlung: einmal lokal Migration/Scan ausführen und DB bereitstellen, dann deployen.
5. Debug nach Deployment:
	- `https://<vercel-domain>/api/debug/status`
	- `https://<vercel-domain>/api/songs?type=noten&minimal=1`
	- Song öffnen → prüfe Lazy Load.
6. Bilder-Ladepfad prüfen (DevTools Network: sollten 200 vom Proxy oder direkt vom Storage liefern, mit Cache-Control Header).

## Performance Hinweise

- Minimaler Index reduziert Payload massiv (nur Titel & Folder statt aller Bild-URLs).
- `/api/song` holt nur nötige Bilder; Preloading in der UI beschränkt auf Nachbarseiten.
- Möglichkeit für zukünftige Optimierung: Response Caching auf Vercel (z.B. mittels `Cache-Control` / Edge Funktionen) oder Redis Layer (nicht implementiert).
 - HTTP-Caching jetzt aktiv: `Cache-Control` + schwache `ETag`s auf `/api/songs` (30–120s) und `/api/song` (120s) + `stale-while-revalidate` für schnelle Wiederholungsaufrufe.

## Sicherheit / Datenschutz

- Aktuelle Auth ist rein clientseitig (nur UI-Schutz). Für echte Absicherung: Auth-Layer (JWT / NextAuth / Basic Auth) ergänzen.
- WebDAV Zugangsdaten ausschließlich in Server-Runtime (ENV) – niemals clientseitig ausgeben.

## Weiterentwicklung – Ideen

- Serverseitiges Vorwärmen (Warmup Function) → Cron Ping.
- Upload UI mit Drag & Drop + sofortigem WebDAV Push + DB Sync.
- Suchindex / Volltext (Titel / Tags).
- Rollenbasierte Auth & echte Session.
- Vorschaubilder (Thumbnails) generieren um Initial Load weiter zu verkleinern.

## Entwicklung

### Neue Features hinzufügen

1. Komponenten in `src/components/` erstellen
2. API-Routen in `src/app/api/` hinzufügen
3. Styling direkt in den Komponenten

## Build lokal (Production Test)

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
