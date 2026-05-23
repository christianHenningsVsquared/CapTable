import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { CompanyView } from "@/pages/company";
import { EmptyState } from "@/pages/empty";

export default function App() {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      {/* Floating gradient orbs in the background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-3xl animate-float" />
        <div
          className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-fuchsia-600/15 blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute -bottom-32 left-1/3 h-[24rem] w-[24rem] rounded-full bg-blue-600/10 blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<EmptyState />} />
          <Route path="/funds/:fundId" element={<EmptyState />} />
          <Route path="/funds/:fundId/companies/:companyId" element={<CompanyView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
