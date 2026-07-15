import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Box, MapPin } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function WarehouseDistribution({ medicineId }: { medicineId: string }) {
  const { branchId } = useAuthStore();
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches', medicineId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/inventory/medicines/${medicineId}/batches`);
      return res.data;
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-[#76777d]">Loading warehouse data...</div>;
  }

  if (!batches || batches.length === 0) {
    return <div className="p-8 text-center text-[#76777d]">No stock distribution found.</div>;
  }

  // Group by warehouse
  const distribution = batches.reduce((acc: any, batch: any) => {
    const wId = batch.warehouse_id || 'unassigned';
    if (!acc[wId]) {
      acc[wId] = {
        warehouse_id: wId,
        warehouse_name: batch.warehouse?.name || 'Main Pharmacy',
        total_quantity: 0,
        reserved: 0,
        batches: []
      };
    }
    acc[wId].total_quantity += (batch.current_quantity - batch.reserved_quantity);
    acc[wId].reserved += batch.reserved_quantity;
    acc[wId].batches.push(batch);
    return acc;
  }, {});

  const distArray = Object.values(distribution);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
        <div>
          <h3 className="text-[16px] font-bold text-[#0b1c30]">Warehouse Distribution</h3>
          <p className="text-[13px] text-[#76777d]">Current stock levels across all storage locations in this branch.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {distArray.map((dist: any) => (
          <div key={dist.warehouse_id} className="border border-[#e2e8f0] rounded-[8px] p-5 bg-[#f8f9ff]/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#eff4ff] text-[#0058be] rounded-[8px] flex items-center justify-center">
                <Box size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[#0b1c30]">{dist.warehouse_name}</h4>
                <p className="text-[13px] text-[#76777d]">Local Stock</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white border border-[#e2e8f0] rounded-[6px] p-3">
                <p className="text-[12px] font-bold text-[#45464d] uppercase mb-1">Available Qty</p>
                <p className="text-[20px] font-bold text-[#0058be]">{dist.total_quantity}</p>
              </div>
              <div className="bg-white border border-[#e2e8f0] rounded-[6px] p-3">
                <p className="text-[12px] font-bold text-[#45464d] uppercase mb-1">Reserved Qty</p>
                <p className="text-[20px] font-bold text-[#ba1a1a]">{dist.reserved}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[13px] font-bold text-[#0b1c30]">Location Breakdown</h5>
              {dist.batches.map((b: any) => (
                <div key={b.id} className="flex justify-between items-center text-[13px] bg-white p-2 border border-[#e2e8f0] rounded-[4px]">
                  <div className="flex items-center gap-2 text-[#45464d]">
                    <MapPin size={14} className="text-[#0058be]" />
                    <span>Rack {b.rack_id ? 'Assigned' : 'Default'} - Bin {b.bin_id ? 'Assigned' : 'Default'}</span>
                  </div>
                  <span className="font-bold text-[#0b1c30]">{b.current_quantity - b.reserved_quantity} units</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
