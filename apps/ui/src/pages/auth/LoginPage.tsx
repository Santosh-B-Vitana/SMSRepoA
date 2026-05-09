import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      toast.success('Signed in successfully');
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid username or password';
      setError(msg);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f1c5e 0%, #1a237e 60%, #283593 100%)' }}
    >
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center pt-10 pb-8 px-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}
          >
            <School size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vitana SMS</h1>
          <p className="text-sm text-gray-400 mt-1">School Management System</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-8" />

        {/* Form */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Username
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-[#1a237e] focus:ring-2 focus:ring-[#1a237e]/10 outline-none transition"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-[#1a237e] focus:ring-2 focus:ring-[#1a237e]/10 outline-none transition"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span>⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-70 mt-2"
              style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
