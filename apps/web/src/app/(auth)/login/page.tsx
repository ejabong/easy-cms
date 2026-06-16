'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await signIn.email({ email, password });
    if (error) setError(error.message ?? 'Login failed');
    else router.push('/dashboard');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-md bg-primary py-2 font-medium text-white">Log in</button>
      </form>
      <div className="mt-4 flex justify-center gap-3 text-sm">
        <button onClick={() => signIn.social({ provider: 'google' })} className="underline">
          Google
        </button>
        <button onClick={() => signIn.social({ provider: 'github' })} className="underline">
          GitHub
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">
        No account?{' '}
        <Link href="/signup" className="text-primary">
          Sign up
        </Link>
      </p>
    </div>
  );
}
