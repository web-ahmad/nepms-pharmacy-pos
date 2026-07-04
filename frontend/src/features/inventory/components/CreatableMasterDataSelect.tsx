import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMasterData, useCreateMasterData } from '../services/masterData.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.detail || e.message || "Failed to add new item.";
      toast.error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <Select onValueChange={(val) => onChange(val || '')} value={value || ""}>
        <SelectTrigger className={`flex-1 ${error ? 'border-red-500' : ''}`}>
          <SelectValue placeholder={placeholder || "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.name}>
              {opt.name}
            </SelectItem>
          ))}
          {options.length === 0 && !isLoading && (
            <div className="p-2 text-sm text-zinc-500 text-center">No options available</div>
          )}
        </SelectContent>
      </Select>
      
      <Button 
        type="button" 
        variant="outline" 
        size="icon" 
        onClick={() => setIsDialogOpen(true)}
        className="shrink-0 h-9 w-9"
        title={`Add new ${masterType.replace(/s$/, '').replace(/_/g, ' ')}`}
      >
        <Plus className="w-4 h-4" />
      </Button>

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
