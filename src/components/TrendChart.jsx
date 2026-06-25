import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';

export default function TrendChart({ data }) {
  const [timeframe, setTimeframe] = useState('7'); // '7', '30', 'all'
  const [hoveredPoint, setHoveredPoint] = useState(null); // { index, x, y, date, sys, dia, pulse }

  // Préparer et trier les données chronologiquement
  const chartData = useMemo(() => {
    const dates = Object.keys(data).sort((a, b) => a.localeCompare(a));
    const formatted = dates
      .map((dateStr) => {
        const day = data[dateStr];
        if (!day.avg) return null;
        return {
          dateStr,
          displayDate: dateStr.split('-').slice(1).reverse().join('/'), // MM/DD -> DD/MM
          sys: day.avg.global ? day.avg.global.sys : day.avg.sys,
          dia: day.avg.global ? day.avg.global.dia : day.avg.dia,
          pulse: day.avg.global ? day.avg.global.pulse : day.avg.pulse,
        };
      })
      .filter(Boolean);

    // Filtrer selon la période sélectionnée
    if (timeframe === '7') {
      return formatted.slice(-7);
    } else if (timeframe === '30') {
      return formatted.slice(-30);
    }
    return formatted;
  }, [data, timeframe]);

  // Dimensions de l'SVG
  const svgWidth = 600;
  const svgHeight = 300;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };

  // Calculer les échelles
  const scales = useMemo(() => {
    if (chartData.length === 0) return null;

    // Trouver le min et max pour les échelles
    let maxVal = 180;
    let minVal = 50;

    chartData.forEach((d) => {
      if (d.sys > maxVal) maxVal = d.sys;
      if (d.dia < minVal) minVal = d.dia;
      if (d.pulse < minVal) minVal = d.pulse;
      if (d.pulse > maxVal) maxVal = d.pulse;
    });

    // Ajouter des marges de sécurité
    maxVal = Math.ceil((maxVal + 15) / 10) * 10;
    minVal = Math.floor((minVal - 15) / 10) * 10;
    if (minVal < 30) minVal = 30; // ne pas descendre trop bas

    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    return {
      x: (index) => {
        if (chartData.length <= 1) return padding.left + chartWidth / 2;
        return padding.left + (index / (chartData.length - 1)) * chartWidth;
      },
      y: (val) => {
        const ratio = (val - minVal) / (maxVal - minVal);
        return padding.top + chartHeight - ratio * chartHeight;
      },
      minVal,
      maxVal,
    };
  }, [chartData, svgWidth, svgHeight]);

  // Générer les lignes SVG
  const lines = useMemo(() => {
    if (!scales || chartData.length === 0) return { sysPath: '', diaPath: '', pulsePath: '' };

    let sysPoints = [];
    let diaPoints = [];
    let pulsePoints = [];

    chartData.forEach((d, i) => {
      const x = scales.x(i);
      sysPoints.push(`${x},${scales.y(d.sys)}`);
      diaPoints.push(`${x},${scales.y(d.dia)}`);
      pulsePoints.push(`${x},${scales.y(d.pulse)}`);
    });

    return {
      sysPath: sysPoints.length > 0 ? `M ${sysPoints.join(' L ')}` : '',
      diaPath: diaPoints.length > 0 ? `M ${diaPoints.join(' L ')}` : '',
      pulsePath: pulsePoints.length > 0 ? `M ${pulsePoints.join(' L ')}` : '',
    };
  }, [chartData, scales]);

  // Lignes de guidage horizontales (tous les 20 mmHg)
  const yTicks = useMemo(() => {
    if (!scales) return [];
    const ticks = [];
    const step = 20;
    
    // Commencer au plus proche multiple de step au-dessus de minVal
    let start = Math.ceil(scales.minVal / step) * step;
    for (let val = start; val <= scales.maxVal; val += step) {
      ticks.push(val);
    }
    return ticks;
  }, [scales]);

  const handleMouseMove = (e, index, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Position par rapport au conteneur du graphique
    const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const x = rect.left - svgRect.left + rect.width / 2;
    const y = rect.top - svgRect.top - 85;

    setHoveredPoint({
      index,
      x,
      y,
      date: chartData[index].dateStr.split('-').reverse().join('/'),
      sys: item.sys,
      dia: item.dia,
      pulse: item.pulse,
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="glass-card">
      <div className="history-controls">
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
          Tendances Graphiques
        </h2>
        
        <div className="nav-tabs" style={{ padding: '0.2rem' }}>
          <button 
            className={`nav-tab ${timeframe === '7' ? 'active' : ''}`}
            onClick={() => setTimeframe('7')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            7 Jours
          </button>
          <button 
            className={`nav-tab ${timeframe === '30' ? 'active' : ''}`}
            onClick={() => setTimeframe('30')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            30 Jours
          </button>
          <button 
            className={`nav-tab ${timeframe === 'all' ? 'active' : ''}`}
            onClick={() => setTimeframe('all')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            Tout
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <TrendingUp size={36} />
          </div>
          <h3>Aucune donnée à analyser</h3>
          <p>Enregistrez des mesures pour visualiser vos graphiques de tendances.</p>
        </div>
      ) : (
        <div className="chart-container">
          {/* Tooltip interactif */}
          {hoveredPoint && (
            <div 
              className="chart-tooltip" 
              style={{ 
                left: `${hoveredPoint.x}px`, 
                top: `${hoveredPoint.y}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="tooltip-title">{hoveredPoint.date}</div>
              <div className="tooltip-row">
                <span className="tooltip-label">Moy. Tension :</span>
                <span className="tooltip-val tooltip-sys">{hoveredPoint.sys}/{hoveredPoint.dia} <span style={{fontSize:'0.7rem',fontWeight:400}}>mmHg</span></span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Moy. Pouls :</span>
                <span className="tooltip-val tooltip-pulse">{hoveredPoint.pulse} <span style={{fontSize:'0.7rem',fontWeight:400}}>bpm</span></span>
              </div>
            </div>
          )}

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="chart-svg">
            {/* Grille horizontale et labels Y */}
            {scales && yTicks.map((val) => {
              const y = scales.y(val);
              return (
                <g key={val}>
                  <line 
                    x1={padding.left} 
                    y1={y} 
                    x2={svgWidth - padding.right} 
                    y2={y} 
                    className="chart-grid" 
                  />
                  <text 
                    x={padding.left - 10} 
                    y={y + 4} 
                    textAnchor="end" 
                    className="chart-text"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Lignes de tendance */}
            {lines.sysPath && (
              <path 
                d={lines.sysPath} 
                className="chart-line-sys" 
              />
            )}
            {lines.diaPath && (
              <path 
                d={lines.diaPath} 
                className="chart-line-dia" 
              />
            )}
            {lines.pulsePath && (
              <path 
                d={lines.pulsePath} 
                className="chart-line-pulse" 
              />
            )}

            {/* Points de données (Systolique) */}
            {scales && chartData.map((d, i) => {
              const cx = scales.x(i);
              const cySys = scales.y(d.sys);
              return (
                <circle 
                  key={`sys-${i}`}
                  cx={cx}
                  cy={cySys}
                  r="5"
                  className="chart-point-sys chart-point"
                  onMouseMove={(e) => handleMouseMove(e, i, d)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}

            {/* Points de données (Diastolique) */}
            {scales && chartData.map((d, i) => {
              const cx = scales.x(i);
              const cyDia = scales.y(d.dia);
              return (
                <circle 
                  key={`dia-${i}`}
                  cx={cx}
                  cy={cyDia}
                  r="5"
                  className="chart-point-dia chart-point"
                  onMouseMove={(e) => handleMouseMove(e, i, d)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}

            {/* Axe X (Labels des dates) */}
            {scales && chartData.map((d, i) => {
              const x = scales.x(i);
              // Afficher toutes les étiquettes pour 7 jours, une sur deux pour 30 jours
              if (timeframe === '30' && i % 3 !== 0) return null;
              if (timeframe === 'all' && chartData.length > 10 && i % Math.ceil(chartData.length / 8) !== 0) return null;
              
              return (
                <text 
                  key={`date-${i}`}
                  x={x}
                  y={svgHeight - padding.bottom + 20}
                  textAnchor="middle"
                  className="chart-text"
                >
                  {d.displayDate}
                </text>
              );
            })}
          </svg>

          {/* Légende du graphique */}
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
              <span>Systolique (Max)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
              <span>Diastolique (Min)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ border: '1px dashed #10b981', height: '0px', width: '16px', borderRadius: '0' }}></span>
              <span>Pouls (bpm)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
