export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Auth protection is handled by middleware.ts for all non-public routes.
  return <>{children}</>;
}
