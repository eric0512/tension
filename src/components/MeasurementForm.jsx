import React, { useState, useEffect } from 'react';
import { X, Clipboard } from 'lucide-react';
import { getBPStatus, getCurrentTimeStr, getTodayDateStr } from '../hooks/useTensionData';

export default function MeasurementForm({ isOpen, onClose, onSave, initialData }) {
  const [date, setDate] = useState(getTodayDateStr());
  const [slot, setSlot] = useState('matin');
  const [time, setTime] = useState(getCurrentTimeStr());
  
  // États Bras Gauche
  const [sysLeft, setSysLeft] = useState('');
  const [diaLeft, setDiaLeft] = useState('');
  const [pulseLeft, setPulseLeft] = useState('');

  // États Bras Droit
  const [sysRight, setSysRight] = useState('');
  const [diaRight, setDiaRight] = useState('');
  const [pulseRight, setPulseRight] = useState('');

  const [error, setError] = useState('');

  // Remplir avec les données initiales si on est en mode édition
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date || getTodayDateStr());
        setSlot(initialData.slot || 'matin');
        setTime(initialData.time || getCurrentTimeStr());

        // Hydrater le bras gauche
        setSysLeft(initialData.leftData?.sys || '');
        setDiaLeft(initialData.leftData?.dia || '');
        setPulseLeft(initialData.leftData?.pulse || '');

        // Hydrater le bras droit
        setSysRight(initialData.rightData?.sys || '');
        setDiaRight(initialData.rightData?.dia || '');
        setPulseRight(initialData.rightData?.pulse || '');
      } else {
        // Réinitialisation
        setDate(getTodayDateStr());
        setSlot('matin');
        setTime(getCurrentTimeStr());
        
        setSysLeft('');
        setDiaLeft('');
        setPulseLeft('');

        setSysRight('');
        setDiaRight('');
        setPulseRight('');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const hasLeft = sysLeft || diaLeft || pulseLeft;
    const hasRight = sysRight || diaRight || pulseRight;

    if (!hasLeft && !hasRight) {
      setError('Veuillez saisir au moins une mesure (bras gauche ou bras droit).');
      return;
    }

    let leftValues = null;
    let rightValues = null;

    // Validation Bras Gauche
    if (hasLeft) {
      const sL = parseInt(sysLeft, 10);
      const dL = parseInt(diaLeft, 10);
      const pL = parseInt(pulseLeft, 10);

      if (isNaN(sL) || sL < 50 || sL > 250) {
        setError('Pression systolique du bras gauche invalide (entre 50 et 250 mmHg).');
        return;
      }
      if (isNaN(dL) || dL < 30 || dL > 150) {
        setError('Pression diastolique du bras gauche invalide (entre 30 et 150 mmHg).');
        return;
      }
      if (isNaN(pL) || pL < 30 || pL > 200) {
        setError('Pouls du bras gauche invalide (entre 30 et 200 bpm).');
        return;
      }

      leftValues = { sys: sL, dia: dL, pulse: pL };
    }

    // Validation Bras Droit
    if (hasRight) {
      const sR = parseInt(sysRight, 10);
      const dR = parseInt(diaRight, 10);
      const pR = parseInt(pulseRight, 10);

      if (isNaN(sR) || sR < 50 || sR > 250) {
        setError('Pression systolique du bras droit invalide (entre 50 et 250 mmHg).');
        return;
      }
      if (isNaN(dR) || dR < 30 || dR > 150) {
        setError('Pression diastolique du bras droit invalide (entre 30 et 150 mmHg).');
        return;
      }
      if (isNaN(pR) || pR < 30 || pR > 200) {
        setError('Pouls du bras droit invalide (entre 30 et 200 bpm).');
        return;
      }

      rightValues = { sys: sR, dia: dR, pulse: pR };
    }

    onSave(date, slot, leftValues, rightValues, time);
    onClose();
  };

  // Diagnostic en temps réel
  const statusLeft = getBPStatus(sysLeft, diaLeft);
  const statusRight = getBPStatus(sysRight, diaRight);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {initialData && (initialData.leftData || initialData.rightData) ? 'Modifier la mesure' : 'Ajouter une mesure'}
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

          {/* Saisie en colonnes responsive */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.25rem', 
            marginBottom: '1.25rem' 
          }}>
            
            {/* Colonne Bras Gauche */}
            <div className="settings-card" style={{ background: 'rgba(59, 130, 246, 0.02)', borderColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                👈 Bras Gauche
              </h3>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="form-sys-left" style={{ fontSize: '0.8rem' }}>Systolique (Max)</label>
                <div className="form-input-unit">
                  <input
                    id="form-sys-left"
                    type="number"
                    placeholder="ex: 120"
                    className="form-input"
                    value={sysLeft}
                    onChange={(e) => setSysLeft(e.target.value)}
                    min="50"
                    max="250"
                  />
                  <span className="input-unit-label" style={{ fontSize: '0.75rem' }}>mmHg</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="form-dia-left" style={{ fontSize: '0.8rem' }}>Diastolique (Min)</label>
                <div className="form-input-unit">
                  <input
                    id="form-dia-left"
                    type="number"
                    placeholder="ex: 80"
                    className="form-input"
                    value={diaLeft}
                    onChange={(e) => setDiaLeft(e.target.value)}
                    min="30"
                    max="150"
                  />
                  <span className="input-unit-label" style={{ fontSize: '0.75rem' }}>mmHg</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="form-pulse-left" style={{ fontSize: '0.8rem' }}>Pouls (FC)</label>
                <div className="form-input-unit">
                  <input
                    id="form-pulse-left"
                    type="number"
                    placeholder="ex: 70"
                    className="form-input"
                    value={pulseLeft}
                    onChange={(e) => setPulseLeft(e.target.value)}
                    min="30"
                    max="200"
                  />
                  <span className="input-unit-label" style={{ fontSize: '0.75rem' }}>bpm</span>
                </div>
              </div>

              {statusLeft && (
                <div className={`status-badge ${statusLeft.class}`} style={{ margin: '0.5rem 0 0 0', padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
                  {statusLeft.label}
                </div>
              )}
            </div>

            {/* Colonne Bras Droit */}
            <div className="settings-card" style={{ background: 'rgba(6, 182, 212, 0.02)', borderColor: 'rgba(6, 182, 212, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                Bras Droit 👉
              </h3>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="form-sys-right" style={{ fontSize: '0.8rem' }}>Systolique (Max)</label>
                <div className="form-input-unit">
                  <input
                    id="form-sys-right"
                    type="number"
                    placeholder="ex: 120"
                    className="form-input"
                    value={sysRight}
                    onChange={(e) => setSysRight(e.target.value)}
                    min="50"
                    max="250"
                  />
                  <span className="input-unit-label" style={{ fontSize: '0.75rem' }}>mmHg</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="form-dia-right" style={{ fontSize: '0.8rem' }}>Diastolique (Min)</label>
                <div className="form-input-unit">
                  <input
                    id="form-dia-right"
                    type="number"
                    placeholder="ex: 80"
                    className="form-input"
                    value={diaRight}
                    onChange={(e) => setDiaRight(e.target.value)}
                    min="30"
                    max="150"
                  />
                  <span className="input-unit-label" style={{ fontSize: '0.75rem' }}>mmHg</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="form-pulse-right" style={{ fontSize: '0.8rem' }}>Pouls (FC)</label>
                <div className="form-input-unit">
                  <input
                    id="form-pulse-right"
                    type="number"
                    placeholder="ex: 70"
                    className="form-input"
                    value={pulseRight}
                    onChange={(e) => setPulseRight(e.target.value)}
                    min="30"
                    max="200"
                  />
                  <span className="input-unit-label" style={{ fontSize: '0.75rem' }}>bpm</span>
                </div>
              </div>

              {statusRight && (
                <div className={`status-badge ${statusRight.class}`} style={{ margin: '0.5rem 0 0 0', padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
                  {statusRight.label}
                </div>
              )}
            </div>

          </div>

          <div className="form-group" style={{ maxWidth: '200px' }}>
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
