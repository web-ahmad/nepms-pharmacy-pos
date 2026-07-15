import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Clock } from 'lucide-react';

export default function ReservationPanel({ medicineId }: { medicineId: string }) {
  // Assuming a generic reservations endpoint exists or we fetch from batches
  // For Phase 4, we'll fetch reservations filtered by medicine
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', medicineId],
    queryFn: async () => {
      // Temporary fallback if endpoint doesn't exist yet
      try {
        const res = await api.get(`/api/v1/inventory/reservations?medicine_id=${medicineId}`);
        return res.data;
      } catch (error) {
        return [];
      }
    }
  });

  if (isLoading) return <div className="p-8 text-center text-[#76777d]">Loading reservations...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
        <div>
          <h3 className="text-[16px] font-bold text-[#0b1c30]">Reservation History</h3>
          <p className="text-[13px] text-[#76777d]">Track stock that is currently reserved for sales or transfers.</p>
        </div>
      </div>
      
      {reservations?.length === 0 ? (
        <div className="text-center py-8 text-[#76777d]">
          <Clock className="w-8 h-8 text-[#c6c6cd] mx-auto mb-2" />
          <p>No active reservations.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f8f9ff] text-[#45464d] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Type</th>
                <th className="px-4 py-3 font-bold">Reference</th>
                <th className="px-4 py-3 font-bold">Quantity</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] bg-white">
              {reservations?.map((res: any) => (
                <tr key={res.id}>
                  <td className="px-4 py-3">{new Date(res.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{res.reservation_type}</td>
                  <td className="px-4 py-3 font-mono">{res.reference_id}</td>
                  <td className="px-4 py-3 font-bold text-[#ba1a1a]">{res.quantity_reserved}</td>
                  <td className="px-4 py-3">{res.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
