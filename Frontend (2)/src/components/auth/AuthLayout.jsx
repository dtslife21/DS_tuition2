const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 -z-10 opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 800 600" fill="none">
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0" stopColor="#6366F1" stopOpacity="0.22" />
              <stop offset="1" stopColor="#10B981" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="g2" x1="0" x2="1">
              <stop offset="0" stopColor="#06B6D4" stopOpacity="0.12" />
              <stop offset="1" stopColor="#8B5CF6" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#g1)" rx="0" />
          <g transform="translate(-100, -80)">
            <ellipse cx="420" cy="220" rx="420" ry="160" fill="url(#g2)" />
            <ellipse cx="100" cy="480" rx="220" ry="120" fill="#EEF2FF" />
          </g>
        </svg>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl soft-shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Left branding / illustration */}
          <div className="hidden md:flex flex-col justify-center gap-6 px-10 py-12 bg-gradient-to-br from-indigo-600 to-emerald-400 text-white">
            <div>
              <h1 className="text-3xl font-extrabold">Class Manager</h1>
              <p className="mt-2 text-sm opacity-90">Teach, track, and grow — a modern platform for tuition center management.</p>
            </div>

            {/* Simple educational illustration (books + chalk) */}
            <div className="mt-6">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="10" y="30" width="90" height="70" rx="6" fill="rgba(255,255,255,0.14)" />
                <rect x="120" y="30" width="90" height="70" rx="6" fill="rgba(255,255,255,0.12)" />
                <rect x="20" y="40" width="70" height="8" rx="3" fill="rgba(255,255,255,0.6)" />
                <rect x="20" y="56" width="50" height="6" rx="3" fill="rgba(255,255,255,0.45)" />
                <rect x="130" y="40" width="75" height="8" rx="3" fill="rgba(255,255,255,0.6)" />
                <rect x="130" y="56" width="55" height="6" rx="3" fill="rgba(255,255,255,0.45)" />
                <path d="M40 108c10-8 30-10 50 0" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Right: form container (glass card) */}
          <div className="bg-white dark:bg-gray-800 p-8 md:p-12 glass-surface">
            <div className="max-w-md mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
