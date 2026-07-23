import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMasterData, useCreateMasterData, useDeleteMasterData } from '../services/masterData.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { parseApiError } from '@/utils/errorParser';

interface CreatableMasterDataSelectProps {
  masterType: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: boolean;
}

export function CreatableMasterDataSelect({
  masterType,
  value,
  onChange,
  placeholder,
  error
}: CreatableMasterDataSelectProps) {
  const { data: options = [], isLoading } = useMasterData(masterType);
  const createMutation = useCreateMasterData(masterType);
  const deleteMutation = useDeleteMasterData(masterType);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const label = masterType.charAt(0).toUpperCase() + masterType.slice(1).replace(/s$/, '').replace(/_/g, ' ');

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newValue.trim(), status: 'Active' });
      toast.success(`${newValue.trim()} added successfully.`);
      onChange(newValue.trim());
      setNewValue('');
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`${name} deleted.`);
      if (value === name) onChange('');
    } catch (err: any) {
      toast.error(parseApiError(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 min-w-0 border rounded-xl h-11 px-4 py-2 bg-white/80 backdrop-blur-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/20 outline-none ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 hover:border-gray-300'}`}
      >
        <option value="" disabled>{placeholder || "Select..."}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.name}>
            {opt.name}
          </option>
        ))}
        {options.length === 0 && !isLoading && (
          <option value="" disabled>No options available</option>
        )}
      </select>

      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        className="shrink-0 h-11 w-11 flex items-center justify-center bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg hover:bg-primary/90 transition-all active:scale-95 duration-200"
        title={`Add new ${masterType.replace(/s$/, '').replace(/_/g, ' ')}`}
      >
        <Plus className="w-5 h-5" />
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Manage {label}s
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add new */}
            <div className="flex items-center gap-2">
              <Input
                className="h-12 px-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                placeholder={`Enter new ${label.toLowerCase()} name...`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <Button
                type="button"
                className="h-12 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 duration-200 shrink-0"
                onClick={handleAdd}
                disabled={createMutation.isPending || !newValue.trim()}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
            </div>

            {/* Existing items list */}
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
              ) : options.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No {label.toLowerCase()}s yet.</div>
              ) : (
                options.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700 truncate">{opt.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(opt.id, opt.name)}
                      disabled={deletingId === opt.id}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      title={`Delete ${opt.name}`}
                    >
                      {deletingId === opt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" className="rounded-xl h-11 px-6 hover:bg-gray-50 border-gray-200 transition-colors" onClick={() => setIsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
