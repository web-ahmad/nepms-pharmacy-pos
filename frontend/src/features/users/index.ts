// features/users/index.ts
// Public barrel export for the Enterprise Users feature module.

export * from './types/user';
export * from './services/user.api';
export * from './services/role.api';
export * from './store/user-store';

export { UserAvatar }          from './components/UserAvatar';
export { UserStatusBadge }     from './components/UserStatusBadge';
export { UserDashboardStats }  from './components/UserDashboardStats';
export { UserFilters }         from './components/UserFilters';
export { UserTable }           from './components/UserTable';
export { UserCard }            from './components/UserCard';
export { UserCardGrid }        from './components/UserCardGrid';
export { CreateUserWizard }    from './components/CreateUserWizard';
