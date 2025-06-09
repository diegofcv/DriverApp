import { useQuery } from "@tanstack/react-query";
import { Bike, Clock, Activity } from "lucide-react";
import DriverRegistration from "@/components/driver-registration";
import QueueManagement from "@/components/queue-management";
import DriverStats from "@/components/driver-stats";
import type { Driver, QueueStats } from "@shared/schema";

export default function Dashboard() {
  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<QueueStats>({
    queryKey: ["/api/stats"],
  });

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (driversLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 text-emerald-600 animate-spin" />
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bike className="text-emerald-600 h-6 w-6 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Driver Queue Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{getCurrentTime()}</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <DriverRegistration />
            <DriverStats stats={stats} />
          </div>

          {/* Main Queue Area */}
          <div className="lg:col-span-3">
            <QueueManagement drivers={drivers} />
          </div>
        </div>
      </div>
    </div>
  );
}
