import { useState, useEffect } from 'react';

// Classification de la tension artérielle selon les normes médicales (AHA/ESC)
export const getBPStatus = (sys, dia) => {
  if (!sys || !dia) return null;
  
  const s = parseFloat(sys);
  const d = parseFloat(dia);
  
  if (s >= 180 || d >= 120) {
    return { 
      label: 'Crise Hypertensive', 
      class: 'status-crisis', 
      level: 4, 
      desc: 'Tension critique. Prenez un deuxième avis immédiatement. S\'il y a d\'autres symptômes, contactez le 15.' 
    };
  }
  if (s >= 140 || d >= 90) {
    return { 
      label: 'Hypertension Stade 2', 
      class: 'status-stage2', 
      level: 3, 
      desc: 'Tension élevée constante détectée. Consultez un médecin pour un suivi.' 
    };
  }
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) {
    return { 
      label: 'Hypertension Stade 1', 
      class: 'status-stage1', 
      level: 2, 
      desc: 'Tension modérément élevée. Surveillez votre hygiène de vie (sel, stress).' 
    };
  }
  if (s >= 120 && s <= 129 && d < 80) {
    return { 
      label: 'Tension Élevée', 
      class: 'status-elevated', 
      level: 1, 
      desc: 'Tension légèrement supérieure à la normale. Poursuivez la surveillance.' 
    };
  }
  return { 
    label: 'Tension Normale', 
    class: 'status-normal', 
    level: 0, 
    desc: 'Tension idéale. Continuez de maintenir vos bonnes habitudes !' 
  };
};

