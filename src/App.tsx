import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, Volume2, Plus } from 'lucide-react';
import type { DropResult } from '@hello-pangea/dnd';
import type { Song } from './types';
import { extractVideoId, generateId, formatTime } from './utils';
import { DualPlayer } from './components/DualPlayer';
import { QueuePanel } from './components/QueuePanel';
import './App.css';

function App() {
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(100);
  const [inputUrl, setInputUrl] = useState('');
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mixapp_queue');
    if (saved) {
      try {
        setQueue(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse queue from local storage", e);
      }
    }
  }, []);

  // Save to localStorage when queue changes
  useEffect(() => {
    localStorage.setItem('mixapp_queue', JSON.stringify(queue));
  }, [queue]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight' && e.ctrlKey) {
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
      // Fetch metadata using noembed
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
      
      // Auto play if it's the first song
      if (queue.length === 0) {
        setIsPlaying(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch video info");
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0); // Reset to start or just stop
    }
  }, [currentIndex, queue.length]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Adjust currentIndex if necessary
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
    <div className="app-container">
      {/* LEFT: Player Section */}
      <section className="player-section glass-panel">
        <div className="header">
          <h1>MixApp</h1>
          <p style={{ color: 'var(--text-secondary)' }}>YouTube Music Mixer</p>
        </div>

        <div className="main-player-ui">
          <div className="thumbnail-container">
            {currentSong ? (
              <img src={currentSong.thumbnail} alt={currentSong.title} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No song playing
              </div>
            )}
          </div>
          
          <div className="song-info">
            <h2>{currentSong ? currentSong.title : 'Ready to Mix'}</h2>
            <p>{currentSong ? 'Playing' : 'Add a song to start'}</p>
          </div>

          <div className="progress-container">
            <div className="progress-bar" onClick={() => {
              // Not implementing seeking for now due to dual player complexity, but UI is there
            }}>
              <div className="progress-fill" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
            </div>
            <div className="time-info">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="controls">
            <button 
              className="btn-icon" 
              style={{ borderRadius: '50%' }}
              onClick={() => {
                if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
              }}
              disabled={!currentSong || currentIndex === 0}
            >
              <SkipForward size={24} style={{ transform: 'rotate(180deg)' }} />
            </button>
            
            <button 
              className="btn-play btn" 
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!currentSong}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
            </button>
            
            <button 
              className="btn-icon"
              style={{ borderRadius: '50%' }}
              onClick={handleNext}
              disabled={!currentSong || currentIndex >= queue.length - 1}
            >
              <SkipForward size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '300px', marginTop: '1rem' }}>
            <Volume2 size={20} color="var(--text-secondary)" />
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={masterVolume}
              onChange={(e) => setMasterVolume(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent-color)' }}
            />
          </div>
        </div>

        <DualPlayer 
          queue={queue}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          masterVolume={masterVolume}
          onNext={handleNext}
          onProgress={(t, d) => {
            setCurrentTime(t);
            setDuration(d);
          }}
        />
      </section>

      {/* RIGHT: Queue Section */}
      <section className="queue-section glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>Up Next</h3>
        
        <form onSubmit={handleAddSong} className="add-song-form">
          <input 
            type="text" 
            placeholder="Paste YouTube Link..." 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn" style={{ padding: '0.75rem' }}>
            <Plus size={20} />
          </button>
        </form>

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
      </section>
    </div>
  );
}

export default App;
