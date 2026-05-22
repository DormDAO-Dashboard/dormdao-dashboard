import { DashboardClient } from "@/components/DashboardClient";

export default function HomePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">DormDAO Portfolio Dashboard</h1>
        <p className="text-gray-400 mt-1">Real-time crypto portfolio tracking for 17 university investment DAOs</p>
      </div>
      <DashboardClient />
    </div>
  );
}