// Formater la date en YYYY-MM-DD
export const getTodayDateStr = () => {
  const d = new Date();
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

// Formater l'heure actuelle en HH:MM
export const getCurrentTimeStr = () => {
  const d = new Date();
  return [
    ('' + d.getHours()).padStart(2, '0'),
    ('' + d.getMinutes()).padStart(2, '0')
  ].join(':');
};

// Recalculer la moyenne pour un bras spécifique (ou combiné si arm est null)
const calculateAvgForArm = (slots, arm) => {
  let count = 0;
  let sysSum = 0;
  let diaSum = 0;
  let pulseSum = 0;

  Object.entries(slots).forEach(([slotKey, slot]) => {
    if (slot) {
      const isRightSlot = slotKey.endsWith('_droit');
      const isLeftSlot = slotKey.endsWith('_gauche');
      
      if (arm === null || (arm === 'droit' && isRightSlot) || (arm === 'gauche' && isLeftSlot)) {
        count++;
        sysSum += parseFloat(slot.sys);
        diaSum += parseFloat(slot.dia);
        pulseSum += parseFloat(slot.pulse);
      }
    }
  });

  if (count === 0) return null;

  return {
    sys: Math.round(sysSum / count),
    dia: Math.round(diaSum / count),
    pulse: Math.round(pulseSum / count),
  };
};

// Recalculer toutes les moyennes d'une journée
const calculateDailyAverage = (slots) => {
  return {
    gauche: calculateAvgForArm(slots, 'gauche'),
    droit: calculateAvgForArm(slots, 'droit'),
    global: calculateAvgForArm(slots, null), // combined
  };
};

const STORAGE_KEY = 'suivi_tension_data';

export const useTensionData = () => {
  const [data, setData] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      // Migration des anciennes données vers le format à 6 slots sans notes
      Object.keys(parsed).forEach((dateStr) => {
        const day = parsed[dateStr];
        if (day && typeof day === 'object') {
          if (!day.slots || typeof day.slots !== 'object') {
            day.slots = {};
          }
          const newSlots = {
            matin_gauche: null, matin_droit: null,
            midi_gauche: null, midi_droit: null,
            soir_gauche: null, soir_droit: null
          };

          const oldKeys = ['matin', 'midi', 'soir'];
          oldKeys.forEach(k => {
            if (day.slots[k] !== undefined) {
              const oldSlot = day.slots[k];
              if (oldSlot) {
                const arm = oldSlot.arm || 'gauche';
                newSlots[`${k}_${arm}`] = {
                  sys: oldSlot.sys,
                  dia: oldSlot.dia,
                  pulse: oldSlot.pulse,
                  arm: arm,
                  time: oldSlot.time || '12:00'
                };
              }
              delete day.slots[k];
            }
          });

          // Réassigner les slots déjà existants
          const newKeys = ['matin_gauche', 'matin_droit', 'midi_gauche', 'midi_droit', 'soir_gauche', 'soir_droit'];
          newKeys.forEach(nk => {
            if (day.slots[nk] !== undefined) {
              const currentSlot = day.slots[nk];
              newSlots[nk] = currentSlot ? {
                sys: currentSlot.sys,
                dia: currentSlot.dia,
                pulse: currentSlot.pulse,
                arm: currentSlot.arm || (nk.endsWith('_droit') ? 'droit' : 'gauche'),
                time: currentSlot.time || '12:00'
              } : null;
            }
          });

          day.slots = newSlots;
          day.avg = calculateDailyAverage(day.slots);
        }
      });
      return parsed;
    } catch (e) {
      console.error('Erreur lors du chargement des données depuis localStorage', e);
      return {};
    }
  });

  // Sauvegarder dans localStorage dès que l'état change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Erreur lors de l\'enregistrement dans localStorage', e);
    }
  }, [data]);

  // Enregistrer ou modifier les deux mesures d'un moment (Matin, Midi, Soir)
  const saveMoment = (dateStr, momentKey, leftMeasurement, rightMeasurement, time) => {
    setData((prev) => {
      const dayData = prev[dateStr] || {
        date: dateStr,
        slots: { 
          matin_gauche: null, matin_droit: null,
          midi_gauche: null, midi_droit: null,
          soir_gauche: null, soir_droit: null
        },
      };

      const timeStr = time || getCurrentTimeStr();

      const updatedSlots = {
        ...dayData.slots,
        [`${momentKey}_gauche`]: leftMeasurement
          ? {
              sys: parseInt(leftMeasurement.sys, 10),
              dia: parseInt(leftMeasurement.dia, 10),
              pulse: parseInt(leftMeasurement.pulse, 10),
              arm: 'gauche',
              time: timeStr,
            }
          : null,
        [`${momentKey}_droit`]: rightMeasurement
          ? {
              sys: parseInt(rightMeasurement.sys, 10),
              dia: parseInt(rightMeasurement.dia, 10),
              pulse: parseInt(rightMeasurement.pulse, 10),
              arm: 'droit',
              time: timeStr,
            }
          : null,
      };

      const updatedAvg = calculateDailyAverage(updatedSlots);

      const nextData = { ...prev };
      const hasAnyReading = Object.values(updatedSlots).some(Boolean);
      
      if (!hasAnyReading) {
        delete nextData[dateStr];
      } else {
        nextData[dateStr] = {
          ...dayData,
          slots: updatedSlots,
          avg: updatedAvg,
        };
      }

      return nextData;
    });
  };

  // Supprimer une mesure spécifique d'un bras
  const deleteMeasurement = (dateStr, slotKey) => {
    setData((prev) => {
      if (!prev[dateStr]) return prev;
      
      const updatedSlots = {
        ...prev[dateStr].slots,
        [slotKey]: null
      };

      const updatedAvg = calculateDailyAverage(updatedSlots);

      const nextData = { ...prev };
      const hasAnyReading = Object.values(updatedSlots).some(Boolean);
      
      if (!hasAnyReading) {
        delete nextData[dateStr];
      } else {
        nextData[dateStr] = {
          ...prev[dateStr],
          slots: updatedSlots,
          avg: updatedAvg,
        };
      }

      return nextData;
    });
  };

  // Exporter les données au format JSON string
  const exportDataJSON = () => {
    return JSON.stringify(data, null, 2);
  };

  // Exporter au format CSV
  const exportDataCSV = () => {
    const headers = ['Date', 'Créneau', 'Systolique (mmHg)', 'Diastolique (mmHg)', 'Pouls (bpm)', 'Bras', 'Heure', 'Moyenne Globale Systolique', 'Moyenne Globale Diastolique', 'Moyenne Globale Pouls'];
    const rows = [headers];

    // Trier les dates par ordre décroissant
    const sortedDates = Object.keys(data).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((dateStr) => {
      const day = data[dateStr];
      const slotsKeys = ['matin_gauche', 'matin_droit', 'midi_gauche', 'midi_droit', 'soir_gauche', 'soir_droit'];
      
      slotsKeys.forEach((slotKey) => {
        const slot = day.slots[slotKey];
        if (slot) {
          const slotLabel = slotKey.split('_')[0].toUpperCase();
          rows.push([
            dateStr,
            slotLabel,
            slot.sys,
            slot.dia,
            slot.pulse,
            slot.arm.toUpperCase(),
            slot.time,
            day.avg?.global?.sys || '',
            day.avg?.global?.dia || '',
            day.avg?.global?.pulse || ''
          ]);
        }
      });
    });

    return rows.map(r => r.join(';')).join('\n');
  };

  // Importer les données depuis un objet JSON
  const importData = (importedObject) => {
    try {
      if (typeof importedObject !== 'object' || importedObject === null) {
        throw new Error('Format de données invalide.');
      }

      const validatedData = {};

      Object.entries(importedObject).forEach(([dateStr, dayData]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
        if (!dayData || typeof dayData !== 'object') return;

        const slots = { 
          matin_gauche: null, matin_droit: null,
          midi_gauche: null, midi_droit: null,
          soir_gauche: null, soir_droit: null
        };
        
        if (dayData.slots && typeof dayData.slots === 'object') {
          const keysToImport = [
            'matin', 'midi', 'soir', 
            'matin_gauche', 'matin_droit', 'midi_gauche', 'midi_droit', 'soir_gauche', 'soir_droit'
          ];
          
          keysToImport.forEach((key) => {
            const s = dayData.slots[key];
            if (s && typeof s === 'object' && s.sys && s.dia && s.pulse) {
              const arm = s.arm === 'droit' ? 'droit' : 'gauche';
              
              let targetKey = key;
              if (key === 'matin' || key === 'midi' || key === 'soir') {
                targetKey = `${key}_${arm}`;
              }
              
              slots[targetKey] = {
                sys: parseInt(s.sys, 10),
                dia: parseInt(s.dia, 10),
                pulse: parseInt(s.pulse, 10),
                arm,
                time: s.time || '12:00'
              };
            }
          });
        }

        const avg = calculateDailyAverage(slots);

        const hasAnySlot = Object.values(slots).some(Boolean);
        if (hasAnySlot) {
          validatedData[dateStr] = {
            date: dateStr,
            slots,
            avg,
          };
        }
      });

      setData((prev) => ({
        ...prev,
        ...validatedData,
      }));
      
      return { success: true, count: Object.keys(validatedData).length };
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
    }
  };

  // Effacer toutes les données
  const clearAllData = () => {
    setData({});
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Erreur lors de la suppression de localStorage', e);
    }
  };

  return {
    data,
    saveMoment,
    deleteMeasurement,
    exportDataJSON,
    exportDataCSV,
    importData,
    clearAllData,
  };
};
