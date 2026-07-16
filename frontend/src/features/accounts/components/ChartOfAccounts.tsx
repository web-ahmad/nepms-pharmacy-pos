"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChartAccounts, useDeleteAccount } from '../services/accounts.api';
import { Account, AccountCategory } from '../types/accounts';
import { 
  ChevronRight, ChevronDown, FolderOpen, 
  FileText, Landmark, Wallet, TrendingUp, Activity, Search,
  Plus, Edit, Trash2, ExternalLink
} from 'lucide-react';
import { AccountModal } from './AccountModal';
import { toast } from 'sonner';
import Link from 'next/link';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

const getCategoryIcon = (category: string) => {
  const cat = category.toUpperCase();
  if (cat === 'ASSET') return <Landmark className="h-4 w-4 text-blue-500" />;
  if (cat === 'LIABILITY') return <Wallet className="h-4 w-4 text-orange-500" />;
  if (cat === 'EQUITY') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (cat === 'REVENUE') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (cat === 'EXPENSE') return <Activity className="h-4 w-4 text-rose-500" />;
  return <FileText className="h-4 w-4 text-gray-500" />;
};

const getCategoryColor = (category: string) => {
  const cat = category.toUpperCase();
  if (cat === 'ASSET') return 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  if (cat === 'LIABILITY') return 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-800';
  if (cat === 'EQUITY') return 'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-800';
  if (cat === 'REVENUE') return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  if (cat === 'EXPENSE') return 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-800';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
};

interface TreeNode extends Account {
  children: TreeNode[];
}

function AccountTreeNode({ 
  node, 
  level = 0, 
  onEdit, 
  onDelete 
}: { 
  node: TreeNode; 
  level?: number;
  onEdit: (acc: Account) => void;
  onDelete: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="group relative flex items-center justify-between py-2.5 pr-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        style={{ paddingLeft: `${(level * 24) + 16}px` }}
      >
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${!hasChildren && 'invisible'}`}
          >
            {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
          </button>
          <div className="flex items-center space-x-2">
            {hasChildren ? <FolderOpen className="h-4 w-4 text-amber-500" /> : getCategoryIcon(node.category)}
            <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">{node.code}</span>
            <span className={`text-sm ${level === 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
              {node.name}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
            <button
              onClick={() => onEdit(node)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit Account"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Delete Account"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <Link href={`/accounts/ledger?account_id=${node.id}`}>
              <button
                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                title="View Ledger"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getCategoryColor(node.category)}`}>
            {node.category}
          </span>
          <span className={`w-32 text-right text-sm font-semibold tabular-nums ${node.current_balance < 0 ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(node.current_balance)}
          </span>
        </div>
      </motion.div>
      
      <AnimatePresence initial={false}>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <AccountTreeNode 
                key={child.id} 
                node={child} 
                level={level + 1} 
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChartOfAccounts() {
  const { data: accounts, isLoading } = useChartAccounts();
  const deleteMutation = useDeleteAccount();
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  const tree = useMemo(() => {
    if (!accounts) return [];
    
    // Filter first if searching
    const filtered = searchTerm 
      ? accounts.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.code.includes(searchTerm))
      : accounts;
      
    // Build tree
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    
    filtered.forEach(acc => {
      map.set(acc.id, { ...acc, children: [] });
    });
    
    // Connect children to parents
    filtered.forEach(acc => {
      const node = map.get(acc.id)!;
      // If we're searching, we might have broken the hierarchy, so just show flat if parent is missing
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    
    // Sort by code
    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      nodes.forEach(n => sortTree(n.children));
    };
    sortTree(roots);
    
    return roots;
  }, [accounts, searchTerm]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Account deleted successfully');
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to delete account');
      }
    }
  };

  const handleEdit = (acc: Account) => {
    setAccountToEdit(acc);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setAccountToEdit(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Chart of Accounts</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Hierarchical view of your ledger accounts.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
        >
          <Plus className="h-4 w-4" />
          New Account
        </button>
      </div>
      
      <div className="rounded-2xl border border-gray-200/50 bg-white/70 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 overflow-hidden flex flex-col">
        <div className="border-b border-gray-200/50 bg-gray-50/50 px-6 py-4 dark:border-gray-700/50 dark:bg-gray-800/50 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search accounts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center space-x-12 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <span>Actions</span>
            <span>Category</span>
            <span>Balance</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800/50 pb-6">
          {tree.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No accounts found matching your search.
            </div>
          ) : (
            tree.map(node => (
              <AccountTreeNode 
                key={node.id} 
                node={node} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <AccountModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accountToEdit={accountToEdit}
      />
    </div>
  );
}
