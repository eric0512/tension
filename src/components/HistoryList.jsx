import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Edit2, Trash2, Calendar, BookOpen, AlertTriangle, Plus } from 'lucide-react';
import { getBPStatus } from '../hooks/useTensionData';

export default function HistoryList({ data, onDelete, onEditClick }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedDays, setExpandedDays] = useState({});

  // Basculer l'affichage détaillé d'un jour
  const toggleDay = (dateStr) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  // Trier les dates par ordre décroissant (plus récent en premier)
  const sortedDates = Object.keys(data).sort((a, b) => b.localeCompare(a));

  // Filtrer les données selon la recherche et le statut
  const filteredDates = sortedDates.filter((dateStr) => {
    const day = data[dateStr];
    
    // Filtre recherche (recherche dans les notes de n'importe quel créneau ou dans la date)
    const formattedDate = dateStr.split('-').reverse().join('/');
    const matchesSearch = 
      formattedDate.includes(search) || 
      Object.values(day.slots).some(
        (slot) => slot && slot.note.toLowerCase().includes(search.toLowerCase())
      );

    // Filtre statut de la moyenne journalière
    let matchesStatus = true;
    if (statusFilter !== 'all' && day.avg) {
      const bpStatus = getBPStatus(day.avg.sys, day.avg.dia);
      matchesStatus = bpStatus && bpStatus.class === statusFilter;
    } else if (statusFilter !== 'all' && !day.avg) {
      matchesStatus = false; // Exclure si pas de moyenne calculée
    }

    return matchesSearch && matchesStatus;
  });

  const formatDisplayDate = (dateStr) => {
    const dateObj = new Date(dateStr + 'T12:00:00');
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const slotLabels = {
    matin: '☀️ Matin',
    midi: '🌤️ Midi',
    soir: '🌙 Soir',
  };

  return (
    <div className="glass-card">
      <div className="card-title">
        <BookOpen size={20} style={{ color: 'var(--secondary)' }} />
        Journal d'Historique
      </div>

      {/* Contrôles de filtrage */}
      <div className="history-controls">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }} 
          />
          <input
            type="text"
            placeholder="Rechercher une note ou date..."
            className="history-search"
            style={{ paddingLeft: '2.25rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="history-search"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '220px' }}
          >
            <option value="all">Tous les diagnostics</option>
            <option value="status-normal">🟢 Tension Normale</option>
            <option value="status-elevated">🟡 Tension Élevée</option>
            <option value="status-stage1">🟠 Hypertension Stade 1</option>
            <option value="status-stage2">🔴 Hypertension Stade 2</option>
            <option value="status-crisis">🚨 Crise Hypertensive</option>
          </select>
        </div>
      </div>

      {/* Liste des jours */}
      {filteredDates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Calendar size={36} />
          </div>
          <h3>Aucune entrée trouvée</h3>
          <p>
            {sortedDates.length === 0 
              ? "Commencez par ajouter des mesures sur le Tableau de bord." 
              : "Aucun résultat ne correspond à vos filtres de recherche."}
          </p>
        </div>
      ) : (
        <div className="history-days-list">
          {filteredDates.map((dateStr) => {
            const day = data[dateStr];
            const isExpanded = !!expandedDays[dateStr];
            const bpStatus = day.avg ? getBPStatus(day.avg.sys, day.avg.dia) : null;

            return (
              <div key={dateStr} className="history-day-card">
                {/* Entête du jour cliquable */}
                <div 
                  className="history-day-header"
                  onClick={() => toggleDay(dateStr)}
                >
                  <div className="history-day-title">
                    <span style={{ color: bpStatus ? `var(--bp-${bpStatus.class.split('-')[1]})` : 'var(--text-muted)' }}>
                      ●
                    </span>
                    <span className="history-date">{formatDisplayDate(dateStr)}</span>
                  </div>

                  <div className="history-day-stats">
                    {day.avg ? (
                      <>
                        <span className="history-stat-pill">
                          Moy : <span>{day.avg.sys}/{day.avg.dia}</span> mmHg
                        </span>
                        <span className="history-stat-pill" style={{ display: 'none' }}>
                          Pouls : <span>{day.avg.pulse}</span> bpm
                        </span>
                        {bpStatus && (
                          <span 
                            className={`status-badge ${bpStatus.class}`}
                            style={{ 
                              margin: 0, 
                              padding: '0.15rem 0.6rem', 
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {bpStatus.label}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="history-stat-pill">Pas de moyenne</span>
                    )}

                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Détails du jour (créneaux) */}
                {isExpanded && (
                  <div className="history-day-details">
                    {['matin', 'midi', 'soir'].map((slotKey) => {
                      const slot = day.slots[slotKey];
                      return (
                        <div key={slotKey} className="details-slot-row">
                          <div className="details-slot-meta">
                            <span className="details-slot-label">
                              {slotLabels[slotKey].split(' ')[0]} {slotLabels[slotKey].split(' ')[1]}
                            </span>
                            {slot ? (
                              <span className="details-slot-time">Prise à {slot.time}</span>
                            ) : (
                              <span className="details-slot-time" style={{ fontStyle: 'italic' }}>Non renseigné</span>
                            )}
                          </div>

                          {slot ? (
                            <>
                              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                  {slot.sys}/{slot.dia} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>mmHg</span>
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                  💓 {slot.pulse} bpm
                                </span>
                              </div>
                              <span className="details-slot-notes" title={slot.note}>
                                {slot.note || ''}
                              </span>
                              <div className="details-slot-actions">
                                <button 
                                  className="btn-icon edit" 
                                  onClick={() => onEditClick(dateStr, slotKey, slot)}
                                  title="Modifier cette mesure"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button 
                                  className="btn-icon delete" 
                                  onClick={() => {
                                    if (confirm('Voulez-vous vraiment supprimer cette mesure ?')) {
                                      onDelete(dateStr, slotKey);
                                    }
                                  }}
                                  title="Supprimer cette mesure"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
                              <button 
                                className="btn-add-inline"
                                onClick={() => onEditClick(dateStr, slotKey, null)}
                              >
                                <Plus size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                Saisir
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
