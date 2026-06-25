import React, { useState } from 'react';
import { Sun, CloudSun, Moon, ChevronLeft, ChevronRight, Calendar, Heart, Plus, Edit2, Info, Activity } from 'lucide-react';
import { getBPStatus, getTodayDateStr } from '../hooks/useTensionData';

export default function Dashboard({ data, onSaveMeasurement, onAddClick }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());

  // Obtenir les données du jour sélectionné
  const dayData = data[selectedDate] || {
    date: selectedDate,
    slots: { matin: null, midi: null, soir: null },
    avg: null,
  };

  // Nombre de mesures terminées aujourd'hui (sur 3)
  const completedSlots = Object.values(dayData.slots).filter(Boolean).length;
  
  // Navigation de date
  const changeDate = (offset) => {
    const currentDate = new Date(selectedDate + 'T12:00:00'); // Éviter les soucis de fuseau horaire
    currentDate.setDate(currentDate.getDate() + offset);
    const y = currentDate.getFullYear();
    const m = ('' + (currentDate.getMonth() + 1)).padStart(2, '0');
    const d = ('' + currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleGoToToday = () => {
    setSelectedDate(getTodayDateStr());
  };

  // Formater la date en français pour l'affichage (ex: Jeudi 25 Juin 2026)
  const formatDisplayDate = (dateStr) => {
    if (dateStr === getTodayDateStr()) return "Aujourd'hui";
    const dateObj = new Date(dateStr + 'T12:00:00');
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const slotsMeta = {
    matin: { label: 'Matin', icon: <Sun size={20} style={{ color: '#eab308' }} />, desc: 'Au réveil, avant le petit-déjeuner' },
    midi: { label: 'Midi', icon: <CloudSun size={20} style={{ color: '#3b82f6' }} />, desc: 'Avant le déjeuner' },
    soir: { label: 'Soir', icon: <Moon size={20} style={{ color: '#6366f1' }} />, desc: 'Avant le coucher' }
  };

  // Calcul du cercle de progression
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = (completedSlots / 3) * 100;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Récupérer le statut médical pour la moyenne globale
  const bpStatus = dayData.avg?.global ? getBPStatus(dayData.avg.global.sys, dayData.avg.global.dia) : null;

  // Rendu d'une section de moyennes par bras
  const renderAvgSection = (title, avg, armColor, defaultLabel) => {
    const status = avg ? getBPStatus(avg.sys, avg.dia) : null;
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: armColor }}></span>
            {title}
          </h4>
          {status && (
            <span className={`status-badge ${status.class}`} style={{ margin: 0, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 600 }}>
              {status.label}
            </span>
          )}
        </div>
        
        {avg ? (
          <div className="summary-row" style={{ marginBottom: 0 }}>
            <div className="summary-item" style={{ padding: '0.8rem 0.5rem' }}>
              <div className="summary-label" style={{ fontSize: '0.7rem' }}>Systolique</div>
              <div className="summary-value" style={{ fontSize: '1.4rem', color: status ? `var(--bp-${status.class.split('-')[1]})` : 'inherit' }}>
                {avg.sys}
                <span style={{ fontSize: '0.7rem' }}>mmHg</span>
              </div>
            </div>
            <div className="summary-item" style={{ padding: '0.8rem 0.5rem' }}>
              <div className="summary-label" style={{ fontSize: '0.7rem' }}>Diastolique</div>
              <div className="summary-value" style={{ fontSize: '1.4rem', color: status ? `var(--bp-${status.class.split('-')[1]})` : 'inherit' }}>
                {avg.dia}
                <span style={{ fontSize: '0.7rem' }}>mmHg</span>
              </div>
            </div>
            <div className="summary-item" style={{ padding: '0.8rem 0.5rem' }}>
              <div className="summary-label" style={{ fontSize: '0.7rem' }}>Pouls</div>
              <div className="summary-value" style={{ fontSize: '1.4rem' }}>
                {avg.pulse}
                <span style={{ fontSize: '0.7rem' }}>bpm</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            background: 'rgba(10, 15, 29, 0.2)', 
            padding: '0.8rem', 
            borderRadius: 'var(--radius-md)', 
            textAlign: 'center', 
            fontSize: '0.8rem', 
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            border: '1px dashed rgba(255,255,255,0.03)'
          }}>
            Aucune mesure prise sur le {defaultLabel}.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-grid">
      
      {/* Colonne Gauche : Averages + Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Sélecteur de date */}
        <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn-icon" onClick={() => changeDate(-1)} title="Jour précédent">
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '1.05rem', fontWeight: 600, minWidth: '180px', textAlign: 'center' }}>
              {formatDisplayDate(selectedDate)}
            </span>
            <button className="btn-icon" onClick={() => changeDate(1)} title="Jour suivant">
              <ChevronRight size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {selectedDate !== getTodayDateStr() && (
              <button 
                onClick={handleGoToToday}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Aujourd'hui
              </button>
            )}
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Calendar size={16} />
              <span>{selectedDate.split('-').reverse().join('/')}</span>
            </div>
          </div>
        </div>

        {/* Moyennes du Jour (Bras Gauche & Bras Droit) */}
        <div className="glass-card">
          <div className="card-title">
            <Heart size={20} style={{ color: '#ef4444' }} />
            Moyennes du Jour
          </div>
          
          {dayData.avg ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {renderAvgSection('Bras Gauche', dayData.avg.gauche, 'var(--primary)', 'bras gauche')}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }}></div>
              {renderAvgSection('Bras Droit', dayData.avg.droit, 'var(--accent)', 'bras droit')}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1.5rem 0' }}>
              Entrez au moins une mesure pour calculer les moyennes journalières.
            </div>
          )}
        </div>

        {/* Créneaux du Jour */}
        <div className="glass-card">
          <div className="card-title">
            <Activity size={20} style={{ color: 'var(--primary)' }} />
            Mesures de la Journée
          </div>

          <div className="slots-container">
            {Object.entries(slotsMeta).map(([key, meta]) => {
              const slotData = dayData.slots[key];

              return (
                <div 
                  key={key} 
                  className="slot-card"
                  onClick={() => onAddClick(selectedDate, key, slotData)}
                >
                  <div className="slot-info">
                    <div className="slot-icon-wrapper">
                      {meta.icon}
                    </div>
                    <div>
                      <div className="slot-name">{meta.label}</div>
                      <div className="slot-time">{slotData ? `Prise à ${slotData.time}` : meta.desc}</div>
                    </div>
                  </div>

                  <div className="slot-data">
                    {slotData ? (
                      <>
                        <div className="slot-numbers">
                          <div className="slot-bp">
                            {slotData.sys}/{slotData.dia} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mmHg</span>
                          </div>
                          <div className="slot-pulse">
                            💓 {slotData.pulse} bpm • {slotData.arm === 'droit' ? 'Bras droit 👉' : '👈 Bras gauche'}
                          </div>
                        </div>
                        <button className="btn-icon edit" aria-label="Modifier">
                          <Edit2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="slot-empty">Pas de mesure</span>
                        <button 
                          className="btn-add-inline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddClick(selectedDate, key, null);
                          }}
                        >
                          <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Ajouter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Colonne Droite : Status & Progress Wheel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Carte de Complétion */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="card-title">
            <Info size={20} style={{ color: 'var(--accent)' }} />
            Statut & Suivi
          </div>

          <div className="status-card-content">
            <div className="progress-ring-container">
              <svg className="chart-svg" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--secondary)" />
                  </linearGradient>
                </defs>
                <circle 
                  className="progress-ring-bg" 
                  cx="80" 
                  cy="80" 
                  r={radius} 
                />
                <circle 
                  className="progress-ring-bar" 
                  cx="80" 
                  cy="80" 
                  r={radius} 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="progress-ring-text">
                <div className="progress-ring-number">{completedSlots}/3</div>
                <div className="progress-ring-label">Mesures</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {completedSlots === 0 && "Journée non commencée"}
              {completedSlots === 1 && "Une mesure enregistrée"}
              {completedSlots === 2 && "Presque complet !"}
              {completedSlots === 3 && "Objectif atteint !"}
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '220px', lineHeight: '1.4' }}>
              {completedSlots === 0 && "Mesurez votre tension 3 fois aujourd'hui (matin, midi et soir) pour un suivi optimal."}
              {completedSlots === 1 && "Excellent début. Pensez à mesurer votre tension aux autres créneaux de la journée."}
              {completedSlots === 2 && "Plus qu'une mesure aujourd'hui pour obtenir une moyenne journalière complète."}
              {completedSlots === 3 && "Superbe ! Toutes les mesures sont enregistrées. Votre moyenne journalière est calculée."}
            </p>

            {/* Diagnostic médical de la moyenne */}
            {bpStatus ? (
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Classification (Globale)
                </div>
                <div className={`status-badge ${bpStatus.class}`}>
                  {bpStatus.label}
                </div>
                <div className="status-description">
                  {bpStatus.desc}
                </div>
              </div>
            ) : completedSlots > 0 ? (
              <div style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '200px' }}>
                En cours de calcul de la classification...
              </div>
            ) : null}
          </div>
        </div>

      </div>

    </div>
  );
}
