export default function RSVPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-contain md:static md:inset-auto md:overflow-visible md:overscroll-auto">
      {children}
    </div>
  );
}
