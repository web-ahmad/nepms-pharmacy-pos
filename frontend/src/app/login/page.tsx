'use client';

import { useState } from 'react';
import { useForm as useRHForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import {
  Loader2, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle,
  ShieldCheck, Activity, Pill, Sparkles, Hand,
  Syringe, Thermometer, HeartPulse, Stethoscope, Cross, Plus, TestTube, Droplet,
} from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const FEATURES = [
  { icon: Pill, title: 'Smart Inventory', desc: 'Batch, expiry & FEFO stock control' },
  { icon: Activity, title: 'Real-time Analytics', desc: 'Live sales, profit & branch insights' },
  { icon: ShieldCheck, title: 'Enterprise Security', desc: 'Role-based access & full audit trail' },
];

// Pharmacy-themed icons that gently drift across the background.
const PHARM_ICONS = [
  { icon: Pill,        left: '8%',  top: '18%', size: 46, dur: '13s', delay: '0s'   },
  { icon: Syringe,     left: '22%', top: '68%', size: 40, dur: '16s', delay: '1.2s' },
  { icon: Cross,       left: '38%', top: '30%', size: 34, dur: '12s', delay: '2s'   },
  { icon: Stethoscope, left: '54%', top: '12%', size: 52, dur: '18s', delay: '0.6s' },
  { icon: HeartPulse,  left: '66%', top: '72%', size: 44, dur: '15s', delay: '2.4s' },
  { icon: Thermometer, left: '78%', top: '24%', size: 38, dur: '14s', delay: '1s'   },
  { icon: Plus,        left: '88%', top: '58%', size: 30, dur: '11s', delay: '0.3s' },
  { icon: TestTube,    left: '46%', top: '82%', size: 40, dur: '17s', delay: '1.8s' },
  { icon: Droplet,     left: '14%', top: '46%', size: 32, dur: '13s', delay: '2.8s' },
  { icon: Pill,        left: '72%', top: '42%', size: 28, dur: '15s', delay: '3.2s' },
  { icon: Cross,       left: '92%', top: '84%', size: 36, dur: '19s', delay: '0.9s' },
  { icon: HeartPulse,  left: '4%',  top: '80%', size: 34, dur: '14s', delay: '2.2s' },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useRHForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await api.post('/api/v1/auth/login', {
        username: data.username,
        password: data.password,
      });

      const { access_token, user, tenant_id, branch_id } = response.data;
      setAuth(access_token, user, tenant_id, branch_id);
      await Promise.resolve();

      if (user?.is_super_admin) router.push('/super-admin');
      else if (user?.role === 'Cashier') router.push('/pos/cashier');
      else router.push('/');
    } catch (error: any) {
      if (error.response?.status === 401) setErrorMsg('Invalid username or password');
      else setErrorMsg('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen w-full lg:grid-cols-2 bg-zinc-50 dark:bg-zinc-950">
      {/* ── Pharmacy-themed drifting background (behind everything) ────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {PHARM_ICONS.map((p, i) => {
          const Icon = p.icon;
          return (
            <Icon
              key={i}
              className="pharm-float absolute text-emerald-500/10 dark:text-emerald-400/[0.06]"
              style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDuration: p.dur, animationDelay: p.delay }}
              strokeWidth={1.5}
            />
          );
        })}
      </div>

      {/* ── Left: Brand panel ─────────────────────────────────────────────── */}
      <div className="relative z-10 hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-green-800 lg:flex lg:flex-col lg:justify-between p-12 text-white">
        {/* Decorative animated glows + grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="login-blob pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lime-300/25 blur-3xl" />
        <div className="login-blob-2 pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl" />

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/25 backdrop-blur-sm">N</div>
          <div className="leading-none">
            <p className="text-xl font-extrabold tracking-tight">NEPMS</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Pharmacy ERP</p>
          </div>
        </motion.div>

        {/* Headline + features */}
        <motion.div
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
          className="relative max-w-md"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20 backdrop-blur-sm">
            <Sparkles className="h-3 w-3" /> Next-Gen Pharmacy Management
          </motion.div>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="text-4xl font-black leading-tight tracking-tight">
            Run your entire pharmacy from one intelligent platform.
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="mt-3 text-emerald-50/90">
            POS, inventory, purchasing, accounting & compliance — unified, real-time, and built for scale.
          </motion.p>

          <div className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs text-emerald-100/80">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="relative text-xs text-emerald-100/70"
        >
          © {new Date().getFullYear()} NEPMS — National Electronic Pharmacy Management System
        </motion.p>
      </div>

      {/* ── Right: Login form ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-xl font-black text-white shadow-lg shadow-emerald-500/30">N</div>
            <div className="leading-none">
              <p className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">NEPMS</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Pharmacy ERP</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="flex flex-wrap items-center gap-x-2 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {['Welcome', 'back'].map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.25 + i * 0.14, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 14 }}
                className="wave-hand inline-flex origin-[70%_80%] text-emerald-500 dark:text-emerald-400"
              >
                <Hand className="h-6 w-6" strokeWidth={2.2} />
              </motion.span>
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }}
              className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400"
            >
              Sign in to continue to your dashboard.
            </motion.p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Username</label>
              <div className="group relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-emerald-600" />
                <input
                  {...register('username')}
                  type="text"
                  autoComplete="username"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-3 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  placeholder="Enter your username"
                />
              </div>
              {errors.username && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.username.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Password</label>
                <a href="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400">Forgot?</a>
              </div>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-emerald-600" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-11 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.password.message}</p>}
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-400"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
              )}
            </motion.button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Secured with enterprise-grade encryption
          </div>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes login-float   { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-16px, 20px) scale(1.08); } }
        @keyframes login-float-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px, -14px) scale(1.06); } }
        .login-blob   { animation: login-float 11s ease-in-out infinite; }
        .login-blob-2 { animation: login-float-2 13s ease-in-out infinite; }

        /* Drifting pharmacy icons */
        @keyframes pharm-float {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-24px) rotate(10deg); }
        }
        .pharm-float { animation-name: pharm-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }

        /* Waving hand */
        @keyframes wave {
          0%,60%,100% { transform: rotate(0deg); }
          10%,30%     { transform: rotate(14deg); }
          20%         { transform: rotate(-8deg); }
          40%         { transform: rotate(-4deg); }
          50%         { transform: rotate(10deg); }
        }
        .wave-hand { animation: wave 2.5s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .login-blob, .login-blob-2, .pharm-float, .wave-hand { animation: none; }
        }
      ` }} />
    </div>
  );
}
