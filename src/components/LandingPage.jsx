import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

function AuthForm({ mode, onModeChange }) {
  const isSignup = mode === 'signup';
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', credential.user.uid), {
          alias: alias.trim() || email.split('@')[0],
          email: credential.user.email,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return <form className="auth-form" onSubmit={submit}>
    <div className="auth-form-heading">
      <span className="auth-kicker">{isSignup ? 'INITIALIZE_OPERATOR' : 'AUTHENTICATE_OPERATOR'}</span>
      <h2>{isSignup ? 'Create your workspace' : 'Welcome back'}</h2>
    </div>
    {isSignup && <label>Alias<input value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="operator_alias" autoComplete="nickname" /></label>}
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@example.com" autoComplete="email" required /></label>
    <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength="6" required /></label>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="auth-submit-btn" type="submit" disabled={submitting}>{submitting ? 'PROCESSING...' : isSignup ? 'CREATE ACCOUNT' : 'ENTER WORKSPACE'}</button>
    <button className="auth-switch-btn" type="button" onClick={() => { setError(''); onModeChange(isSignup ? 'login' : 'signup'); }}>
      {isSignup ? 'Already have an account? Log in' : 'Need an account? Sign up'}
    </button>
  </form>;
}

export function LoginForm({ onSignup }) {
  return <AuthForm mode="login" onModeChange={(nextMode) => nextMode === 'signup' && onSignup()} />;
}

export function SignupForm({ onLogin }) {
  return <AuthForm mode="signup" onModeChange={(nextMode) => nextMode === 'login' && onLogin()} />;
}

function formatAuthError(error) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for this email.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Use a stronger password with at least 6 characters.'
  };
  return messages[error.code] || 'Authentication failed. Please try again.';
}

export default function LandingPage() {
  const [mode, setMode] = useState('login');

  return <main className="landing-page">
    <section className="landing-copy">
      <span className="landing-kicker">1WHOLE // SECURE STUDY OPERATING SYSTEM</span>
      <h1>Build a sharper mind for complex systems.</h1>
      <p>One focused workspace for security study paths, operational notes, and deliberate practice.</p>
      <div className="landing-status"><span className="status-dot" /> FIREBASE AUTHENTICATION ONLINE</div>
    </section>
    <section className="auth-panel" aria-label="Account access">
      <div className="auth-panel-brand">1W<span>/</span></div>
      {mode === 'login'
        ? <LoginForm onSignup={() => setMode('signup')} />
        : <SignupForm onLogin={() => setMode('login')} />}
    </section>
  </main>;
}
