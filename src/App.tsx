import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import type { DropResult } from '@hello-pangea/dnd';
import type { Song } from './types';
import { extractVideoId, generateId, formatTime } from './utils';
import { DualPlayer } from './components/DualPlayer';
import type { DualPlayerRef } from './components/DualPlayer';
import { QueuePanel } from './components/QueuePanel';

function App() {
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [crossfadeDuration, setCrossfadeDuration] = useState(5);
  
  const playerRef = useRef<DualPlayerRef>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('mixapp_queue');
    if (savedQueue) {
      try { setQueue(JSON.parse(savedQueue)); } catch (e) { console.error(e); }
    }
    const savedTheme = localStorage.getItem('mixapp_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Save to localStorage when queue changes
  useEffect(() => {
    localStorage.setItem('mixapp_queue', JSON.stringify(queue));
  }, [queue]);

  // Apply theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('mixapp_theme', theme);
  }, [theme]);

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
  }, []);

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

      setQueue(prev => [...prev, newSong]);
      setInputUrl('');
      
      if (queue.length === 0) {
        setIsPlaying(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch video info");
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progress.duration || !playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    playerRef.current.seekTo(ratio * progress.duration);
  };

  const handleNext = useCallback(() => {
    if (playerRef.current) playerRef.current.manualSkip();
  }, []);

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
      <div className="app">
        <header>
          <div className="wordmark"><span className="dot"></span>Mixtape</div>
          <div className="theme-toggle" role="group" aria-label="Tema tampilan">
            <button 
              type="button" 
              data-theme-choice="light" 
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
            >Light</button>
            <button 
              type="button" 
              data-theme-choice="dark" 
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >Dark</button>
          </div>
        </header>

        <section>
          <div className="section-label">Tambah lagu</div>
          <form className="add-track" onSubmit={handleAddSong}>
            <input 
              type="text" 
              placeholder="Tempel link YouTube di sini…" 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit">Tambah</button>
          </form>
        </section>

        <QueuePanel 
          queue={queue}
          currentIndex={currentIndex}
          onDragEnd={handleDragEnd}
          onRemove={(idx) => {
            setQueue(q => q.filter((_, i) => i !== idx));
            if (idx < currentIndex) setCurrentIndex(c => c - 1);
            else if (idx === currentIndex && idx === queue.length - 1) {
              setCurrentIndex(0);
              setIsPlaying(false);
            }
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
    </>
  );
}

export default App;
