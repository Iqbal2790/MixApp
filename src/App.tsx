import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2 } from 'lucide-react';
import type { DropResult } from '@hello-pangea/dnd';
import type { Song } from './types';
import { extractVideoId, generateId, formatTime } from './utils';
import { DualPlayer } from './components/DualPlayer';
import type { DualPlayerRef } from './components/DualPlayer';
import { QueuePanel } from './components/QueuePanel';
import { supabase } from './lib/supabase';
import { Modal } from './components/Modal';

function App() {
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    return (localStorage.getItem('mixapp_theme') as 'light'|'dark') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('mixapp_theme', theme);
  }, [theme]);
  const [crossfadeDuration, setCrossfadeDuration] = useState(5);
  const [playlistTitle, setPlaylistTitle] = useState('My Mixtape');
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'prompt' | 'confirm';
    title: string;
    message?: string;
    inputValue?: string;
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    type: 'prompt',
    title: '',
    onConfirm: () => {}
  });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));
  
  const [library, setLibrary] = useState<{id: string, title: string}[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [allSongsId, setAllSongsId] = useState<string | null>(null);
  
  const playerRef = useRef<DualPlayerRef>(null);

  const fetchLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('id, title')
        .neq('title', 'Global_All_Songs')
        .order('created_at', { ascending: false });
      if (!error && data) setLibrary(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load from Supabase URL or localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pId = urlParams.get('p');
      
      if (pId) {
        try {
          const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', pId)
            .single();
            
          if (error) throw error;
          if (data) {
            setPlaylistId(pId);
            setPlaylistTitle(data.title);
            const seenIds = new Set<string>();
            const safeQueue = (data.songs || []).map((s: Song) => {
              if (!s.id || seenIds.has(s.id)) {
                const newId = Math.random().toString(36).substr(2, 9);
                seenIds.add(newId);
                return { ...s, id: newId };
              }
              seenIds.add(s.id);
              return s;
            });
            setQueue(safeQueue);
          }
        } catch (err) {
          console.error("Failed to load playlist", err);
          alert("Gagal memuat playlist dari URL.");
        }
      } else {
        // Fallback to local storage only if no URL param
        const savedQueue = localStorage.getItem('mixapp_queue');
        if (savedQueue) {
          try { setQueue(JSON.parse(savedQueue)); } catch (e) { console.error(e); }
        }
      }
      
      let localSongs: Song[] = [];
      const savedAllSongs = localStorage.getItem('mixapp_all_songs');
      if (savedAllSongs) {
        try { localSongs = JSON.parse(savedAllSongs); } catch { /* ignore */ }
      }
      
      try {
        const { data: allData } = await supabase.from('playlists').select('*').eq('title', 'Global_All_Songs');
        if (allData && allData.length > 0) {
          allData.sort((a, b) => (b.songs || []).length - (a.songs || []).length);
          const bestRow = allData[0];
          
          if (allData.length > 1) {
            const others = allData.slice(1).map(d => d.id);
            supabase.from('playlists').delete().in('id', others).then();
          }
          
          setAllSongsId(bestRow.id);
          const dbSongs = bestRow.songs || [];
          setAllSongs(dbSongs.length > 0 ? dbSongs : localSongs);
        } else {
          const { data: newData } = await supabase.from('playlists').insert({ title: 'Global_All_Songs', songs: localSongs }).select().single();
          if (newData) setAllSongsId(newData.id);
          setAllSongs(localSongs);
        }
      } catch (err) {
        setAllSongs(localSongs);
        console.error("Failed to sync global songs", err);
      }
    };
    
    loadData();
    fetchLibrary();
    const savedTheme = localStorage.getItem('mixapp_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Save to localStorage when queue changes
  useEffect(() => {
    localStorage.setItem('mixapp_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('mixapp_all_songs', JSON.stringify(allSongs));
    if (allSongsId) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        supabase.from('playlists').update({ songs: allSongs }).eq('id', allSongsId).abortSignal(abortController.signal).then();
      }, 1000);
      return () => {
        clearTimeout(timeoutId);
        abortController.abort();
      };
    }
  }, [allSongs, allSongsId]);

  // Auto-save to Supabase
  useEffect(() => {
    if (!playlistId && queue.length === 0) return;
    
    const abortController = new AbortController();
    
    const saveToDb = async () => {
      try {
        if (playlistId) {
          const { error } = await supabase
            .from('playlists')
            .update({ songs: queue, title: playlistTitle })
            .eq('id', playlistId)
            .abortSignal(abortController.signal);
          if (error && error.name !== 'AbortError') throw error;
        } else {
          const { data, error } = await supabase
            .from('playlists')
            .insert([{ title: playlistTitle, songs: queue }])
            .select()
            .abortSignal(abortController.signal)
            .single();
            
          if (error && error.name !== 'AbortError') {
            console.error("Supabase insert error details:", error);
            alert(`Gagal membuat playlist di database: ${error.message || JSON.stringify(error)}`);
            return;
          }
          if (data) {
            setPlaylistId(data.id);
            const url = new URL(window.location.href);
            url.searchParams.set('p', data.id);
            window.history.pushState({}, '', url);
            fetchLibrary(); // Refresh library when new playlist created
          }
        }
      } catch (err: any) {
        console.error("Auto-save failed", err);
      }
    };

    const timeoutId = setTimeout(saveToDb, 1000); // 1s debounce
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [queue, playlistTitle, playlistId]);

  // Apply theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('mixapp_theme', theme);
  }, [theme]);

  const handleNext = useCallback(() => {
    if (playerRef.current) playerRef.current.manualSkip();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight') { // removed ctrlKey requirement per ui-design.html
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext]);

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(inputUrl);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await res.json();
      
      const newSong: Song = {
        id: generateId(),
        videoId,
        title: data.title || 'Unknown Title',
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        startTime: 0,
        endTime: 0,
      };

      setAllSongs(prev => [newSong, ...prev]);
      setQueue(prev => [...prev, { ...newSong, id: generateId() }]);
      setInputUrl('');
      
    } catch (err) {
      console.error(err);
      alert("Failed to fetch video info");
    }
  };

  const handleAddFromLibrary = (song: Song) => {
    setQueue(q => {
      if (q.length === 0) {
        setIsPlaying(true);
      }
      return [...q, { ...song, id: generateId() }];
    });
  };
  
  const loadPlaylist = async (id: string) => {
    try {
      const { data, error } = await supabase.from('playlists').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) {
        setPlaylistId(data.id);
        setPlaylistTitle(data.title);
        const seenIds = new Set<string>();
        const uniqueQueue = (data.songs || []).map((s: Song) => {
           if (!s.id || seenIds.has(s.id)) {
              const newId = Math.random().toString(36).substr(2, 9);
              seenIds.add(newId);
              return { ...s, id: newId };
           }
           seenIds.add(s.id);
           return s;
        });
        setQueue(uniqueQueue);
        setCurrentIndex(0);
        setIsPlaying(false);
        const url = new URL(window.location.href);
        url.searchParams.set('p', data.id);
        window.history.pushState({}, '', url);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal memuat playlist.");
    }
  };

  const createNewPlaylist = (skipPrompt = false) => {
    if (skipPrompt) {
      setPlaylistId(null);
      setPlaylistTitle('My Mixtape');
      setQueue([]);
      setCurrentIndex(0);
      setIsPlaying(false);
      const url = new URL(window.location.href);
      url.searchParams.delete('p');
      window.history.pushState({}, '', url);
      return;
    }

    setModalState({
      isOpen: true,
      type: 'prompt',
      title: 'Masukkan nama playlist baru:',
      inputValue: 'My Mixtape',
      onConfirm: async (val) => {
        const title = (val && val.trim() !== '') ? val.trim() : 'My Mixtape';
        
        try {
          const { data, error } = await supabase
            .from('playlists')
            .insert([{ title, songs: [] }])
            .select()
            .single();
            
          if (error) throw error;
          
          if (data) {
            setPlaylistId(data.id);
            setPlaylistTitle(data.title);
            setQueue([]);
            setCurrentIndex(0);
            setIsPlaying(false);
            const url = new URL(window.location.href);
            url.searchParams.set('p', data.id);
            window.history.pushState({}, '', url);
            fetchLibrary();
          }
        } catch (err) {
          console.error(err);
          alert("Gagal membuat playlist");
        }
        
        closeModal();
      }
    });
  };

  const handleDeletePlaylist = async () => {
    if (!playlistId) return;
    
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Hapus Playlist',
      message: `Yakin ingin menghapus playlist "${playlistTitle}"?`,
      onConfirm: async () => {
        closeModal();
        try {
          const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
          if (error) throw error;
          
          createNewPlaylist(true);
          fetchLibrary();
        } catch (err) {
          console.error(err);
          alert("Gagal menghapus playlist.");
        }
      }
    });
  };

  const handleShare = async () => {
    if (queue.length === 0) {
      alert("Tambahkan lagu dulu!");
      return;
    }
    
    await navigator.clipboard.writeText(window.location.href);
    alert("Link playlist sudah disalin ke clipboard! Bagikan ke temanmu.");
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progress.duration || !playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    playerRef.current.seekTo(ratio * progress.duration);
  };



  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const handleNextActual = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [currentIndex, queue.length]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    if (result.source.index === currentIndex) {
      setCurrentIndex(result.destination.index);
    } else if (result.source.index < currentIndex && result.destination.index >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (result.source.index > currentIndex && result.destination.index <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }

    setQueue(items);
  };

  const currentSong = queue[currentIndex];

  return (
    <>
      <div className="app-grid">
        {/* LEFT PANEL: Playlists Library */}
        <aside className="panel-left">
          <div className="wordmark"><span className="dot"></span>MixApp</div>
          
          <button className="btn-new-playlist" onClick={() => createNewPlaylist(false)}>
            <Plus size={18} /> Playlist Baru
          </button>
          
          <div className="library-list">
            <h3 className="section-label">Your Library</h3>
            {library.map(p => (
              <div 
                key={p.id} 
                className={`library-item ${p.id === playlistId ? 'active' : ''}`}
                onClick={() => loadPlaylist(p.id)}
              >
                {p.title}
              </div>
            ))}
            {library.length === 0 && <div className="empty-text">Belum ada playlist</div>}
          </div>
        </aside>

        {/* MIDDLE PANEL: Current Playlist */}
        <main className="panel-middle">
          <div className="playlist-header-container">
            <input 
              type="text" 
              className="playlist-title-input" 
              value={playlistTitle} 
              onChange={(e) => setPlaylistTitle(e.target.value)} 
              aria-label="Nama Playlist"
            />
            <button className="btn-save" onClick={handleShare} disabled={queue.length === 0}>
              Bagikan Link
            </button>
            {playlistId && (
              <button className="btn-icon text-danger" onClick={handleDeletePlaylist} title="Hapus Playlist">
                <Trash2 size={18} />
              </button>
            )}
            <div className="theme-toggle" role="group" style={{ marginLeft: '1rem' }}>
              <button type="button" data-theme-choice="light" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button>
              <button type="button" data-theme-choice="dark" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button>
            </div>
          </div>

          <QueuePanel 
            queue={queue}
            currentIndex={currentIndex}
            onDragEnd={handleDragEnd}
            onRemove={(idx) => {
              setQueue(q => {
                const newQ = q.filter((_, i) => i !== idx);
                setCurrentIndex(c => {
                  if (idx < c) return c - 1;
                  if (idx === c && idx === q.length - 1) {
                    setIsPlaying(false);
                    return 0;
                  }
                  return c;
                });
                return newQ;
              });
            }}
            onUpdateSong={(idx, updates) => {
              setQueue(q => {
                const newQ = [...q];
                newQ[idx] = { ...newQ[idx], ...updates };
                return newQ;
              });
            }}
            onPlaySong={(idx) => {
              setCurrentIndex(idx);
              setIsPlaying(true);
            }}
          />
        </main>

        {/* RIGHT PANEL: All Songs */}
        <aside className="panel-right">
          <h3 className="section-label">Semua Lagu</h3>
          <form className="add-track" onSubmit={handleAddSong}>
            <input 
              type="text" 
              placeholder="Link YouTube..." 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit"><Plus size={18} /></button>
          </form>

          <div className="all-songs-list">
            {allSongs.map((song, i) => (
              <div key={i} className="all-song-item">
                <img src={song.thumbnail} alt="" className="all-song-thumb" />
                <div className="all-song-info">
                  <div className="all-song-title">{song.title}</div>
                </div>
                <div className="all-song-actions">
                  <button className="btn-icon" onClick={() => handleAddFromLibrary(song)} title="Tambahkan ke Playlist Aktif">
                    <Plus size={18} />
                  </button>
                  <button className="btn-icon text-danger" onClick={() => setAllSongs(s => s.filter((_, idx) => idx !== i))} title="Hapus dari Library">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {allSongs.length === 0 && <div className="empty-text">Tambahkan lagu dari YouTube untuk menyimpannya di koleksi Anda.</div>}
          </div>
        </aside>
      </div>

      <div className="player-bar">
        <div className="player-inner">
          <div className="now-playing"><strong>{currentSong ? currentSong.title : 'Belum ada lagu'}</strong></div>
          <div className="transport">
            <button className="transport-btn" aria-label="Lagu sebelumnya" onClick={handlePrev} disabled={!currentSong || currentIndex === 0}>
              <SkipBack size={24} />
            </button>
            <button className="transport-btn play" aria-label="Play/Pause" onClick={() => setIsPlaying(!isPlaying)} disabled={!currentSong}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
            </button>
            <button className="transport-btn" aria-label="Lagu berikutnya" onClick={handleNext} disabled={!currentSong || currentIndex >= queue.length - 1}>
              <SkipForward size={24} />
            </button>
            
            <div className="crossfade-track" aria-label="Progress lagu" onClick={handleSeek} style={{ cursor: 'pointer' }}>
              <div className="fill-a" style={{ width: `${progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0}%` }}></div>
            </div>
            
            <div className="time-info" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
            </div>
            
            <div className="crossfade-duration">
              Crossfade
              <select value={crossfadeDuration} onChange={(e) => setCrossfadeDuration(Number(e.target.value))}>
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={8}>8s</option>
              </select>
            </div>
          </div>
          <div className="shortcut-hint"><kbd>Space</kbd> play/pause · <kbd>→</kbd> lagu berikutnya</div>
        </div>
      </div>

      <DualPlayer 
        ref={playerRef}
        queue={queue}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        masterVolume={100}
        onNext={handleNextActual}
        onProgress={(currentTime, duration) => setProgress({ currentTime, duration })}
        crossfadeDuration={crossfadeDuration}
      />
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        inputValue={modalState.inputValue}
        onInputChange={(val) => setModalState(prev => ({ ...prev, inputValue: val }))}
        onConfirm={() => modalState.onConfirm(modalState.inputValue)}
        onCancel={closeModal}
      />
    </>
  );
}

export default App;
