import React, { useEffect, useState } from 'react';

export async function getServerSideProps(context) {
  const pageTitle = "Login | My App"; // could come from DB or API
  return {
    props: { title: pageTitle }, // passed as props to the component
  };
}

export default function Login() {
  const [nonce, setNonce] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '' });
  const [success, setSuccess] = useState(false);

  // Fetch nonce once on mount, but don't block rendering
  useEffect(() => {
    fetch('/api/nonce')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch nonce');
        return res.json();
      })
      .then((data) => setNonce(data.nonce))
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          _wpnonce: nonce,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ margin: '2rem' }}>
        <h1>✅ Login successful!</h1>
        <p>Welcome back, {form.username}.</p>
      </div>
    );
  }

  return (
    <div style={{ margin: '2rem', maxWidth: 400 }}>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Username
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
            />
          </label>
        </div>

        <input type="hidden" name="nonce" value={nonce} />

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#007bff',
            color: 'white',
            padding: '0.6rem 1.2rem',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {error && (
          <div style={{ color: 'red', marginTop: '1rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </form>
    </div>
  );
}

