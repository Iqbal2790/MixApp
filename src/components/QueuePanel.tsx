import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Trash2, GripVertical } from 'lucide-react';
import type { Song } from '../types';

interface QueuePanelProps {
  queue: Song[];
  currentIndex: number;
  onDragEnd: (result: DropResult) => void;
  onRemove: (index: number) => void;
  onUpdateSong: (index: number, updates: Partial<Song>) => void;
  onPlaySong: (index: number) => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({ queue, currentIndex, onDragEnd, onRemove, onUpdateSong, onPlaySong }) => {
  return (
    <div className="queue-list-container">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="queue-list">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {queue.map((song, index) => (
                <Draggable key={song.id} draggableId={song.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`queue-item ${index === currentIndex ? 'active' : ''}`}
                    >
                      <div {...provided.dragHandleProps} className="drag-handle">
                        <GripVertical size={16} />
                      </div>
                      
                      <img src={song.thumbnail} alt={song.title} className="queue-item-thumb" onClick={() => onPlaySong(index)} style={{ cursor: 'pointer' }} />
                      
                      <div className="queue-item-info">
                        <h4 onClick={() => onPlaySong(index)} style={{ cursor: 'pointer' }}>{song.title}</h4>
                        <div className="trim-controls">
                          <input
                            type="number"
                            className="trim-input"
                            placeholder="Start (s)"
                            value={song.startTime || ''}
                            onChange={(e) => onUpdateSong(index, { startTime: Number(e.target.value) || 0 })}
                            min="0"
                          />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>-</span>
                          <input
                            type="number"
                            className="trim-input"
                            placeholder="End (s)"
                            value={song.endTime || ''}
                            onChange={(e) => onUpdateSong(index, { endTime: Number(e.target.value) || 0 })}
                            min="0"
                          />
                        </div>
                      </div>

                      <button className="btn-remove" onClick={() => onRemove(index)} title="Remove from queue">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {queue.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
          Queue is empty. Add a YouTube link!
        </div>
      )}
    </div>
  );
};
