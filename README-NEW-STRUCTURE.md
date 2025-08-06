# 🎼 Musiknoten Verwaltung

Eine einfache Next.js-Anwendung zur Anzeige von Musiknoten ohne Datenbank-Setup.

## ✨ Features

- **Keine Datenbank erforderlich** - alles über Ordnerstruktur organisiert
- **Automatische Song-Erkennung** aus Ordnernamen
- **Mehrere Bilder pro Song** mit Navigation
- **Vollbild-Anzeige** optimiert für verschiedene Bildschirmgrößen
- **Tastatursteuerung** (Pfeiltasten, ESC)
- **Responsive Design** für Desktop und Mobile

## 📁 Ordnerstruktur für Songs

```
public/images/noten/
├── Fur Elise/
│   ├── page1.jpg
│   └── page2.jpg
├── Moonlight Sonata/
│   ├── page1.jpg
│   ├── page2.jpg
│   └── page3.jpg
└── Clair de Lune/
    └── page1.jpg
```

## 🚀 Setup

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd noten-verwaltung
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Songs hinzufügen**
   - Erstellen Sie einen Unterordner in `public/images/noten/`
   - Der Ordnername wird als Song-Titel angezeigt
   - Fügen Sie JPG/PNG-Bilder hinzu (werden alphabetisch sortiert)

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

## 📝 Songs hinzufügen

1. **Neuen Ordner erstellen**: `public/images/noten/Mein Neuer Song/`
2. **Bilder hinzufügen**: `page1.jpg`, `page2.jpg`, etc.
3. **Fertig!** - Der Song erscheint automatisch in der App

## 🎹 Unterstützte Bildformate

- JPG/JPEG
- PNG
- GIF
- WebP

## ⌨️ Tastatursteuerung

- **←/→** - Zwischen Seiten navigieren
- **ESC** - Zurück zur Übersicht

## 🛠️ Technologien

- Next.js 15
- React 19
- TypeScript
- Bootstrap 5
- Filesystem-basierte Architektur (keine Datenbank)

## 📋 Vorteile gegenüber Datenbank-Lösung

- ✅ **Einfacher Setup** - keine MongoDB-Konfiguration
- ✅ **Einfache Wartung** - Songs durch Dateisystem verwalten
- ✅ **Bessere Performance** - keine Netzwerk-Requests zur DB
- ✅ **Portable** - funktioniert überall ohne externe Services
- ✅ **Versionskontrolle** - Bilder können mit Git verwaltet werden
