import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMasterData, useCreateMasterData } from '../services/masterData.api';
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
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newValue.trim(), status: 'Active' });
      toast.success(`${newValue.trim()} added successfully.`);
      onChange(newValue.trim());
      setIsDialogOpen(false);
      setNewValue('');
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <select 
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 min-w-0 border border-outline-variant rounded-custom h-10 px-3 py-2 bg-white ${error ? 'border-red-500' : ''}`}
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
        className="shrink-0 h-10 w-10 flex items-center justify-center bg-emerald text-white rounded-custom hover:bg-emerald-deep transition-all"
        title={`Add new ${masterType.replace(/s$/, '').replace(/_/g, ' ')}`}
      >
        <Plus className="w-5 h-5" />
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add New {masterType.charAt(0).toUpperCase() + masterType.slice(1).replace(/s$/, '').replace(/_/g, ' ')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Enter name..." 
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleAdd} disabled={createMutation.isPending || !newValue.trim()}>
              {createMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
