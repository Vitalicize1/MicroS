"use client";
import { useEffect, useState } from 'react';
import { logout } from '@/api/client';
import { useRouter } from 'next/navigation';

export default function AuthNav() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    const has = !!(typeof window !== 'undefined' && localStorage.getItem('token'));
    setAuthed(has);
    const handler = () => setAuthed(!!localStorage.getItem('token'));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!authed) {
    return (
      <>
        <a href="/login" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Login</a>
        <a href="/register" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Register</a>
      </>
    );
  }

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        logout();
        router.push('/login');
      }}
      className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
      title="Logout"
    >
      Logout
    </a>
  );
}


