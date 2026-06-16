import Link from 'next/link';

const NAV = [
  ['Dashboard', '/dashboard'],
  ['Templates', '/templates'],
  ['Settings', '/settings'],
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="font-bold">
            easy-cms
          </Link>
          <nav className="flex gap-4 text-sm">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} className="text-gray-600 hover:text-gray-900">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
