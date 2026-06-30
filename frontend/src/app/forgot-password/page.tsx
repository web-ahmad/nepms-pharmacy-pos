export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-950 border dark:border-zinc-800 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reset Password
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Please contact your system administrator to reset your password.
        </p>
        <div className="pt-4">
          <a href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            &larr; Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
