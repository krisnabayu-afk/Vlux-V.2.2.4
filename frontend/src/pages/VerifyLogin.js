import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const VerifyLogin = () => {
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);
  const { verifyLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasAttempted = useRef(false);

  useEffect(() => {
    const doVerify = async () => {
      if (hasAttempted.current) return;
      hasAttempted.current = true;

      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setError('No verification token provided.');
        setVerifying(false);
        return;
      }

      try {
        await verifyLogin(token);
        toast.success('Login verified successfully!');
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.detail || 'Login link expired or invalid.');
        setVerifying(false);
      }
    };

    doVerify();
  }, [location.search, verifyLogin, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border text-center">
          {verifying ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h1 className="text-2xl font-bold text-primary mb-2">Verifying Login...</h1>
              <p className="text-muted-foreground">Please wait while we verify your secure link. <i>*check spam kalau tidak ada di inbox</i></p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-destructive mb-2">Verification Failed</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyLogin;
