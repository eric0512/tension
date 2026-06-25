import React, { useRef } from 'react';
import { Download, Upload, Trash2, ShieldAlert, FileJson, FileSpreadsheet } from 'lucide-react';

export default function ExportImport({ 
  exportDataJSON, 
  exportDataCSV, 
  onImport, 
  onClearAll, 
  showToast 
}) {
  const fileInputRef = useRef(null);

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
        <div className="settings-card">
          <div className="settings-info">
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Sauvegarde et Partage Médical</h3>
            <p className="settings-desc">
              Téléchargez vos données pour les conserver en lieu sûr ou pour les envoyer directement à votre médecin.
            </p>
          </div>
          <div className="actions-row">
            <button className="btn btn-primary" onClick={handleExportJSON}>
              <FileJson size={18} />
              Exporter au format JSON (Sauvegarde complète)
            </button>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <FileSpreadsheet size={18} />
              Exporter au format CSV (Excel / Sheets)
            </button>
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
