// features/super-admin/api/useMedia.ts
// TanStack Query hooks for the platform Media Library.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const BASE = '/api/v1/super-admin/media';

export interface MediaAsset {
  id: string;
  filename: string;
  original_filename: string;
  url: string;
  mime_type: string | null;
  size_bytes: number;
  folder: string;
  created_at: string | null;
}

const mediaKeys = { all: ['sa-media'] as const };

export function useMediaAssets() {
  return useQuery({
    queryKey: mediaKeys.all,
    queryFn: async () => (await api.get<MediaAsset[]>(BASE)).data,
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      // Let the browser set the multipart boundary itself — override the
      // instance's default 'application/json' Content-Type by unsetting it.
      const { data } = await api.post<MediaAsset>(`${BASE}/upload`, form, {
        headers: { 'Content-Type': undefined },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`${BASE}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}
