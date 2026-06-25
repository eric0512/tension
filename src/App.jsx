import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Activity, 
  TrendingUp, 
  BookOpen, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus
} from 'lucide-react';

import { useTensionData } from './hooks/useTensionData';
import Dashboard from './components/Dashboard';
import TrendChart from './components/TrendChart';
import HistoryList from './components/HistoryList';
import ExportImport from './components/ExportImport';
import MeasurementForm from './components/MeasurementForm';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  
  // États de la Modal de saisie
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState(null); // { date, slot, sys, dia, pulse, time, note, isEditMode }

  const {
    data,
    saveMeasurement,
    deleteMeasurement,
    exportDataJSON,
    exportDataCSV,
    importData,
    clearAllData
  } = useTensionData();

  // Afficher un toast personnalisé pendant 4 secondes
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Ouvrir la modal en mode création ou édition
  const handleOpenModal = (dateStr, slotKey, initialData = null) => {
    setModalConfig({
      date: dateStr,
      slot: slotKey,
      sys: initialData?.sys || '',
      dia: initialData?.dia || '',
      pulse: initialData?.pulse || '',
      time: initialData?.time || '',
      note: initialData?.note || '',
      isEditMode: !!initialData,
    });
    setIsModalOpen(true);
  };

  // Enregistrer depuis la modal
  const handleSaveFromModal = (dateStr, slotKey, values) => {
    saveMeasurement(dateStr, slotKey, values);
    showToast(
      modalConfig?.isEditMode 
        ? 'Mesure modifiée avec succès !' 
        : 'Mesure enregistrée avec succès !', 
      'success'
    );
  };

  // Icône Toast correspondante
  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: 'var(--bp-normal)' }} />;
      case 'error':
        return <XCircle size={18} style={{ color: 'var(--bp-stage2)' }} />;
      default:
        return <AlertCircle size={18} style={{ color: 'var(--primary)' }} />;
    }
  };

  return (
    <div className="app-container">
      
      {/* En-tête de l'application */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <HeartPulse size={24} color="white" />
          </div>
          <h1>SuiviTension</h1>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            id="tab-dashboard"
          >
            <Activity size={16} />
            <span>Tableau</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
            id="tab-trends"
          >
            <TrendingUp size={16} />
            <span>Graphiques</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            id="tab-history"
          >
            <BookOpen size={16} />
            <span>Historique</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            id="tab-settings"
          >
            <Settings size={16} />
            <span>Paramètres</span>
          </button>
        </nav>
      </header>

      {/* Contenu principal selon l'onglet actif */}
      <main style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            data={data} 
            onSaveMeasurement={saveMeasurement} 
            onAddClick={handleOpenModal} 
          />
        )}

        {activeTab === 'trends' && (
          <TrendChart 
            data={data} 
          />
        )}

        {activeTab === 'history' && (
          <HistoryList 
            data={data} 
            onDelete={deleteMeasurement} 
            onEditClick={handleOpenModal} 
          />
        )}

        {activeTab === 'settings' && (
          <ExportImport 
            data={data}
            exportDataJSON={exportDataJSON}
            exportDataCSV={exportDataCSV}
            onImport={importData}
            onClearAll={clearAllData}
            showToast={showToast}
          />
        )}
      </main>

      {/* Formulaire Modal */}
      <MeasurementForm 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFromModal}
        initialData={modalConfig}
      />

      {/* Notifications Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {getToastIcon(toast.type)}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            {toast.message}
          </span>
        </div>
      )}

      {/* Bouton d'action flottant pour mobile (Ajout rapide de mesure pour aujourd'hui) */}
      <button 
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
          cursor: 'pointer',
          zIndex: 90,
          transition: 'all 0.2s'
        }}
        onClick={() => {
          const d = new Date();
          const hour = d.getHours();
          let suggestedSlot = 'matin';
          if (hour >= 11 && hour < 17) suggestedSlot = 'midi';
          else if (hour >= 17) suggestedSlot = 'soir';
          
          const todayStr = new Date().toISOString().split('T')[0];
          const existingSlotData = data[todayStr]?.slots[suggestedSlot] || null;
          handleOpenModal(todayStr, suggestedSlot, existingSlotData);
        }}
        title="Ajouter une mesure pour aujourd'hui"
      >
        <Plus size={24} />
      </button>

      {/* Pied de page médical et mentions */}
      <footer className="app-footer">
        <p>
          SuiviTension © {new Date().getFullYear()} — Outil personnel de suivi de la tension artérielle.
        </p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.7 }}>
          ⚠️ Avertissement : Les informations et classifications affichées par cette application sont données à titre indicatif et ne remplacent en aucun cas un avis, examen ou diagnostic médical professionnel.
        </p>
      </footer>

    </div>
  );
}
