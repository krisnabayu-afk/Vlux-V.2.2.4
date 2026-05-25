import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [is2FA, setIs2FA] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (is2FA && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [is2FA, countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result && result.status === '2fa_required') {
        setIs2FA(true);
        setCountdown(60);
        toast.success('Login link sent to your email.');
      } else {
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await login(email, password);
      setCountdown(60);
      toast.success('Login link resent!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend link');
    } finally {
      setLoading(false);
    }
  };

  if (is2FA) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl p-8 border border-border text-center">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full">
              <Mail className="w-10 h-10 text-blue-600 dark:text-blue-300" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-4">Check your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a secure login link to <strong>{email}</strong>. Please click the link to complete your login. <br />
              <i className="text-xs text-red-500">*tolong cek spam jika tidak ada di inbox</i>
            </p>
            <Button
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              variant="outline"
              className="w-full h-11"
            >
              {loading ? 'Sending...' : countdown > 0 ? `Resend Link in ${countdown}s` : 'Resend Link'}
            </Button>
            <div className="mt-4">
              <button onClick={() => setIs2FA(false)} className="text-sm text-primary hover:underline">
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="Vlux" className="w-full h-full object-contain rounded-xl shadow-sm" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Selamat Datang di Vlux</h1>
            <p className="text-muted-foreground">Sign in to access Vlux</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@varnion.net.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline" tabIndex="-1">
                  Forgot Password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-lg"
              disabled={loading}
              data-testid="login-button"
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn size={18} className="mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold" data-testid="register-link">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

