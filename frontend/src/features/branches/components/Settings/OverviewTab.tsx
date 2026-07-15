import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Smartphone, 
  Printer, 
  Box, 
  Monitor, 
  ShieldAlert, 
  DatabaseBackup,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { BranchSettingsOverview } from '@/features/branches/types/branchConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function OverviewTab({ branchId, data, refetch }: Props) {
  const h = data.health;
  
  if (!h) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-10 h-10 text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium">Health Data Unavailable</h3>
        <p className="text-muted-foreground text-sm mt-1">Unable to load branch health metrics.</p>
      </div>
    );
  }

  // Generate missing config alerts
  const missing = h.missing_configs || [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Branch Health Overview</h2>
        <p className="text-muted-foreground mt-1">Real-time status of branch configuration and operational readiness.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <Card className="lg:col-span-1 border-primary/20 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0 pointer-events-none" />
          <CardHeader className="relative z-10 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Configuration Health Score</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex flex-col items-center justify-center py-6">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`text-6xl font-bold tracking-tighter ${getScoreColor(h.config_health_score)}`}
              >
                {Math.round(h.config_health_score)}
              </motion.div>
              <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>100</span>
                </div>
                <Progress 
                  value={h.config_health_score} 
                  className="h-2"
                  indicatorClassName={getScoreBg(h.config_health_score)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Missing Configs / Alerts */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missing.length === 0 && h.licenses_expiring_soon === 0 && h.licenses_expired === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-medium">All Systems Go</p>
                <p className="text-sm text-muted-foreground">Branch is fully configured and ready.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {missing.map((m, i) => (
                  <motion.li 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Missing configuration: <strong>{m}</strong></span>
                  </motion.li>
                ))}
                {h.licenses_expired > 0 && (
                  <li className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <span><strong>{h.licenses_expired}</strong> license(s) have expired!</span>
                  </li>
                )}
                {h.licenses_expiring_soon > 0 && (
                  <li className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span><strong>{h.licenses_expiring_soon}</strong> license(s) expiring soon.</span>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <motion.div 
        variants={containerVars}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <MetricCard title="Users" value={h.active_users} icon={Users} />
        <MetricCard title="Devices" value={h.active_devices} icon={Smartphone} />
        <MetricCard title="Printers" value={h.connected_printers} icon={Printer} />
        <MetricCard title="Warehouses" value={h.active_warehouses} icon={Box} />
        <MetricCard title="Counters" value={h.active_counters} icon={Monitor} />
        <MetricCard 
          title="Storage (MB)" 
          value={Math.round(h.storage_used_mb)} 
          icon={DatabaseBackup} 
          subtitle={h.last_backup_status === 'success' ? 'Backup OK' : 'No Backup'}
          subtitleColor={h.last_backup_status === 'success' ? 'text-green-500' : 'text-red-500'}
        />
      </motion.div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, subtitle, subtitleColor }: any) {
  return (
    <motion.div variants={itemVars}>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-2">
          <div className="p-3 bg-primary/10 rounded-full text-primary mb-1">
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs font-medium text-muted-foreground">{title}</div>
          {subtitle && (
            <div className={`text-[10px] font-semibold mt-1 ${subtitleColor || 'text-muted-foreground'}`}>
              {subtitle}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
