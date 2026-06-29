import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, ShieldAlert, FileJson, FileSpreadsheet, Printer, Calendar } from 'lucide-react';
import { getBPStatus, getTodayDateStr } from '../hooks/useTensionData';

export default function ExportImport({ 
  data,
  exportDataJSON, 
  exportDataCSV, 
  onImport, 
  onClearAll, 
  showToast 
}) {
  const fileInputRef = useRef(null);
  
  // États pour l'exportation PDF
  const [pdfPeriod, setPdfPeriod] = useState('7'); // '7', '30', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(getTodayDateStr());

  // Gérer le téléchargement de fichier
  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const handleExportJSON = () => {
    try {
      const jsonStr = exportDataJSON();
      downloadFile(jsonStr, 'suivi_tension_export.json', 'application/json');
      showToast('Exportation JSON réussie !', 'success');
    } catch (e) {
      showToast('Erreur lors de l\'exportation.', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      const csvStr = exportDataCSV();
      // Utiliser un BOM UTF-8 (\uFEFF) pour que Excel lise correctement les caractères accentués en français
      const csvWithBOM = '\uFEFF' + csvStr;
      downloadFile(csvWithBOM, 'suivi_tension_export.csv', 'text/csv;charset=utf-8;');
      showToast('Exportation CSV réussie !', 'success');
    } catch (e) {
      showToast('Erreur lors de l\'exportation CSV.', 'error');
    }
  };

  // Calculer une date passée
  const getPastDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = ('' + (d.getMonth() + 1)).padStart(2, '0');
    const day = ('' + d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Générer le PDF via l'iframe d'impression
  const handleExportPDF = () => {
    const sortedDates = Object.keys(data).sort((a, b) => a.localeCompare(b)); // Ordre chronologique
    
    if (sortedDates.length === 0) {
      showToast('Aucune mesure enregistrée dans l\'historique.', 'error');
      return;
    }

    let limitStartDate = '';
    let limitEndDate = endDate || getTodayDateStr();

    if (pdfPeriod === '7') {
      limitStartDate = getPastDateStr(6); // 7 jours incluant aujourd'hui
    } else if (pdfPeriod === '30') {
      limitStartDate = getPastDateStr(29); // 30 jours incluant aujourd'hui
    } else if (pdfPeriod === 'custom') {
      if (!startDate) {
        showToast('Veuillez sélectionner une date de début.', 'error');
        return;
      }
      limitStartDate = startDate;
    }

    // Filtrer les jours
    const filteredDays = sortedDates
      .filter((dateStr) => {
        if (limitStartDate && dateStr < limitStartDate) return false;
        if (limitEndDate && dateStr > limitEndDate) return false;
        return true;
      })
      .map((dateStr) => data[dateStr]);

    if (filteredDays.length === 0) {
      showToast('Aucune mesure trouvée pour la période sélectionnée.', 'error');
      return;
    }

    // Calculs de statistiques split par bras pour le rapport
    let totalReadings = 0;
    
    let sysSumG = 0, diaSumG = 0, pulseSumG = 0, countG = 0;
    let sysSumD = 0, diaSumD = 0, pulseSumD = 0, countD = 0;

    filteredDays.forEach((day) => {
      Object.values(day.slots).forEach((slot) => {
        if (slot) {
          totalReadings++;
          if (slot.arm === 'droit') {
            countD++;
            sysSumD += slot.sys;
            diaSumD += slot.dia;
            pulseSumD += slot.pulse;
          } else {
            countG++;
            sysSumG += slot.sys;
            diaSumG += slot.dia;
            pulseSumG += slot.pulse;
          }
        }
      });
    });

    if (totalReadings === 0) {
      showToast('Aucune mesure individuelle enregistrée sur cette période.', 'error');
      return;
    }

    const avgSysG = countG > 0 ? Math.round(sysSumG / countG) : null;
    const avgDiaG = countG > 0 ? Math.round(diaSumG / countG) : null;
    const avgPulseG = countG > 0 ? Math.round(pulseSumG / countG) : null;

    const avgSysD = countD > 0 ? Math.round(sysSumD / countD) : null;
    const avgDiaD = countD > 0 ? Math.round(diaSumD / countD) : null;
    const avgPulseD = countD > 0 ? Math.round(pulseSumD / countD) : null;

    // Formater les dates pour l'affichage en français
    const formatDateFR = (dStr) => dStr.split('-').reverse().join('/');
    const startDisplay = limitStartDate ? formatDateFR(limitStartDate) : formatDateFR(sortedDates[0]);
    const endDisplay = formatDateFR(limitEndDate);

    // Sur mobile, l'impression d'un iframe caché échoue souvent (imprime la page parente).
    // On va plutôt injecter une div visible uniquement à l'impression via @media print.
    const originalTitle = document.title;
    document.title = `Rapport de Suivi Tensionnel - ${startDisplay} au ${endDisplay}`;

    // Génération des lignes de tableau
    let tableRowsHtml = '';
    filteredDays.forEach((day) => {
      const dateDisplay = formatDateFR(day.date);
      let dayHasData = false;
      
      ['matin', 'midi', 'soir'].forEach((momentKey) => {
        const slotG = day.slots[`${momentKey}_gauche`];
        const slotD = day.slots[`${momentKey}_droit`];
        
        if (slotG || slotD) {
          dayHasData = true;
          const slotLabel = momentKey === 'matin' ? 'Matin' : momentKey === 'midi' ? 'Midi' : 'Soir';
          const timeStr = slotG?.time || slotD?.time || '';
          
          const textG = slotG ? `<strong style="font-size: 14px;">${slotG.sys}/${slotG.dia}</strong> <span style="font-size:10px;color:#64748b">(${slotG.pulse} bpm)</span>` : '<span style="color:#cbd5e1">-</span>';
          const textD = slotD ? `<strong style="font-size: 14px;">${slotD.sys}/${slotD.dia}</strong> <span style="font-size:10px;color:#64748b">(${slotD.pulse} bpm)</span>` : '<span style="color:#cbd5e1">-</span>';

          tableRowsHtml += `
            <tr>
              <td><strong>${dateDisplay}</strong> - ${slotLabel} ${timeStr ? `<span style="color:#475569">(${timeStr})</span>` : ''}</td>
              <td>${textG}</td>
              <td>${textD}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `;
        }
      });

      // Ligne de moyenne de la journée
      if (dayHasData && day.avg && day.avg.global) {
        const avgG = day.avg.gauche ? `<strong style="font-size: 14px; color: var(--primary);">${day.avg.gauche.sys}/${day.avg.gauche.dia}</strong> <span style="font-size:10px;color:#64748b">(${day.avg.gauche.pulse} bpm)</span>` : '<span style="color:#cbd5e1">-</span>';
        const avgD = day.avg.droit ? `<strong style="font-size: 14px; color: var(--primary);">${day.avg.droit.sys}/${day.avg.droit.dia}</strong> <span style="font-size:10px;color:#64748b">(${day.avg.droit.pulse} bpm)</span>` : '<span style="color:#cbd5e1">-</span>';

        tableRowsHtml += `
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #94a3b8;">
            <td style="text-align: right; padding-right: 15px; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">
              <strong>Moyenne du ${dateDisplay} :</strong>
            </td>
            <td>${avgG}</td>
            <td>${avgD}</td>
            <td style="font-weight: 800; color: var(--primary); font-size: 14px;">${day.avg.global.sys} <span style="font-size:9px; font-weight:normal; color:#64748b">mmHg</span></td>
            <td style="font-weight: 800; color: var(--primary); font-size: 14px;">${day.avg.global.dia} <span style="font-size:9px; font-weight:normal; color:#64748b">mmHg</span></td>
            <td style="font-weight: 800; font-size: 14px;">${day.avg.global.pulse} <span style="font-size:9px; font-weight:normal; color:#64748b">bpm</span></td>
          </tr>
        `;
      }
    });

    // Création du conteneur d'impression
    const printContainer = document.createElement('div');
    printContainer.id = 'tension-print-container';
    
    printContainer.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        @media screen {
          #tension-print-container { display: none !important; }
        }
        
        @media print {
          /* Masquer l'application principale */
          body > :not(#tension-print-container) { display: none !important; }
          
          @page { margin: 1.5cm; }
          
          body {
            background-color: white !important;
          }
          
          #tension-print-container {
            --primary: #3b82f6;
            --accent: #06b6d4;
            display: block !important;
            font-family: 'Outfit', sans-serif;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.4;
            padding: 0;
            margin: 0;
            width: 100%;
          }
          
          #tension-print-container .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          
          #tension-print-container .title-area h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            color: #3b82f6;
            letter-spacing: -0.02em;
          }
          
          #tension-print-container .meta-area {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          
          #tension-print-container table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          
          #tension-print-container th, #tension-print-container td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
          }
          
          #tension-print-container th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          #tension-print-container tr:nth-child(even) td {
            background-color: rgba(248, 250, 252, 0.5);
          }
          
          #tension-print-container .disclaimer {
            margin-top: 35px;
            padding-top: 15px;
            border-top: 1px solid #cbd5e1;
            font-size: 10px;
            color: #475569;
            text-align: center;
            line-height: 1.5;
          }
        }
      </style>
      
      <div class="header">
        <div class="title-area">
          <h1>Relevé des Mesures de Tension</h1>
        </div>
        <div class="meta-area">
          <div>Période : <strong>${startDisplay}</strong> - <strong>${endDisplay}</strong></div>
          <div style="margin-top: 2px;">Édité le : ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 25%">Date & Heure</th>
            <th style="width: 22%">Bras Gauche</th>
            <th style="width: 22%">Bras Droit</th>
            <th style="width: 10%">Moy. Sys</th>
            <th style="width: 10%">Moy. Dia</th>
            <th style="width: 11%">Moy. Pouls</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
      
      <div class="disclaimer">
        <strong>Document d'auto-mesure tensionnelle</strong> à présenter à votre professionnel de santé.
      </div>
    `;

    document.body.appendChild(printContainer);

    // Lancer l'impression sur la fenêtre principale
    setTimeout(() => {
      window.print();
      
      // Nettoyer après impression
      setTimeout(() => {
        document.title = originalTitle;
        if (document.body.contains(printContainer)) {
          document.body.removeChild(printContainer);
        }
        showToast('Rapport PDF généré !', 'success');
      }, 1000);
    }, 500);
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const result = onImport(parsed);
        
        if (result.success) {
          showToast(`${result.count} jour(s) importé(s) ou mis à jour avec succès !`, 'success');
        } else {
          showToast(`Erreur d'import : ${result.error || 'Format invalide'}`, 'error');
        }
      } catch (err) {
        showToast('Fichier JSON invalide ou corrompu.', 'error');
      }
      
      // Réinitialiser la valeur de l'input pour pouvoir réimporter le même fichier si besoin
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    const confirmWipe = confirm(
      "ATTENTION: Cette action va supprimer DEFINITIVEMENT toutes vos mesures de tension enregistrées. Cette action est irréversible.\n\nVoulez-vous continuer ?"
    );
    
    if (confirmWipe) {
      const secondConfirm = confirm(
        "Êtes-vous absolument sûr ? Avez-vous pensé à exporter vos données d'abord ?"
      );
      if (secondConfirm) {
        onClearAll();
        showToast('Toutes vos données ont été effacées.', 'info');
      }
    }
  };

  return (
    <div className="settings-section">
      
      {/* Exporter les données */}
      <div className="glass-card">
        <h2 className="card-title">
          <Download size={20} style={{ color: 'var(--primary)' }} />
          Exporter vos données
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Format Fichier */}
          <div className="settings-card">
            <div className="settings-info">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Formats bruts de sauvegarde</h3>
              <p className="settings-desc">
                Téléchargez vos fichiers bruts pour archivage local ou pour les importer ultérieurement dans cette application.
              </p>
            </div>
            <div className="actions-row">
              <button className="btn btn-primary" onClick={handleExportJSON}>
                <FileJson size={18} />
                Sauvegarde complète (JSON)
              </button>
              <button className="btn btn-secondary" onClick={handleExportCSV}>
                <FileSpreadsheet size={18} />
                Feuille de calcul (CSV pour Excel)
              </button>
            </div>
          </div>

          {/* Exportation PDF Clinique */}
          <div className="settings-card" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="settings-info">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={18} style={{ color: 'var(--accent)' }} />
                Rapport médical (PDF)
              </h3>
              <p className="settings-desc">
                Générez un rapport clinique formaté, clair et optimisé pour l'impression, idéal à remettre à votre médecin traitant.
              </p>
            </div>

            {/* Formulaire Options Période */}
            <div style={{ marginTop: '1.25rem', background: 'rgba(10, 15, 29, 0.4)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.03)' }}>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Sélectionner la période du rapport :</label>
                
                {/* Sélecteur de période */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="pdf-period" 
                      value="7" 
                      checked={pdfPeriod === '7'}
                      onChange={() => setPdfPeriod('7')}
                      style={{ cursor: 'pointer' }}
                    />
                    7 derniers jours
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="pdf-period" 
                      value="30" 
                      checked={pdfPeriod === '30'}
                      onChange={() => setPdfPeriod('30')}
                      style={{ cursor: 'pointer' }}
                    />
                    30 derniers jours (1 mois)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="pdf-period" 
                      value="custom" 
                      checked={pdfPeriod === 'custom'}
                      onChange={() => setPdfPeriod('custom')}
                      style={{ cursor: 'pointer' }}
                    />
                    Dates personnalisées
                  </label>
                </div>
              </div>

              {/* Plage personnalisée */}
              {pdfPeriod === 'custom' && (
                <div className="form-group-row" style={{ animation: 'slideDown 0.25s ease', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pdf-start-date">Date de début</label>
                    <input 
                      id="pdf-start-date"
                      type="date" 
                      className="form-input" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pdf-end-date">Date de fin</label>
                    <input 
                      id="pdf-end-date"
                      type="date" 
                      className="form-input" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, var(--accent), var(--primary))', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.25)' }}
                onClick={handleExportPDF}
              >
                <Printer size={18} />
                Générer et Imprimer le Rapport PDF
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Importer les données */}
      <div className="glass-card">
        <h2 className="card-title">
          <Upload size={20} style={{ color: 'var(--accent)' }} />
          Importer des données
        </h2>
        <div className="settings-card">
          <div className="settings-info">
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Restaurer une sauvegarde</h3>
            <p className="settings-desc">
              Sélectionnez un fichier d'exportation JSON précédemment créé. Les données importées fusionneront avec vos données existantes.
            </p>
          </div>
          <div>
            <div className="btn-upload-wrapper">
              <button className="btn btn-secondary">
                <Upload size={18} />
                Choisir un fichier JSON
              </button>
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleImportFile} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Zone de Danger (Réinitialisation) */}
      <div className="glass-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        <h2 className="card-title" style={{ color: 'var(--bp-stage2)' }}>
          <ShieldAlert size={20} />
          Zone de danger
        </h2>
        <div className="settings-card" style={{ background: 'rgba(239, 68, 68, 0.02)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
          <div className="settings-info">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--bp-stage2)' }}>Effacer toutes les données</h3>
            <p className="settings-desc">
              Supprimez définitivement l'ensemble des données stockées dans le navigateur. Assurez-vous d'avoir fait une sauvegarde au préalable.
            </p>
          </div>
          <div>
            <button className="btn" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={handleClearAll}>
              <Trash2 size={18} />
              Réinitialiser l'application
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
