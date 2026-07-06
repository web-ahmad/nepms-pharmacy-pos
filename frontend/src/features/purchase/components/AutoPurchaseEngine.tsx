import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSuppliers, useAutoSuggestPOs, useGenerateAutoSplitPOs } from '../services/purchase.api';
import { CheckSquare, Square, RefreshCw, Zap, TrendingUp, PackageSearch, ChevronDown, CheckCircle2, Search, Plus } from 'lucide-react';
import { useMedicines } from '@/features/inventory/services/inventory.api';

export default function AutoPurchaseEngine() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [isFetched, setIsFetched] = useState(false);
  const [strategy, setStrategy] = useState('low_stock');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [itemSuppliers, setItemSuppliers] = useState<Record<string, string>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [activeHistoryItem, setActiveHistoryItem] = useState<any | null>(null);

  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualSearch, setManualSearch] = useState('');
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const { data: allMedicinesData } = useMedicines('', 1, 1000);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsManualSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: allSuppliers } = useSuppliers();

  const regions = useMemo(() => {
    if (!allSuppliers) return [];
    const rgs = new Set<string>();
    allSuppliers.forEach((s: any) => {
      if (s.region_name) rgs.add(s.region_name);
    });
    return Array.from(rgs);
  }, [allSuppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!allSuppliers) return [];
    if (!selectedRegion) return allSuppliers;
    return allSuppliers.filter((s: any) => s.region_name === selectedRegion);
  }, [allSuppliers, selectedRegion]);

  const { data: suggestions, isFetching } = useAutoSuggestPOs(selectedRegion, selectedSupplier, strategy);
  const generateMutation = useGenerateAutoSplitPOs();

  const gridItems = useMemo(() => {
    const fetched = suggestions || [];
    return [...fetched, ...manualItems];
  }, [suggestions, manualItems]);

  const handleAddManualItem = (med: any) => {
    const alreadyExists = gridItems.find(i => i.medicine_id === med.id);
    if (alreadyExists) return alert("Item already in the matrix");

    const options = allSuppliers && allSuppliers.length > 0
      ? allSuppliers.map((s: any) => ({
        supplier_id: s.id,
        supplier_name: s.name,
        trade_price: med.trade_price || med.purchase_price || 0,
        bonus_scheme_threshold: 0,
        is_fallback: !med.trade_price
      }))
      : [{
        supplier_id: 'unknown',
        supplier_name: 'No Supplier Available',
        trade_price: med.trade_price || med.purchase_price || 0,
        bonus_scheme_threshold: 0,
        is_fallback: !med.trade_price
      }];

    const newItem = {
      medicine_id: med.id,
      medicine_name: med.name,
      current_stock: med.current_stock,
      sales_velocity: "Manual Inject",
      options: options
    };

    setManualItems(prev => [...prev, newItem]);
    setSelectedItems(prev => ({ ...prev, [med.id]: true }));
    setItemQuantities(prev => ({ ...prev, [med.id]: 1 }));
    setItemSuppliers(prev => ({ ...prev, [med.id]: options[0].supplier_id }));
    setManualSearch('');
    setIsManualSearchOpen(false);
    setIsFetched(true);
  };

  React.useEffect(() => {
    if (suggestions) {
      const initialsChecked: any = {};
      const initialSups: any = {};
      const initialQtys: any = {};
      suggestions.forEach((item: any) => {
        initialsChecked[item.medicine_id] = true;
        const defaultOpt = item.options.find((o: any) => o.supplier_id === selectedSupplier) || item.options[0];
        if (defaultOpt) {
          initialSups[item.medicine_id] = defaultOpt.supplier_id;
        }
        initialQtys[item.medicine_id] = item.suggested_quantity;
      });
      setSelectedItems(prev => ({ ...prev, ...initialsChecked }));
      setItemSuppliers(prev => ({ ...prev, ...initialSups }));
      setItemQuantities(prev => ({ ...prev, ...initialQtys }));
      setIsFetched(true);
    }
  }, [suggestions, selectedSupplier]);

  const toggleItem = (medId: string) => {
    setSelectedItems(prev => ({ ...prev, [medId]: !prev[medId] }));
  };

  const handleGeneratePO = async () => {
    if (gridItems.length === 0) return;
    const itemsToOrder = gridItems.filter((s: any) => selectedItems[s.medicine_id] && itemSuppliers[s.medicine_id]).map((s: any) => {
      const supId = itemSuppliers[s.medicine_id];
      const opt = s.options.find((o: any) => o.supplier_id === supId);
      return {
        medicine_id: s.medicine_id,
        supplier_id: supId,
        quantity: itemQuantities[s.medicine_id] || 1,
        unit_price: opt ? opt.trade_price : 0
      };
    });

    if (itemsToOrder.length === 0) return alert('No items selected');

    await generateMutation.mutateAsync({ items: itemsToOrder });
    router.push('/purchase/orders');
  };

  // Mock historical data generator
  const getHistoricalData = (medName: string) => [
    { date: '2026-05-10', qty: 50, supplier: 'Pharma Dist', price: 120.50 },
    { date: '2026-04-15', qty: 40, supplier: 'Global Med', price: 118.00 },
    { date: '2026-03-20', qty: 60, supplier: 'Pharma Dist', price: 115.00 },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-['Inter']">

      {/* A. Interactive Selector Top Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col gap-1.5 w-full md:w-64">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Region Target</label>
            <select
              value={selectedRegion}
              onChange={e => { setSelectedRegion(e.target.value); setSelectedSupplier(''); }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
            >
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-full md:w-64">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Supplier Filter</label>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
            >
              <option value="">All Available Suppliers</option>
              {filteredSuppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-2">
          <button
            onClick={() => setStrategy('low_stock')}
            disabled={isFetching}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70"
          >
            {isFetching && strategy === 'low_stock' ? <RefreshCw className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5" />}
            Auto-Fetch Low Stock
          </button>

          <button
            onClick={() => setStrategy('predictive')}
            disabled={isFetching}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-amber-200 transition-all active:scale-95 disabled:opacity-70"
          >
            {isFetching && strategy === 'predictive' ? <RefreshCw className="animate-spin w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            Predictive Restock
          </button>
        </div>
      </div>

      {/* B. The Auto-Fetch Interactive Grid */}
      {isFetched && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-zinc-800 flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-indigo-500" />
              Intelligence Results Matrix
            </h3>

            <div className="flex items-center gap-4">
              <div className="relative w-64" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search to inject manually..."
                    value={manualSearch}
                    onChange={(e) => { setManualSearch(e.target.value); setIsManualSearchOpen(true); }}
                    onFocus={() => setIsManualSearchOpen(true)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-full border border-zinc-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {isManualSearchOpen && manualSearch && (
                  <div className="absolute top-full mt-1 w-full max-w-sm bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {allMedicinesData?.items?.filter((m: any) => m.name.toLowerCase().includes(manualSearch.toLowerCase())).length === 0 ? (
                      <div className="p-3 text-sm text-zinc-500 text-center">No medicines found.</div>
                    ) : (
                      allMedicinesData?.items?.filter((m: any) => m.name.toLowerCase().includes(manualSearch.toLowerCase())).map((med: any) => (
                        <div
                          key={med.id}
                          onClick={() => handleAddManualItem(med)}
                          className="px-4 py-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center border-b border-zinc-50 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-zinc-800">{med.name}</span>
                            <span className="text-xs text-zinc-500">Stock: {med.current_stock}</span>
                          </div>
                          <Plus className="w-4 h-4 text-indigo-500" />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <span className="text-sm font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full whitespace-nowrap">
                {gridItems.length} Assets Identified
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/50 text-zinc-500 border-b border-zinc-100">
                <tr>
                  <th className="px-4 py-3 font-medium w-12 text-center">Inc</th>
                  <th className="px-4 py-3 font-medium">Medicine Asset</th>
                  <th className="px-4 py-3 font-medium text-right">Current Stock</th>
                  <th className="px-4 py-3 font-medium text-center">Velocity</th>
                  <th className="px-4 py-3 font-medium text-right">Suggested Qty</th>
                  <th className="px-4 py-3 font-medium">Sourcing Hub & Pricing Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {gridItems.map((item: any) => (
                  <tr
                    key={item.medicine_id}
                    onClick={() => setActiveHistoryItem(item)}
                    className={`cursor-pointer transition-colors ${activeHistoryItem?.medicine_id === item.medicine_id ? 'bg-indigo-50/40' : 'hover:bg-zinc-50/80'}`}
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => { e.stopPropagation(); toggleItem(item.medicine_id); }}>
                      <button className={`p-0.5 rounded ${selectedItems[item.medicine_id] ? 'text-indigo-600 bg-indigo-50' : 'text-zinc-300'}`}>
                        {selectedItems[item.medicine_id] ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{item.medicine_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.current_stock < 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-500 bg-orange-50 w-max mx-auto px-2 py-0.5 rounded-full text-xs font-medium">
                        <TrendingUp className="w-3 h-3" /> {item.sales_velocity}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        value={itemQuantities[item.medicine_id] || 0}
                        onChange={(e) => setItemQuantities({ ...itemQuantities, [item.medicine_id]: parseInt(e.target.value) || 0 })}
                        className="w-20 text-right border border-zinc-200 rounded bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-flex w-full max-w-[350px]">
                        <select
                          value={itemSuppliers[item.medicine_id] || ''}
                          onChange={(e) => setItemSuppliers({ ...itemSuppliers, [item.medicine_id]: e.target.value })}
                          className="w-full appearance-none bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {item.options.map((opt: any) => {
                            const isBestValue = Math.min(...item.options.map((o: any) => o.trade_price)) === opt.trade_price;
                            const isSlow = opt.delivery_lead_time_days > 7;
                            return (
                              <option key={opt.supplier_id} value={opt.supplier_id}>
                                {opt.supplier_name} — Rs {opt.trade_price.toFixed(2)}
                                {opt.bonus_scheme_threshold > 0 ? ` (Buy ${opt.bonus_scheme_threshold} get 1)` : ''}
                                {opt.is_fallback ? '  (Ledger Fallback)' : (isBestValue ? '  Best Value' : '')}
                                {isSlow ? '  Slow Lead' : ''}
                              </option>
                            )
                          })}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>

                      {/* Profit Margin Indicator */}
                      <div className="mt-1 text-xs text-zinc-500 flex items-center gap-1">
                        {(() => {
                          const supOpt = item.options.find((o: any) => o.supplier_id === itemSuppliers[item.medicine_id]);
                          if (!supOpt) return null;
                          const isBest = Math.min(...item.options.map((o: any) => o.trade_price)) === supOpt.trade_price;
                          const isSlow = supOpt.delivery_lead_time_days > 7;
                          return (
                            <>
                              {!supOpt.is_fallback && isBest && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Optimal Margin</span>}
                              {supOpt.is_fallback && <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-medium">System Fallback Price</span>}
                              {isSlow && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">SLA Warning: Slow</span>}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
                {gridItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                      No items currently near reorder thresholds for this criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-100 bg-white flex justify-end">
            <button
              onClick={handleGeneratePO}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-70"
            >
              {generateMutation.isPending ? <RefreshCw className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              Execute Auto-Split PO Generation
            </button>
          </div>
        </div>
      )}

      {/* C. Embedded Purchase History Tracker */}
      {activeHistoryItem && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-zinc-800">
              3-Month Historical Purchase Audit: <span className="text-indigo-600">{activeHistoryItem.medicine_name}</span>
            </h3>
            <button onClick={() => setActiveHistoryItem(null)} className="text-sm font-medium text-zinc-400 hover:text-zinc-600">Close Panel</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {getHistoricalData(activeHistoryItem.medicine_name).map((hist, i) => (
              <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl"></div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{hist.date}</span>
                <span className="font-semibold text-zinc-900">{hist.supplier}</span>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-sm text-zinc-600">Qty: <strong className="text-zinc-900">{hist.qty}</strong></span>
                  <span className="text-sm font-mono font-medium text-indigo-600">Rs {hist.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="bg-indigo-50/50 border border-indigo-100 border-dashed rounded-xl p-4 flex flex-col justify-center items-center text-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-800">Price Trend Stable.<br />No overpayment detected.</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
