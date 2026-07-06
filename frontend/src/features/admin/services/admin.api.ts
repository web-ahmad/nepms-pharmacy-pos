import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role_id?: string;
  role?: Role;
  is_active: boolean;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/users');
      return res.data as User[];
    }
  });
};

export const useRoles = () => {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/roles');
      return res.data as Role[];
    }
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/permissions');
      return res.data;
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/v1/admin/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<User> & { password?: string } }) => {
      const res = await api.put(`/api/v1/admin/users/${userId}`, data);
      return res.data as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });
};

