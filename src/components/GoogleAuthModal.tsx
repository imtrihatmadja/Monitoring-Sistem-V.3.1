import React, { useState } from 'react';
import { Staff, UserRoleType } from '../types';
import { AUTHORIZED_ADMIN_EMAILS } from '../lib/rbac';
import { LogIn, ShieldAlert, CheckCircle2, X, User, Lock, Mail, Key } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  staffList: Staff[];
  activeStaff: Staff;
  onClose: () => void;
  onGoogleLoginSuccess: (matchedStaff: Staff) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  staffList,
  activeStaff,
  onClose,
  onGoogleLoginSuccess,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<string>(activeStaff.email || 'imam.trihatmadja@dfw.or.id');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleProcessGoogleAuth = (emailToAuth: string) => {
    setAuthError('');
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      const cleanEmail = emailToAuth.trim().toLowerCase();

      if (!cleanEmail) {
        setAuthError('Silakan masukkan email Google yang valid.');
        return;
      }

      // Find staff by registered email or create dynamic staff session
      const foundStaff = staffList.find(
        (s) => s.email && s.email.trim().toLowerCase() === cleanEmail
      );

      const isFullAdmin = AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail);

      let targetStaff: Staff;
      if (foundStaff) {
        targetStaff = {
          ...foundStaff,
          systemRole: isFullAdmin ? 'super_admin' : 'donor_viewer',
          lastLoginAt: new Date().toISOString(),
          googleAvatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
        };
      } else {
        // Logged in user with other email -> View Only
        targetStaff = {
          id: `usr-${Date.now()}`,
          name: cleanEmail.split('@')[0],
          role: isFullAdmin ? 'Program Director / Admin' : 'Pengguna Eksternal (Viewer)',
          systemRole: isFullAdmin ? 'super_admin' : 'donor_viewer',
          status: 'active',
          email: cleanEmail,
          lastLoginAt: new Date().toISOString(),
          googleAvatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
        };
      }

      onGoogleLoginSuccess(targetStaff);
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Google Auth Header */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white p-2 shadow-md flex items-center justify-center shrink-0">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Google Identity Sign-In</h2>
              <p className="text-xs text-slate-400">Verifikasi email &amp; hak akses terpusat DFW</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-xs text-purple-900 space-y-1">
            <p className="font-extrabold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-600" /> Aturan Login System DFW:
            </p>
            <p className="text-[11px] text-purple-800 leading-relaxed">
              Login dengan <strong>admin@dfw.or.id</strong> atau <strong>imam.trihatmadja@dfw.or.id</strong> memberikan wewenang Full Access (Edit/Manage). Email lainnya beroperasi dalam mode View Only.
            </p>
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 flex items-start gap-2.5 animate-in shake duration-150">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold text-rose-900">Perhatian Autentikasi</p>
                <p className="text-[11px] leading-relaxed text-rose-700">{authError}</p>
              </div>
            </div>
          )}

          {/* Quick Select Registered Google Emails */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 block">
              Pilih Akun Email Google:
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {staffList.map((st) => {
                const isSelected = !useCustom && selectedEmail === st.email;
                const isFullAdmin = AUTHORIZED_ADMIN_EMAILS.includes((st.email || '').toLowerCase());

                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      setUseCustom(false);
                      setSelectedEmail(st.email || '');
                      setAuthError('');
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-purple-50/90 border-purple-500 shadow-xs ring-1 ring-purple-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                        {st.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 truncate">{st.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{st.email}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${
                      isFullAdmin 
                        ? 'bg-purple-100 text-purple-800 border-purple-300' 
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {isFullAdmin ? 'FULL ACCESS' : 'VIEW ONLY'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Or custom email input */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => {
                setUseCustom(!useCustom);
                setAuthError('');
              }}
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              {useCustom ? '← Gunakan pilihan email di atas' : '+ Masukkan Email Google Lain'}
            </button>

            {useCustom && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="misal: admin@dfw.or.id"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="button"
              disabled={isAuthenticating}
              onClick={() => handleProcessGoogleAuth(useCustom ? customEmail : selectedEmail)}
              className="w-full bg-slate-900 hover:bg-black text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-98 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Email Google...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Login dengan Google Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
