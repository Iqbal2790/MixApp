import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  type: 'prompt' | 'confirm';
  inputValue?: string;
  onInputChange?: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  type, 
  inputValue, 
  onInputChange, 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">{title}</h3>
        {message && <p className="modal-message">{message}</p>}
        
        {type === 'prompt' && (
          <input 
            type="text" 
            className="modal-input" 
            value={inputValue} 
            onChange={(e) => onInputChange?.(e.target.value)} 
            autoFocus 
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm();
              if (e.key === 'Escape') onCancel();
            }}
          />
        )}
        
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Batal</button>
          <button className={`btn-primary ${type === 'confirm' ? 'danger' : ''}`} onClick={onConfirm}>
            {type === 'prompt' ? 'Simpan' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};
