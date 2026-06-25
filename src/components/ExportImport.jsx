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

    // Création de l'iframe de façon invisible
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;

    // Génération des lignes de tableau
    let tableRowsHtml = '';
    filteredDays.forEach((day) => {
      const dateDisplay = formatDateFR(day.date);
      ['matin', 'midi', 'soir'].forEach((slotKey) => {
        const slot = day.slots[slotKey];
        if (slot) {
          const status = getBPStatus(slot.sys, slot.dia);
          const statusColor = status ? `var(--bp-${status.class.split('-')[1]})` : '#0f172a';
          const slotLabel = slotKey === 'matin' ? 'Matin' : slotKey === 'midi' ? 'Midi' : 'Soir';
          const armLabel = slot.arm === 'droit' ? 'Bras droit 👉' : '👈 Bras gauche';

          tableRowsHtml += `
            <tr>
              <td><strong>${dateDisplay}</strong></td>
              <td>${slotLabel}</td>
              <td style="font-weight: bold; color: ${statusColor};">${slot.sys}/${slot.dia} <span style="font-size: 9px; font-weight: normal; color: #64748b;">mmHg</span></td>
              <td>💓 ${slot.pulse} <span style="font-size: 9px; color: #64748b;">bpm</span></td>
              <td>${armLabel}</td>
              <td style="font-style: italic; color: #475569; font-size: 11px;">${slot.note || ''}</td>
            </tr>
          `;
        }
      });
    });

    // Écriture du contenu dans l'iframe
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Rapport de Suivi Tensionnel - ${startDisplay} au ${endDisplay}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          
          :root {
            --primary: #3b82f6;
            --accent: #06b6d4;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --border-color: #cbd5e1;
            --bg-light: #f8fafc;
            
            --bp-normal: #10b981;
            --bp-elevated: #d97706;
            --bp-stage1: #ea580c;
            --bp-stage2: #ef4444;
            --bp-crisis: #b91c1c;
          }
          
          * { box-sizing: border-box; }
          
          body {
            font-family: 'Outfit', sans-serif;
            color: var(--text-primary);
            margin: 0;
            padding: 20px;
            font-size: 13px;
            line-height: 1.4;
            background-color: white;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          
          .title-area h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: var(--primary);
            letter-spacing: -0.02em;
          }
          
          .title-area p {
            margin: 3px 0 0 0;
            color: var(--text-secondary);
            font-size: 12px;
          }
          
          .meta-area {
            text-align: right;
            font-size: 11px;
            color: var(--text-secondary);
          }
          
          .meta-area h2 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 700;
            color: var(--text-primary);
          }
          
          .summary-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          
          .summary-card {
            background-color: var(--bg-light);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            text-align: left;
          }
          
          .summary-card.left-arm {
            border-top: 4px solid var(--primary);
          }
          
          .summary-card.right-arm {
            border-top: 4px solid var(--accent);
          }
          
          .summary-label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--text-secondary);
            margin-bottom: 8px;
            letter-spacing: 0.05em;
          }
          
          .summary-stats-box {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 6px;
          }
          
          .summary-value {
            font-size: 22px;
            font-weight: 800;
          }
          
          .summary-value span {
            font-size: 11px;
            font-weight: 400;
            color: #64748b;
          }
          
          .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            text-align: center;
          }
          
          .status-normal { background-color: rgba(16, 185, 129, 0.12); color: var(--bp-normal); }
          .status-elevated { background-color: rgba(217, 119, 6, 0.12); color: var(--bp-elevated); }
          .status-stage1 { background-color: rgba(234, 88, 12, 0.12); color: var(--bp-stage1); }
          .status-stage2 { background-color: rgba(239, 68, 68, 0.12); color: var(--bp-stage2); }
          .status-crisis { background-color: rgba(185, 28, 28, 0.15); color: var(--bp-crisis); }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          
          th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
          }
          
          th {
            background-color: #f1f5f9;
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          tr:nth-child(even) td {
            background-color: var(--bg-light);
          }
          
          .disclaimer {
            margin-top: 35px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
            font-size: 10px;
            color: var(--text-secondary);
            text-align: center;
            line-height: 1.5;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>Rapport Clinique de Tension</h1>
            <p>Carnet d'auto-mesures de la tension artérielle</p>
          </div>
          <div class="meta-area">
            <h2>Suivi Personnel</h2>
            <div>Période : Du <strong>${startDisplay}</strong> au <strong>${endDisplay}</strong></div>
            <div style="margin-top: 2px;">Imprimé le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
        </div>
        
        <div class="summary-row">
          {/* Averages Bras Gauche */}
          <div class="summary-card left-arm">
            <div class="summary-label">Moyenne Bras Gauche</div>
            ${avgSysG ? `
              <div class="summary-stats-box">
                <span class="summary-value" style="color: var(--primary);">${avgSysG}/${avgDiaG} <span style="font-size: 11px; font-weight: normal;">mmHg</span></span>
                <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">💓 ${avgPulseG} bpm</span>
              </div>
              <span class="status-badge ${getBPStatus(avgSysG, avgDiaG)?.class || 'status-normal'}">
                ${getBPStatus(avgSysG, avgDiaG)?.label || 'Tension Normale'}
              </span>
            ` : `
              <div style="font-style: italic; color: #64748b; font-size: 12px; padding: 5px 0;">Aucune mesure bras gauche</div>
            `}
          </div>

          {/* Averages Bras Droit */}
          <div class="summary-card right-arm">
            <div class="summary-label">Moyenne Bras Droit</div>
            ${avgSysD ? `
              <div class="summary-stats-box">
                <span class="summary-value" style="color: var(--accent);">${avgSysD}/${avgDiaD} <span style="font-size: 11px; font-weight: normal;">mmHg</span></span>
                <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">💓 ${avgPulseD} bpm</span>
              </div>
              <span class="status-badge ${getBPStatus(avgSysD, avgDiaD)?.class || 'status-normal'}">
                ${getBPStatus(avgSysD, avgDiaD)?.label || 'Tension Normale'}
              </span>
            ` : `
              <div style="font-style: italic; color: #64748b; font-size: 12px; padding: 5px 0;">Aucune mesure bras droit</div>
            `}
          </div>
        </div>
        
        <h3 style="font-size: 14px; font-weight: 700; margin: 20px 0 8px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
          Historique des mesures individuelles (${totalReadings})
        </h3>
        <table>
          <thead>
            <tr>
              <th style="width: 18%">Date</th>
              <th style="width: 12%">Créneau</th>
              <th style="width: 25%">Mesure Tensionnelle</th>
              <th style="width: 18%">Pouls (Cardiaque)</th>
              <th style="width: 15%">Côté</th>
              <th style="width: 12%">Notes & Symptômes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        
        <div class="disclaimer">
          <strong>⚠️ Informations importantes :</strong> Ce compte-rendu contient des mesures de tension artérielle relevées à domicile. 
          Il est destiné à être présenté à un professionnel de santé (médecin généraliste ou cardiologue) lors de vos consultations. 
          L'auto-mesure permet de donner un aperçu plus fidèle de votre tension au quotidien qu'une mesure unique en cabinet.
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Lancer le focus et l'impression sur l'iframe
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      // Retirer l'iframe
      setTimeout(() => {
        document.body.removeChild(iframe);
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
