import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../features/auth/services/auth-api';
import { useAuthStore } from '../features/auth/stores/auth-store';
import { OtpInput } from '../features/auth/components/OtpInput';
import { Button } from '../components/common/Button';
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  Loader2,
  ArrowRight,
  Send,
  ShieldCheck,
} from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>(
    token ? 'loading' : 'idle',
  );
  const [message, setMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState(user?.email || emailParam || '');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      return;
    }

    let isMounted = true;
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (!isMounted) return;
        setStatus('success');
        setMessage(res.message || 'Email verified successfully.');
        if (user) {
          setUser({ ...user, isEmailVerified: true });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(
          err instanceof Error
            ? err.message
            : 'Invalid or expired verification link. Please request a new one.',
        );
      });

    return () => {
      isMounted = false;
    };
  }, [token, user, setUser]);

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    const emailToUse = resendEmail.trim();
    if (!emailToUse) {
      setOtpError('Please enter your email address below first.');
      return;
    }
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await authApi.verifyEmail({
        email: emailToUse,
        otp: code,
      });
      setStatus('success');
      setMessage(res.message || 'Email verified successfully.');
      if (user) {
        setUser({ ...user, isEmailVerified: true });
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    try {
      const res = await authApi.resendVerification(resendEmail.trim());
      setResendSent(true);
      setMessage(res.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send verification link.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-4rem)] items-center justify-center p-6 sm:p-12 animate-fade-in bg-surface">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <div className="py-8 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-text">Verifying Your Email</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Please wait while we confirm your cryptographic verification token...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-text">
                Email Verified!
              </h2>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">
                Your email address has been verified. Your reading sanctuary account is now fully
                authenticated.
              </p>
            </div>
            <Link to="/" className="block">
              <Button variant="primary" className="w-full py-3 text-sm font-semibold">
                <span>Enter Library</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}

        {(status === 'error' || status === 'idle') && (
          <div className="space-y-6">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                status === 'error'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {status === 'error' ? (
                <AlertCircle className="h-7 w-7" />
              ) : (
                <Mail className="h-7 w-7" />
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-text">
                {status === 'error' ? 'Verification Link Expired' : 'Verify Your Email'}
              </h2>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">
                {status === 'error'
                  ? message ||
                    'This verification token is no longer valid. Enter your code below or request a new one.'
                  : 'Enter the 6-digit verification code sent to your email, or request a new link.'}
              </p>
            </div>

            {resendSent && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs sm:text-sm text-left flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Verification link sent!</p>
                  <p className="mt-1 text-text-muted">
                    If an unverified account matches that address, check your inbox for the 6-digit
                    code or link.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 text-left">
              <div>
                <label
                  htmlFor="verify-email-input"
                  className="block text-xs font-semibold text-text mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-4 w-4 text-text-muted" />
                  </div>
                  <input
                    id="verify-email-input"
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="reader@example.com"
                    className="block w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 pb-1">
                <label className="block text-xs font-semibold text-text mb-2 text-center">
                  6-Digit Verification Code
                </label>
                <OtpInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (otpError) setOtpError(null);
                  }}
                  onComplete={(val) => handleVerifyOtp(val)}
                  disabled={isVerifyingOtp}
                />
                {otpError && (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 text-center font-medium">
                    {otpError}
                  </p>
                )}
                <Button
                  type="button"
                  variant="primary"
                  className="w-full mt-4 py-2.5 text-sm font-semibold"
                  disabled={isVerifyingOtp || otp.length !== 6 || !resendEmail.trim()}
                  onClick={() => handleVerifyOtp()}
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      <span>Verify Code</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-text-muted text-center mb-2.5">
                  Didn&apos;t receive the email or code?
                </p>
                <form onSubmit={handleResend}>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full py-2 text-xs font-medium"
                    disabled={isResending || !resendEmail.trim()}
                  >
                    <Send className="w-3.5 h-3.5 mr-2" />
                    <span>{isResending ? 'Sending...' : 'Send Verification Email'}</span>
                  </Button>
                </form>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    useAuthStore.getState().clear();
                    navigate('/login');
                  }}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  Sign out / Switch account
                </button>
              ) : (
                <Link to="/login" className="hover:text-primary transition-colors">
                  Back to Sign in
                </Link>
              )}
              <Link to="/" className="hover:text-primary transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
