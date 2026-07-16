import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Loader2, ShieldCheck, DatabaseBackup } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BranchSettingsOverview, BranchSecuritySetting, BranchBackupSetting } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { parseApiError } from '@/utils/errorParser';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function SecurityBackupTab({ branchId, data, refetch }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const securityForm = useForm<Partial<BranchSecuritySetting>>({ defaultValues: data.security_setting || {} });
  const backupForm = useForm<Partial<BranchBackupSetting>>({ defaultValues: data.backup_setting || {} });

  const onSecuritySubmit = async (values: Partial<BranchSecuritySetting>) => {
    try {
      setIsSaving(true);
      await branchConfigService.updateSecuritySettings(branchId, values);
      toast.success('Security settings saved');
      securityForm.reset(values);
      refetch();
    } catch (e: any) { toast.error(parseApiError(e)); } finally { setIsSaving(false); }
  };

  const onBackupSubmit = async (values: Partial<BranchBackupSetting>) => {
    try {
      setIsSaving(true);
      await branchConfigService.updateBackupSettings(branchId, values);
      toast.success('Backup settings saved');
      backupForm.reset(values);
      refetch();
    } catch (e: any) { toast.error(parseApiError(e)); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-12">
      {/* ── SECURITY ── */}
      <section className="space-y-6">
        <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Security & Access</h2>
              <p className="text-muted-foreground mt-1">Configure session limits, IP whitelists, and access restrictions.</p>
            </div>
            <Button type="submit" disabled={!securityForm.formState.isDirty || isSaving} className="shrink-0">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Security
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Session & Passwords</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-medium">Session Timeout (min)</label><input type="number" {...securityForm.register('session_timeout_minutes')} className={inputClass} /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Max Concurrent Sessions</label><input type="number" {...securityForm.register('max_concurrent_sessions')} className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-medium">Failed Login Lockout</label><input type="number" {...securityForm.register('failed_login_lockout')} className={inputClass} /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Lockout Duration (min)</label><input type="number" {...securityForm.register('lockout_duration_minutes')} className={inputClass} /></div>
                </div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Password Expiry (days, 0=Never)</label><input type="number" {...securityForm.register('password_expiry_days')} className={inputClass} /></div>
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2"><input type="checkbox" {...securityForm.register('require_2fa')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Enforce 2FA for all users</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...securityForm.register('require_device_registration')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Require Device Registration</span></label>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle>Network & Location</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2"><input type="checkbox" {...securityForm.register('ip_whitelist_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm font-medium">Enable IP Whitelisting</span></label>
                {securityForm.watch('ip_whitelist_enabled') && (
                  <div className="space-y-1.5 text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    IP Whitelist config can be managed via API array upload for now. (UI coming soon)
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <label className="flex items-center gap-2 mb-3"><input type="checkbox" {...securityForm.register('login_time_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm font-medium">Enable Login Time Restrictions</span></label>
                  {securityForm.watch('login_time_enabled') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-sm font-medium">Allowed From</label><input type="time" {...securityForm.register('login_allowed_from')} className={inputClass} /></div>
                      <div className="space-y-1.5"><label className="text-sm font-medium">Allowed Until</label><input type="time" {...securityForm.register('login_allowed_until')} className={inputClass} /></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </section>

      {/* ── BACKUP ── */}
      <section className="space-y-6 pt-6 border-t border-border">
        <form onSubmit={backupForm.handleSubmit(onBackupSubmit)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><DatabaseBackup className="w-6 h-6 text-primary" /> Backup Settings</h2>
              <p className="text-muted-foreground mt-1">Configure automated database and log backups for this branch.</p>
            </div>
            <Button type="submit" disabled={!backupForm.formState.isDirty || isSaving} className="shrink-0">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Backup Config
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Schedule & Retention</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2"><input type="checkbox" {...backupForm.register('auto_backup_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm font-medium">Enable Automated Backups</span></label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Schedule</label>
                    <select {...backupForm.register('backup_schedule')} className={inputClass}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Time</label><input type="time" {...backupForm.register('backup_time')} className={inputClass} /></div>
                </div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Retention Days</label><input type="number" {...backupForm.register('retention_days')} className={inputClass} /></div>
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="flex items-center gap-2"><input type="checkbox" {...backupForm.register('compress_backup')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Compress Backup (GZIP)</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...backupForm.register('encrypt_backup')} className="rounded border-gray-300 text-primary" /><span className="text-sm">Encrypt Backup files</span></label>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle>Destinations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2"><input type="checkbox" {...backupForm.register('local_backup_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm font-medium">Local Storage</span></label>
                  {backupForm.watch('local_backup_enabled') && <div className="space-y-1.5 pl-6"><label className="text-sm font-medium">Local Path</label><input {...backupForm.register('local_backup_path')} className={inputClass} placeholder="e.g. /var/backups/nepms" /></div>}
                </div>
                
                <div className="space-y-3 pt-3 border-t border-border">
                  <label className="flex items-center gap-2"><input type="checkbox" {...backupForm.register('cloud_backup_enabled')} className="rounded border-gray-300 text-primary" /><span className="text-sm font-medium">Cloud Storage (S3 / GCP / Azure)</span></label>
                  {backupForm.watch('cloud_backup_enabled') && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Provider</label>
                        <select {...backupForm.register('cloud_provider')} className={inputClass}>
                          <option value="aws_s3">AWS S3</option>
                          <option value="gcp_storage">Google Cloud Storage</option>
                          <option value="azure_blob">Azure Blob</option>
                        </select>
                      </div>
                      <div className="space-y-1.5"><label className="text-sm font-medium">Bucket / Container</label><input {...backupForm.register('cloud_bucket')} className={inputClass} /></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </section>
    </div>
  );
}
