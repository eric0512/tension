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

const STORAGE_KEY = 'suivi_tension_data';

export const useTensionData = () => {
  // Structure de données de l'état :
  // {
  //   '2026-06-25': {
  //     date: '2026-06-25',
  //     slots: {
  //       matin: { sys: 120, dia: 80, pulse: 70, time: '08:30', note: 'Au réveil' } | null,
  //       midi: null,
  //       soir: null
  //     },
  //     avg: { sys: 120, dia: 80, pulse: 70 }
  //   }
  // }
  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Erreur lors du chargement des données depuis localStorage', e);
      return {};
    }
  });

  // Sauvegarder dans localStorage dès que l'état change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Recalculer la moyenne pour une journée
  const calculateDailyAverage = (slots) => {
    let count = 0;
    let sysSum = 0;
    let diaSum = 0;
    let pulseSum = 0;

    Object.values(slots).forEach((slot) => {
      if (slot) {
        count++;
        sysSum += parseFloat(slot.sys);
        diaSum += parseFloat(slot.dia);
        pulseSum += parseFloat(slot.pulse);
      }
    });

    if (count === 0) return null;

    return {
      sys: Math.round(sysSum / count),
      dia: Math.round(diaSum / count),
      pulse: Math.round(pulseSum / count),
    };
  };

  // Enregistrer ou modifier une mesure
  const saveMeasurement = (dateStr, slotKey, measurement) => {
    setData((prev) => {
      const dayData = prev[dateStr] || {
        date: dateStr,
        slots: { matin: null, midi: null, soir: null },
      };

      const updatedSlots = {
        ...dayData.slots,
        [slotKey]: measurement
          ? {
              sys: parseInt(measurement.sys, 10),
              dia: parseInt(measurement.dia, 10),
              pulse: parseInt(measurement.pulse, 10),
              time: measurement.time || getCurrentTimeStr(),
              note: measurement.note || '',
            }
          : null,
      };

      const updatedAvg = calculateDailyAverage(updatedSlots);

      // Si tous les créneaux sont vides pour ce jour, on supprime carrément la journée
      const nextData = { ...prev };
      if (!updatedSlots.matin && !updatedSlots.midi && !updatedSlots.soir) {
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

  // Supprimer une mesure
  const deleteMeasurement = (dateStr, slotKey) => {
    saveMeasurement(dateStr, slotKey, null);
  };

  // Exporter les données au format JSON string
  const exportDataJSON = () => {
    return JSON.stringify(data, null, 2);
  };

  // Exporter au format CSV
  const exportDataCSV = () => {
    const headers = ['Date', 'Créneau', 'Systolique (mmHg)', 'Diastolique (mmHg)', 'Pouls (bpm)', 'Heure', 'Note', 'Moyenne Systolique', 'Moyenne Diastolique', 'Moyenne Pouls'];
    const rows = [headers];

    // Trier les dates par ordre décroissant
    const sortedDates = Object.keys(data).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((dateStr) => {
      const day = data[dateStr];
      const slotsKeys = ['matin', 'midi', 'soir'];
      
      slotsKeys.forEach((slotKey) => {
        const slot = day.slots[slotKey];
        if (slot) {
          rows.push([
            dateStr,
            slotKey.toUpperCase(),
            slot.sys,
            slot.dia,
            slot.pulse,
            slot.time,
            `"${slot.note.replace(/"/g, '""')}"`,
            day.avg?.sys || '',
            day.avg?.dia || '',
            day.avg?.pulse || ''
          ]);
        }
      });
    });

    return rows.map(r => r.join(';')).join('\n');
  };

  // Importer les données depuis un objet JSON
  const importData = (importedObject) => {
    try {
      // Validation basique de la structure importée
      if (typeof importedObject !== 'object' || importedObject === null) {
        throw new Error('Format de données invalide.');
      }

      const validatedData = {};

      Object.entries(importedObject).forEach(([dateStr, dayData]) => {
        // Valider le format de la date YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
        if (!dayData || typeof dayData !== 'object') return;

        const slots = { matin: null, midi: null, soir: null };
        if (dayData.slots && typeof dayData.slots === 'object') {
          ['matin', 'midi', 'soir'].forEach((key) => {
            const s = dayData.slots[key];
            if (s && typeof s === 'object' && s.sys && s.dia && s.pulse) {
              slots[key] = {
                sys: parseInt(s.sys, 10),
                dia: parseInt(s.dia, 10),
                pulse: parseInt(s.pulse, 10),
                time: s.time || '12:00',
                note: s.note || '',
              };
            }
          });
        }

        const avg = calculateDailyAverage(slots);

        if (slots.matin || slots.midi || slots.soir) {
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
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    data,
    saveMeasurement,
    deleteMeasurement,
    exportDataJSON,
    exportDataCSV,
    importData,
    clearAllData,
  };
};
