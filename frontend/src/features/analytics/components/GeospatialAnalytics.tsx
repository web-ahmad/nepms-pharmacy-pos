"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Sparkles, TrendingUp, AlertCircle, Activity, MapPin, Search } from 'lucide-react';
import { useGeospatialAnalytics, useMarketIntelligence } from '../services/analytics.api';
import { PredictiveInsightsBanner } from './PredictiveInsightsBanner';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

export function GeospatialAnalytics() {
  const { data, isLoading, isError } = useGeospatialAnalytics();
  const { data: marketInsights, isLoading: isMarketLoading } = useMarketIntelligence(data?.insights || []);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse">
        <Map className="w-10 h-10 text-indigo-400 animate-bounce mb-4" />
        <p className="text-zinc-500 font-medium">Initializing Geospatial Intelligence...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full p-6 bg-rose-50 border border-rose-200 rounded-2xl dark:bg-rose-950/30 dark:border-rose-900">
        <div className="flex items-center text-rose-600 dark:text-rose-400 mb-2">
          <AlertCircle className="w-5 h-5 mr-2" />
          <h3 className="font-semibold">Intelligence Error</h3>
        </div>
        <p className="text-sm text-rose-700 dark:text-rose-300">Unable to load geospatial data. Please ensure the backend is running and data exists.</p>
      </div>
    );
  }

  const { regions } = data;
  
  const activeRegion = selectedArea ? regions.find(r => r.area_zone === selectedArea) : regions[0];

  // Modern Color Palette
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

  return (
    <div className="space-y-6">
      <PredictiveInsightsBanner insights={marketInsights || []} isLoading={isMarketLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Map/Region List */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center text-zinc-900 dark:text-zinc-50">
              <MapPin className="w-5 h-5 mr-2 text-indigo-500" /> Regional Zones
            </h3>
          </div>
          
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {regions.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No regional data available yet.</p>
            ) : (
              regions.map((region, idx) => {
                const isSelected = activeRegion?.area_zone === region.area_zone;
                return (
                  <motion.div
                    key={region.area_zone}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedArea(region.area_zone)}
                    className={`cursor-pointer p-4 rounded-xl transition-all duration-300 border ${
                      isSelected 
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 shadow-md ring-1 ring-indigo-500/50' 
                        : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-semibold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {region.area_zone}
                      </span>
                      <Activity className={`w-4 h-4 ${isSelected ? 'text-indigo-500' : 'text-zinc-400'}`} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Revenue: Rs {region.total_sales.toLocaleString()}</span>
                      <span className="text-zinc-500">Customers: {region.total_customers}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep Dive */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Medicines per selected Area */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center text-zinc-900 dark:text-zinc-50">
                <TrendingUp className="w-5 h-5 mr-2 text-pink-500" /> 
                Top Selling Medicines
              </h3>
              {activeRegion && (
                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                  Zone: {activeRegion.area_zone}
                </span>
              )}
            </div>

            {!activeRegion || activeRegion.top_medicines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p>No medicines sold in this zone yet.</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeRegion.top_medicines} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#52525b" opacity={0.2} />
                    <XAxis type="number" fontSize={12} stroke="#52525b" tickFormatter={(v) => v.toLocaleString()} />
                    <YAxis dataKey="name" type="category" width={120} fontSize={12} stroke="#52525b" fontWeight={500} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} Units`, 'Sold Quantity']}
                    />
                    <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={30}>
                      {activeRegion.top_medicines.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Regional Radar */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-zinc-50">Revenue Distribution Radar</h3>
            <p className="text-sm text-zinc-500 mb-6">Visual comparison of regional sales performance.</p>
            
            <div className="h-[300px] w-full flex justify-center items-center">
              {regions.length < 3 ? (
                 <div className="text-center text-zinc-500">
                   Need at least 3 active regions to generate the radar matrix.
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={regions}>
                    <PolarGrid stroke="#52525b" opacity={0.3} />
                    <PolarAngleAxis dataKey="area_zone" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Total Sales']}
                    />
                    <Radar name="Revenue" dataKey="total_sales" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
