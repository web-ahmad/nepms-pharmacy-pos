import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Edit, Printer, Smartphone, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BranchSettingsOverview, BranchPrinter, BranchDevice } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';
import { Badge } from '@/components/ui/badge';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function PrintersDevicesTab({ branchId, data, refetch }: Props) {
  const printers = data.printers || [];
  const devices = data.devices || [];
  
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);
  
  const [isDeviceOpen, setIsDeviceOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const printerForm = useForm<Partial<BranchPrinter>>();
  const deviceForm = useForm<Partial<BranchDevice>>();

  // Printers CRUD
  const openNewPrinter = () => {
    printerForm.reset({ name: '', printer_type: 'thermal', connection_type: 'network', is_active: true, copies: 1 });
    setEditingPrinterId(null);
    setIsPrinterOpen(true);
  };

  const openEditPrinter = (p: BranchPrinter) => {
    printerForm.reset(p);
    setEditingPrinterId(p.id);
    setIsPrinterOpen(true);
  };

  const onPrinterSubmit = async (values: Partial<BranchPrinter>) => {
    try {
      setIsSaving(true);
      if (editingPrinterId) {
        await branchConfigService.updatePrinter(branchId, editingPrinterId, values);
        toast.success('Printer updated');
      } else {
        await branchConfigService.createPrinter(branchId, values);
        toast.success('Printer created');
      }
      setIsPrinterOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save printer');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePrinter = async (id: string) => {
    if (!confirm('Delete this printer?')) return;
    try {
      await branchConfigService.deletePrinter(branchId, id);
      toast.success('Printer deleted');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete');
    }
  };

  const setDefaultPrinter = async (id: string) => {
    try {
      await branchConfigService.setPrinterDefault(branchId, id);
      toast.success('Default printer updated');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to set default');
    }
  };

  // Devices CRUD
  const openEditDevice = (d: BranchDevice) => {
    deviceForm.reset(d);
    setEditingDeviceId(d.id);
    setIsDeviceOpen(true);
  };

  const onDeviceSubmit = async (values: Partial<BranchDevice>) => {
    if (!editingDeviceId) return;
    try {
      setIsSaving(true);
      await branchConfigService.updateDevice(branchId, editingDeviceId, values);
      toast.success('Device updated');
      setIsDeviceOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update device');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Delete this device registration?')) return;
    try {
      await branchConfigService.deleteDevice(branchId, id);
      toast.success('Device deleted');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-12">
      {/* ── PRINTERS SECTION ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Printers</h2>
            <p className="text-muted-foreground mt-1">Configure receipt and label printers.</p>
          </div>
          <Dialog open={isPrinterOpen} onOpenChange={setIsPrinterOpen}>
            <DialogTrigger>
              <Button onClick={openNewPrinter} type="button">
                <Plus className="w-4 h-4 mr-2" />
                Add Printer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPrinterId ? 'Edit Printer' : 'Add Printer'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={printerForm.handleSubmit(onPrinterSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <input {...printerForm.register('name', { required: true })} className={inputClass} placeholder="e.g. Counter 1 Thermal" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Type</label>
                    <select {...printerForm.register('printer_type')} className={inputClass}>
                      <option value="thermal">Thermal</option>
                      <option value="laser">Laser</option>
                      <option value="inkjet">Inkjet</option>
                      <option value="label">Label Printer</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Connection</label>
                    <select {...printerForm.register('connection_type')} className={inputClass}>
                      <option value="network">Network / IP</option>
                      <option value="usb">USB</option>
                      <option value="bluetooth">Bluetooth</option>
                    </select>
                  </div>
                </div>
                {printerForm.watch('connection_type') === 'network' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">IP Address</label>
                      <input {...printerForm.register('ip_address')} className={inputClass} placeholder="192.168.1.50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Port</label>
                      <input type="number" {...printerForm.register('port')} className={inputClass} placeholder="9100" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">USB / Bluetooth Path</label>
                    <input {...printerForm.register('usb_path')} className={inputClass} placeholder="e.g. LPT1 or /dev/usb/lp0" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Paper Size</label>
                    <input {...printerForm.register('paper_size')} className={inputClass} placeholder="e.g. 80mm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Default Copies</label>
                    <input type="number" {...printerForm.register('copies')} className={inputClass} />
                  </div>
                </div>
                <label className="flex items-center gap-2 pt-2">
                  <input type="checkbox" {...printerForm.register('is_active')} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  <span className="text-sm font-medium">Active</span>
                </label>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsPrinterOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {printers.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed rounded-xl">
              <Printer className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No printers configured.</p>
            </div>
          ) : (
            printers.map((p) => (
              <Card key={p.id} className={`shadow-sm relative overflow-hidden group ${p.is_default ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${p.is_active ? 'bg-primary' : 'bg-red-500'}`} />
                <CardContent className="p-4 pl-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <Printer className="w-4 h-4 text-muted-foreground" />
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase">{p.printer_type}</Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase">{p.connection_type}</Badge>
                        {p.is_default && <Badge className="text-[10px] bg-primary text-primary-foreground"><Star className="w-3 h-3 mr-1" /> Default</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!p.is_default && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => setDefaultPrinter(p.id)} title="Set as default">
                          <Star className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPrinter(p)}>
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" onClick={() => deletePrinter(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    {p.connection_type === 'network' && p.ip_address && (
                      <div>IP: <span className="font-mono">{p.ip_address}:{p.port || 9100}</span></div>
                    )}
                    {p.connection_type !== 'network' && p.usb_path && (
                      <div>Path: <span className="font-mono">{p.usb_path}</span></div>
                    )}
                    <div>Paper: {p.paper_size || 'Default'} | Copies: {p.copies}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* ── DEVICES SECTION ── */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Registered Devices</h2>
            <p className="text-muted-foreground mt-1">Manage approved POS tablets and registers.</p>
          </div>
        </div>

        <Dialog open={isDeviceOpen} onOpenChange={setIsDeviceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Device</DialogTitle>
            </DialogHeader>
            <form onSubmit={deviceForm.handleSubmit(onDeviceSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Device Name</label>
                <input {...deviceForm.register('device_name', { required: true })} className={inputClass} />
              </div>
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...deviceForm.register('is_trusted')} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  <span className="text-sm font-medium">Mark as Trusted</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...deviceForm.register('is_active')} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  <span className="text-sm font-medium">Active (Can login)</span>
                </label>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDeviceOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed rounded-xl">
              <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No devices registered. Users can register devices upon login if policy allows.</p>
            </div>
          ) : (
            devices.map((d) => (
              <Card key={d.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                        {d.device_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase">{d.device_type}</Badge>
                        {d.is_trusted && <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-700">Trusted</Badge>}
                        {!d.is_active && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDevice(d)}>
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" onClick={() => deleteDevice(d.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    {d.os && <div>OS: {d.os} {d.browser ? `(${d.browser})` : ''}</div>}
                    {d.ip_address && <div>IP: <span className="font-mono">{d.ip_address}</span></div>}
                    {d.last_seen_at && <div>Last Seen: {new Date(d.last_seen_at).toLocaleString()}</div>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
