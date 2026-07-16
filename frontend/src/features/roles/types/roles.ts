export interface Permission {
  id: string;
  module: string;
  action: string;
  code: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_default: boolean;
  branch_scope: string;
  data_scope: string;
  permissions: string[]; // List of permission codes
}

export interface RoleCreateUpdate {
  name: string;
  description: string | null;
  branch_scope?: string;
  data_scope?: string;
  permissions: string[];
}
