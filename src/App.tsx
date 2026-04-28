/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { 
  FileUp, 
  Settings, 
  BarChart3, 
  Activity, 
  FileText, 
  Loader2, 
  AlertCircle,
  Download,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts';

import { convertPdfToImages } from './services/pdfService';
import { analyzeSieveGraph, CurveData } from './services/analysisService';
import { calculateConductivity, CalculationResult } from './services/calculationService';

interface ResultWithAnalysis extends CurveData {
  calculation: CalculationResult;
}

interface PageResult {
  pageNumber: number;
  image: string;
  curves: ResultWithAnalysis[];
}

export default function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageResults, setPageResults] = useState<PageResult[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setPageResults([]);
    setCurrentPageIndex(0);

    try {
      const images: string[] = [];
      if (file.type === 'application/pdf') {
        const pdfImages = await convertPdfToImages(file);
        images.push(...pdfImages);
      } else if (file.type.startsWith('image/')) {
        const img = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        images.push(img);
      } else {
        throw new Error("Ogiltig filtyp. Vänligen ladda upp PDF eller bild.");
      }

      const allPageResults: PageResult[] = [];
      
      // Analyze pages sequentially or in small batches
      for (let i = 0; i < images.length; i++) {
        const curveData = await analyzeSieveGraph(images[i]);
        const analyzedResults = curveData.map(curve => ({
          ...curve,
          calculation: calculateConductivity(curve.d10!, curve.d60!)
        }));

        allPageResults.push({
          pageNumber: i + 1,
          image: images[i],
          curves: analyzedResults
        });
        
        // Update partially if needed, or just at the end
        setPageResults([...allPageResults]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Misslyckades att analysera filen.");
    } finally {
      setIsUploading(false);
    }
  };

  const currentResult = pageResults[currentPageIndex];

  const chartData = currentResult ? Array.from(new Set(currentResult.curves.flatMap(r => r.points.map(p => p.x)))).sort((a: number, b: number) => a - b).map(x => {
    const entry: any = { x };
    currentResult.curves.forEach(r => {
      const match = r.points.find(p => p.x === x);
      if (match) entry[r.id] = match.y;
    });
    return entry;
  }) : [];

  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500/30">
      <div className="mesh-bg" />
      
      {/* Header */}
      <header className="glass-panel mx-4 mt-4 p-4 flex justify-between items-center sticky top-4 z-50 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SieveScan AI <span className="text-blue-400 font-light text-sm ml-2">v2.4.0</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-200/50 font-mono">Geotechnical Data Extraction</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 transition-colors rounded-lg">
            <Settings className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">        {/* Hero / Upload Section */}
        <AnimatePresence mode="wait">
          {pageResults.length === 0 && !isUploading ? (
            <motion.div 
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] glass-panel p-12 text-center border-white/10"
            >
              <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/30">
                <FileUp className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-bold mb-4 tracking-tight">Ladda upp siktanalys</h2>
              <p className="text-lg text-white/50 max-w-md mb-8">
                Dra och släpp en PDF eller bild. Vår AI extraherar kornfördelningen och beräknar hydraulisk konduktivitet med Hazen & Gustafson för alla sidor och kurvor.
              </p>
              
              <label className="group relative cursor-pointer">
                <div className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 group-active:scale-95">
                  <FileText className="w-5 h-5" />
                  Välj PDF eller Bilder
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*" 
                  multiple
                  onChange={handleFileUpload}
                />
              </label>

              {error && (
                <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 animate-pulse">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </motion.div>
          ) : isUploading && pageResults.length === 0 ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
                <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse rounded-full" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Behandlar dokument...</h2>
              <p className="text-white/40 font-mono text-sm mt-2">Extraherar D10/D60 och identifierar kurv-metadata</p>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setPageResults([])}
                  className="text-xs font-mono uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-2 transition-colors"
                >
                  ← Ny analys
                </button>

                {pageResults.length > 1 && (
                  <div className="flex items-center gap-4 glass-panel p-2 rounded-xl">
                    <button 
                      disabled={currentPageIndex === 0}
                      onClick={() => setCurrentPageIndex(p => p - 1)}
                      className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-20"
                    >
                      ←
                    </button>
                    <span className="text-xs font-mono">Sida {currentPageIndex + 1} av {pageResults.length}</span>
                    <button 
                      disabled={currentPageIndex === pageResults.length - 1}
                      onClick={() => setCurrentPageIndex(p => p + 1)}
                      className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-20"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>

              {currentResult && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Visual Results */}
                  <div className="lg:col-span-2 space-y-8 text-white/80">
                    {/* Graph Card */}
                    <div className="glass-panel p-8 relative overflow-hidden flex flex-col min-h-[500px]">
                      <div className="flex justify-between items-start mb-10">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Kornstorleksfördelning</h3>
                          <p className="text-xl font-bold text-white">Sida {currentResult.pageNumber} Analys</p>
                        </div>
                        <div className="flex flex-wrap gap-2 max-w-[50%] justify-end">
                          {currentResult.curves.map((r, i) => (
                             <div key={r.id} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-md border border-white/10 text-[9px] font-medium">
                               <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: `hsl(${i * 137.5}, 70%, 50%)` }}></div>
                               {r.name}
                             </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 w-full bg-white/[0.02] rounded-xl border border-white/5 graph-bg p-4 flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                              dataKey="x" 
                              type="number" 
                              domain={[0.001, 100]} 
                              scale="log" 
                              base={10} 
                              ticks={[0.001, 0.01, 0.1, 1, 10, 100]}
                              tickFormatter={(val) => val.toString()}
                              stroke="rgba(255,255,255,0.3)"
                              tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'rgba(255,255,255,0.5)' }}
                            />
                            <YAxis 
                              domain={[0, 100]} 
                              stroke="rgba(255,255,255,0.3)"
                              tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'rgba(255,255,255,0.5)' }}
                              ticks={[0, 20, 40, 60, 80, 100]}
                              tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                              }}
                              itemStyle={{ color: '#fff', fontSize: '11px' }}
                              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}
                              labelFormatter={(val) => `Storlek: ${val} mm`}
                            />
                            
                            <ReferenceLine y={10} stroke="rgba(248, 113, 113, 0.4)" strokeDasharray="4 4" label={{ value: '10%', position: 'right', fontSize: 10, fill: '#f87171', opacity: 0.6 }} />
                            <ReferenceLine y={60} stroke="rgba(248, 113, 113, 0.4)" strokeDasharray="4 4" label={{ value: '60%', position: 'right', fontSize: 10, fill: '#f87171', opacity: 0.6 }} />

                            {currentResult.curves.map((r, i) => (
                              <Line 
                                key={r.id}
                                type="monotone" 
                                dataKey={r.id} 
                                stroke={`hsl(${i * 137.5}, 70%, 50%)`} 
                                strokeWidth={3} 
                                dot={false} 
                                name={r.name}
                                animationDuration={1000}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Source Page Preview */}
                    <div className="glass-panel p-8">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">Originalgraf (Sida {currentResult.pageNumber})</h3>
                      <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                        <img src={currentResult.image} alt="Source" className="w-full h-auto max-h-[500px] object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                        <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                {/* Right Column: Calculations for current page curves */}
                <div className="space-y-6">
                  <div className="glass-panel overflow-hidden border-white/10 shadow-2xl">
                    <div className="p-6 border-b border-white/10 bg-white/5">
                      <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">Resultatsammanfattning</h4>
                      <p className="text-[10px] text-white/40 font-mono mt-1 italic">Hydraulisk konduktivitet K (m/s)</p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-black/20 text-[10px] font-mono uppercase text-white/40">
                            <th className="p-4 font-medium border-b border-white/5">Prov / Nivå</th>
                            <th className="p-4 font-medium border-b border-white/5">D10 (mm)</th>
                            <th className="p-4 font-medium border-b border-white/5">Hazen</th>
                            <th className="p-4 font-medium border-b border-white/5">Gustafson</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px] font-mono">
                          {currentResult.curves.map((r, i) => (
                            <tr key={r.id} className="group hover:bg-white/5 transition-colors">
                              <td className="p-4 border-b border-white/5 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: `hsl(${i * 137.5}, 70%, 50%)`, backgroundColor: 'currentColor' }} />
                                  <span className="text-white font-bold">{r.name}</span>
                                </div>
                              </td>
                              <td className="p-4 border-b border-white/5 text-blue-300">
                                {r.d10?.toFixed(4)}
                                {r.extrapolatedD10 && <span className="ml-1 text-[8px] text-amber-500 font-bold">*</span>}
                              </td>
                              <td className="p-4 border-b border-white/5 text-emerald-400 font-bold">
                                {r.calculation.hazenK.toExponential(2)}
                              </td>
                              <td className="p-4 border-b border-white/5 text-emerald-400 font-bold">
                                {r.calculation.gustafsonK.toExponential(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed Analysis (Optional/Smaller) */}
                  <div className="grid grid-cols-1 gap-4">
                    {currentResult.curves.slice(0, 2).map((r, i) => (
                      <div key={r.id} className="glass-panel p-4 text-[10px] border-white/5">
                        <div className="flex justify-between mb-2">
                           <span className="opacity-40 uppercase font-bold tracking-tighter">{r.name} Detaljer</span>
                           <span className="text-blue-400">U={r.calculation.u.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between opacity-30 italic">
                          <span>e={r.calculation.e.toFixed(3)}</span>
                          <span>g={r.calculation.g.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-4 glass-panel border-blue-500/20 text-blue-400 font-bold flex items-center justify-center gap-2 hover:bg-blue-500/10 transition-all active:scale-95">
                    <Download className="w-5 h-5" />
                    Exportera Sidan
                  </button>
                </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Footer */}
      <footer className="mt-20 py-12 glass-panel border-x-0 border-b-0 px-10 flex flex-col md:flex-row justify-between items-center gap-6 rounded-none">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-500 opacity-50" />
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">© 2026 SieveScan AI / Georesources AB</p>
        </div>
        <div className="flex gap-8">
           <a href="#" className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20 hover:text-blue-400 transition-colors">Dokumentation</a>
           <a href="#" className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20 hover:text-blue-400 transition-colors">API</a>
           <a href="#" className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20 hover:text-blue-400 transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
