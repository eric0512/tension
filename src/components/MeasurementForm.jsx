import React, { useState, useEffect } from 'react';
import { X, Clipboard } from 'lucide-react';
import { getBPStatus, getCurrentTimeStr, getTodayDateStr } from '../hooks/useTensionData';

export default function MeasurementForm({ isOpen, onClose, onSave, initialData }) {
  const [date, setDate] = useState(getTodayDateStr());
  const [slot, setSlot] = useState('matin');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [arm, setArm] = useState('gauche'); // 'gauche' ou 'droit'
  const [time, setTime] = useState(getCurrentTimeStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Remplir avec les données initiales si on est en mode édition
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date || getTodayDateStr());
        setSlot(initialData.slot || 'matin');
        setSys(initialData.sys || '');
        setDia(initialData.dia || '');
        setPulse(initialData.pulse || '');
        setArm(initialData.arm || 'gauche');
        setTime(initialData.time || getCurrentTimeStr());
        setNote(initialData.note || '');
      } else {
        // Réinitialisation par défaut
        setDate(getTodayDateStr());
        setSlot('matin');
        setSys('');
        setDia('');
        setPulse('');
        setArm('gauche');
        setTime(getCurrentTimeStr());
        setNote('');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const s = parseInt(sys, 10);
    const d = parseInt(dia, 10);
    const p = parseInt(pulse, 10);

    if (isNaN(s) || s < 50 || s > 250) {
      setError('Veuillez entrer une pression systolique valide (entre 50 et 250 mmHg).');
      return;
    }
    if (isNaN(d) || d < 30 || d > 150) {
      setError('Veuillez entrer une pression diastolique valide (entre 30 et 150 mmHg).');
      return;
    }
    if (isNaN(p) || p < 30 || p > 200) {
      setError('Veuillez entrer un pouls valide (entre 30 et 200 bpm).');
      return;
    }

    onSave(date, slot, { sys: s, dia: d, pulse: p, arm, time, note });
    onClose();
  };

  // Aperçu de la classification en temps réel
  const statusPreview = getBPStatus(sys, dia);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {initialData && initialData.sys ? 'Modifier la mesure' : 'Ajouter une mesure'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              {error}
            </div>
          )}

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label" htmlFor="form-date">Date</label>
              <input
                id="form-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="form-slot">Moment du jour</label>
              <select
                id="form-slot"
                className="form-input"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                required
                disabled={!!(initialData && initialData.isEditMode)}
              >
                <option value="matin">☀️ Matin</option>
                <option value="midi">🌤️ Midi</option>
                <option value="soir">🌙 Soir</option>
              </select>
            </div>
          </div>

          {/* Saisie du bras de la mesure */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Bras mesuré</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                className={`nav-tab ${arm === 'gauche' ? 'active' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)' }}
                onClick={() => setArm('gauche')}
              >
                👈 Bras Gauche
              </button>
              <button
                type="button"
                className={`nav-tab ${arm === 'droit' ? 'active' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)' }}
                onClick={() => setArm('droit')}
              >
                Bras Droit 👉
              </button>
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label" htmlFor="form-sys">Systolique (Max)</label>
              <div className="form-input-unit">
                <input
                  id="form-sys"
                  type="number"
                  placeholder="ex: 120"
                  className="form-input"
                  value={sys}
                  onChange={(e) => setSys(e.target.value)}
                  min="50"
                  max="250"
                  required
                />
                <span className="input-unit-label">mmHg</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="form-dia">Diastolique (Min)</label>
              <div className="form-input-unit">
                <input
                  id="form-dia"
                  type="number"
                  placeholder="ex: 80"
                  className="form-input"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  min="30"
                  max="150"
                  required
                />
                <span className="input-unit-label">mmHg</span>
              </div>
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label" htmlFor="form-pulse">Pouls (FC)</label>
              <div className="form-input-unit">
                <input
                  id="form-pulse"
                  type="number"
                  placeholder="ex: 70"
                  className="form-input"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  min="30"
                  max="200"
                  required
                />
                <span className="input-unit-label">bpm</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="form-time">Heure de la mesure</label>
              <input
                id="form-time"
                type="time"
                className="form-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="form-note">Notes / Symptômes (Optionnel)</label>
            <input
              id="form-note"
              type="text"
              placeholder="ex: fatigué au réveil, après le café..."
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Classification Preview */}
          {statusPreview && (
            <div 
              className={`status-badge ${statusPreview.class}`}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                {statusPreview.label}
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 400 }}>
                {statusPreview.desc}
              </span>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              <Clipboard size={16} />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
