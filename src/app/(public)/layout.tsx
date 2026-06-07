// Public-facing pages — no sidebar, no app chrome, no auth required

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
