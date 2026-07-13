export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a0a]">
      {children}
    </div>
  );
}
