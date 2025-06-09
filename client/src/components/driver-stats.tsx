import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QueueStats } from "@shared/schema";

interface DriverStatsProps {
  stats?: QueueStats;
}

export default function DriverStats({ stats }: DriverStatsProps) {
  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Drivers</span>
            <span className="font-semibold text-gray-900">{stats.totalDrivers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Active</span>
            <span className="font-semibold text-emerald-600">{stats.activeDrivers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Busy</span>
            <span className="font-semibold text-amber-600">{stats.busyDrivers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Deliveries Today</span>
            <span className="font-semibold text-gray-900">{stats.deliveriesToday}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
