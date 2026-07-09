import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Trash2, Scissors } from 'lucide-react';
import type { Song } from '../types';
import { formatTime } from '../utils';

interface QueuePanelProps {
  queue: Song[];
  currentIndex: number;
  onDragEnd: (result: DropResult) => void;
  onRemove: (index: number) => void;
  onUpdateSong: (index: number, updates: Partial<Song>) => void;
  onPlaySong: (index: number) => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({ queue, currentIndex, onDragEnd, onRemove, onUpdateSong, onPlaySong }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleTrim = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  return (
    <div className={`queue-wrap ${queue.length === 0 ? 'is-empty' : ''}`}>
      <div className="section-label">Antrian</div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="queue-list">
          {(provided) => (
            <div className="queue" {...provided.droppableProps} ref={provided.innerRef}>
              {queue.map((song, index) => {
                const isPlaying = index === currentIndex;
                const isExpanded = index === expandedIndex;
                
                return (
                  <Draggable key={song.id} draggableId={song.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{ ...provided.draggableProps.style, display: 'block', borderBottom: '1px solid var(--border)' }}
                      >
                        <div className={`track ${isPlaying ? 'playing' : ''}`}>
                          <div {...provided.dragHandleProps} className="track-index" style={{ cursor: 'grab' }}>
                            {index + 1}
                          </div>
                          
                          <div className="track-main" onClick={() => onPlaySong(index)} style={{ cursor: 'pointer' }}>
                            <div className="track-title">{song.title}</div>
                            <div className="track-meta">
                              {song.startTime > 0 || song.endTime > 0 ? (
                                <span>Trim: {formatTime(song.startTime)} - {song.endTime > 0 ? formatTime(song.endTime) : 'End'}</span>
                              ) : (
                                <span>Lagu penuh</span>
                              )}
                              {isPlaying && <span>· sedang diputar</span>}
                            </div>
                          </div>

                          <div className="track-actions">
                            <button className="icon-btn" onClick={() => toggleTrim(index)} title="Atur trim" aria-label="Atur trim">
                              <Scissors size={16} />
                            </button>
                            <button className="icon-btn" onClick={() => onRemove(index)} title="Hapus" aria-label="Hapus dari antrian">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="trim-panel" style={{ display: 'block', borderBottom: 'none' }}>
                            <div className="trim-row" style={{ marginBottom: '0.5rem' }}>
                              <span>Mulai (detik)</span>
                              <input 
                                type="number" 
                                min="0" 
                                value={song.startTime || ''}
                                onChange={(e) => onUpdateSong(index, { startTime: Number(e.target.value) || 0 })}
                                style={{ flex: 1, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)', padding: '2px 6px', borderRadius: '4px' }}
                              />
                            </div>
                            <div className="trim-row">
                              <span>Selesai (detik)</span>
                              <input 
                                type="number" 
                                min="0" 
                                value={song.endTime || ''}
                                onChange={(e) => onUpdateSong(index, { endTime: Number(e.target.value) || 0 })}
                                style={{ flex: 1, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)', padding: '2px 6px', borderRadius: '4px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="empty-state">
        Playlist baru masih kosong. Tambahkan lagu dari <strong>Semua Lagu</strong> di panel kanan untuk memulai mixtape kamu!
      </div>
    </div>
  );
};
