"use client";
import { useEffect, useMemo, useState } from "react";

type SongCategory = "noten" | "texte" | "videos";
type FilterOption = "alle" | SongCategory;
type FlagField = "isChristmas" | "languageGerman" | "languageEnglish" | "languageOther";

interface AdminSong {
  _id: string;
  title: string;
  folder?: string;
  category: SongCategory;
  imageCount: number;
  images?: string[];
  videoUrl?: string;
  isChristmas?: boolean;
  languageGerman?: boolean;
  languageEnglish?: boolean;
  languageOther?: boolean;
}

interface SongResponse {
  _id: string;
  title: string;
  folder?: string;
  images?: string[];
  imageCount?: number;
  isChristmas?: boolean;
  languageGerman?: boolean;
  languageEnglish?: boolean;
  languageOther?: boolean;
}

interface VideoResponse {
  _id: string;
  title: string;
  videoUrl?: string;
}

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: "Alle", value: "alle" },
  { label: "Noten", value: "noten" },
  { label: "Texte", value: "texte" },
  { label: "Videos", value: "videos" }
];

export default function AdminSongList() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("alle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const [notenRes, texteRes, videosRes] = await Promise.all([
        fetch("/api/songs?type=noten&minimal=1"),
        fetch("/api/songs?type=texte&minimal=1"),
        fetch("/api/songs?type=videos")
      ]);

      if (!notenRes.ok || !texteRes.ok) {
        throw new Error("Fetch fehlgeschlagen");
      }

      const [noten, texte] = await Promise.all([
        notenRes.json() as Promise<SongResponse[]>,
        texteRes.json() as Promise<SongResponse[]>
      ]);
      const videos: VideoResponse[] = videosRes.ok ? await videosRes.json() : [];

      const mapped: AdminSong[] = [
        ...noten.map((s) => ({
          _id: s._id,
          title: s.title,
          folder: s.folder,
          category: "noten" as const,
          imageCount: s.imageCount ?? (Array.isArray(s.images) ? s.images.length : 0),
          images: s.images,
          isChristmas: s.isChristmas,
          languageGerman: s.languageGerman,
          languageEnglish: s.languageEnglish,
          languageOther: s.languageOther
        })),
        ...texte.map((s) => ({
          _id: s._id,
          title: s.title,
          folder: s.folder,
          category: "texte" as const,
          imageCount: s.imageCount ?? (Array.isArray(s.images) ? s.images.length : 0),
          images: s.images,
          isChristmas: s.isChristmas,
          languageGerman: s.languageGerman,
          languageEnglish: s.languageEnglish,
          languageOther: s.languageOther
        })),
        ...videos.map((v) => ({
          _id: v._id,
          title: v.title,
          category: "videos" as const,
          imageCount: 0,
          videoUrl: v.videoUrl ?? ""
        }))
      ];

      setSongs(mapped.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const updateSong = async (songId: string, updates: Partial<AdminSong>) => {
    const target = songs.find(s => s._id === songId);
    if (!target || target.category === "videos") return;

    try {
      const res = await fetch("/api/update-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, updates })
      });

      if (!res.ok) throw new Error("Update fehlgeschlagen");

      setSongs(prev => prev
        .map(song => (song._id === songId ? { ...song, ...updates } : song))
        .sort((a, b) => a.title.localeCompare(b.title))
      );
      setEditingId(null);
    } catch (err) {
      alert("Fehler beim Speichern: " + (err instanceof Error ? err.message : "Unbekannter Fehler"));
    }
  };

  const deleteSong = async (song: AdminSong) => {
    if (!song) return;
    const displayName = song.folder || song.title;
    if (!window.confirm(`"${displayName}" wirklich löschen?`)) return;

    setDeletingId(song._id);
    try {
      const res = await fetch("/api/delete-song", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songName: displayName, category: song.category })
      });

      if (!res.ok) throw new Error("Löschen fehlgeschlagen");

      setSongs(prev => prev.filter(s => s._id !== song._id));
    } catch (err) {
      alert("Fehler beim Löschen: " + (err instanceof Error ? err.message : "Unbekannter Fehler"));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleFlag = (song: AdminSong, field: FlagField) => {
    if (song.category === "videos") return;
    updateSong(song._id, { [field]: !song[field] });
  };

  const startEdit = (song: AdminSong) => {
    if (song.category === "videos") return;
    setEditingId(song._id);
    setEditTitle(song.title);
  };

  const saveTitle = (song: AdminSong) => {
    if (song.category === "videos") return;
    if (editTitle.trim() && editTitle !== song.title) {
      updateSong(song._id, { title: editTitle.trim() });
    } else {
      setEditingId(null);
    }
  };

  const filteredSongs = useMemo(() => {
    return songs
      .filter(song => (activeFilter === "alle" ? true : song.category === activeFilter))
      .filter(song => song.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [songs, activeFilter, searchTerm]);

  const renderCheckbox = (song: AdminSong, field: FlagField) => {
    if (song.category === "videos") return <span>—</span>;
    return (
      <input
        type="checkbox"
        checked={Boolean(song[field])}
        onChange={() => toggleFlag(song, field)}
      />
    );
  };

  if (loading) return <div className="text-center py-5">Lade Songs...</div>;
  if (error) return <div className="alert alert-danger">Fehler: {error}</div>;

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 mb-4 align-items-center">
        <div className="btn-group" role="group" aria-label="Kategorie-Filter">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`btn ${activeFilter === value ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setActiveFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="form-control form-control-lg"
          placeholder="Einträge durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ background: "#2a2a2a", color: "#fff", border: "1px solid #495057", minWidth: 260 }}
        />
      </div>

      <div className="mb-3 text-muted">
        {filteredSongs.length} Eintrag{filteredSongs.length === 1 ? "" : "e"} gefunden
      </div>

      <div
        className="table-responsive"
        style={{ maxHeight: "70vh", overflowY: "auto", border: "1px solid #2f2f2f", borderRadius: 12 }}
      >
        <table className="table table-dark table-striped table-hover align-middle">
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Titel</th>
              <th style={{ width: "12%" }}>Kategorie</th>
              <th style={{ width: "8%" }}>{activeFilter === "videos" ? "Typ" : "Bilder"}</th>
              <th style={{ width: "10%" }} className="text-center">🎄</th>
              <th style={{ width: "10%" }} className="text-center">🇩🇪</th>
              <th style={{ width: "10%" }} className="text-center">🇬🇧</th>
              <th style={{ width: "10%" }} className="text-center">🌍</th>
              <th style={{ width: "12%" }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredSongs.map(song => (
              <tr key={`${song.category}-${song._id}`}>
                <td>
                  {editingId === song._id ? (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle(song);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      style={{ background: "#3a3a3a", color: "#fff", border: "1px solid #495057" }}
                    />
                  ) : (
                    <div>
                      <div className="fw-semibold">{song.title}</div>
                      {song.folder && song.category !== "videos" && (
                        <div className="text-muted small">{song.folder}</div>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${song.category === "videos" ? "bg-info" : song.category === "noten" ? "bg-primary" : "bg-success"}`}>
                    {song.category}
                  </span>
                </td>
                <td>{song.category === "videos" ? "Video" : song.imageCount}</td>
                <td className="text-center">{renderCheckbox(song, "isChristmas")}</td>
                <td className="text-center">{renderCheckbox(song, "languageGerman")}</td>
                <td className="text-center">{renderCheckbox(song, "languageEnglish")}</td>
                <td className="text-center">{renderCheckbox(song, "languageOther")}</td>
                <td>
                  <div className="d-flex flex-wrap gap-2">
                    {song.category === "videos" ? (
                      song.videoUrl ? (
                        <a
                          href={song.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-info btn-sm"
                        >
                          Öffnen
                        </a>
                      ) : (
                        <span className="text-muted">Keine URL</span>
                      )
                    ) : editingId === song._id ? (
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-success" onClick={() => saveTitle(song)}>Speichern</button>
                        <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Abbrechen</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline-light btn-sm" onClick={() => startEdit(song)}>
                        Titel bearbeiten
                      </button>
                    )}

                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => deleteSong(song)}
                      disabled={deletingId === song._id}
                    >
                      {deletingId === song._id ? "Löschen…" : "Löschen"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSongs.length === 0 && (
        <div className="text-center text-muted py-5">
          Keine Einträge gefunden
        </div>
      )}
    </div>
  );
}
