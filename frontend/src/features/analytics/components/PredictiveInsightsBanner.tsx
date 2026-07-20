import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CloudRain, TrendingUp, Activity, Box, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { MarketInsight } from '../services/analytics.api';

interface PredictiveInsightsBannerProps {
  insights: MarketInsight[];
  isLoading: boolean;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'weather': return <CloudRain className="w-5 h-5" />;
    case 'trend': return <TrendingUp className="w-5 h-5" />;
    case 'health': return <Activity className="w-5 h-5" />;
    case 'inventory': return <Box className="w-5 h-5" />;
    default: return <Sparkles className="w-5 h-5" />;
  }
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'bg-rose-500/20 text-rose-100 border-rose-500/30';
    case 'medium':
      return 'bg-amber-500/20 text-amber-100 border-amber-500/30';
    case 'low':
    default:
      return 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'high': return <AlertTriangle className="w-4 h-4 text-rose-300" />;
    case 'medium': return <AlertCircle className="w-4 h-4 text-amber-300" />;
    case 'low':
    default: return <Info className="w-4 h-4 text-emerald-300" />;
  }
};

export const PredictiveInsightsBanner: React.FC<PredictiveInsightsBannerProps> = ({ insights, isLoading }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 text-white shadow-xl border border-indigo-500/20"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-32 h-32" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md shadow-inner border border-white/10">
            <Sparkles className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">AI Predictive Insights</h3>
            <p className="text-xs text-indigo-200 font-medium tracking-wider uppercase">Powered by Gemini 1.5</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {insights.map((insight, idx) => (
            <motion.div 
              key={insight.id || idx}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 200 }}
              className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm shadow-sm ${getSeverityStyles(insight.severity)}`}
            >
              <div className="mt-0.5">
                {getIconForType(insight.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
                    {insight.type}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-black/20 px-2 py-0.5 rounded-full">
                    {getSeverityIcon(insight.severity)}
                    {insight.severity}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  {insight.message}
                </p>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-1 md:col-span-2 flex items-center justify-center p-6 rounded-xl border border-dashed border-indigo-400/30 bg-indigo-500/10"
            >
              <div className="flex items-center gap-3 text-indigo-200 animate-pulse">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium">Gemini is analyzing live market data (Weather, Health, Trends)...</span>
              </div>
            </motion.div>
          )}

          {!isLoading && insights.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-1 md:col-span-2 p-4 text-sm text-indigo-200 bg-black/10 rounded-xl"
            >
              No active alerts at this moment. The market is stable.
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
