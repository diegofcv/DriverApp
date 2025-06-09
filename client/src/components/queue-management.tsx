import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Driver } from "@shared/schema";

interface QueueManagementProps {
  drivers: Driver[];
}

export default function QueueManagement({ drivers }: QueueManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queue = [] } = useQuery<Driver[]>({
    queryKey: ["/api/queue"],
  });

  const activeDrivers = drivers.filter(d => d.status === "active");
  const busyDrivers = drivers.filter(d => d.status === "busy");
  const inactiveDrivers = drivers.filter(d => d.status === "inactive");
  const nextDriver = queue.find(d => d.position === 1);

  const callNextDriverMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/queue/call-next");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      if (data.simulated) {
        toast({
          title: "Demo Mode",
          description: `WhatsApp message would be sent to ${data.driver.name}. Driver moved to busy status.`,
        });
      } else {
        toast({
          title: "Driver Called",
          description: `WhatsApp message sent to ${data.driver.name}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to call driver",
        variant: "destructive",
      });
    },
  });

  const returnDriverMutation = useMutation({
    mutationFn: async (driverId: number) => {
      const response = await apiRequest("POST", `/api/drivers/${driverId}/return`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Driver Returned",
        description: `${data.name} returned and added to end of queue`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to return driver",
        variant: "destructive",
      });
    },
  });

  const activateDriverMutation = useMutation({
    mutationFn: async (driverId: number) => {
      const response = await apiRequest("PATCH", `/api/drivers/${driverId}/status`, {
        status: "active",
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Driver Activated",
        description: `${data.name} activated and added to queue`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate driver",
        variant: "destructive",
      });
    },
  });

  const getActiveTime = (driver: Driver) => {
    if (!driver.activeTime) return "0m";
    const diff = Date.now() - new Date(driver.activeTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Queue Header with Call Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Active Delivery Queue</h2>
              <p className="text-sm text-gray-600">
                {activeDrivers.length} drivers active
                {nextDriver && (
                  <>
                    {" • Next: "}
                    <span className="font-medium text-emerald-600">{nextDriver.name}</span>
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={() => callNextDriverMutation.mutate()}
              disabled={!nextDriver || callNextDriverMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-lg font-semibold"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              {callNextDriverMutation.isPending ? "Calling..." : "Call Next Driver"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Order</CardTitle>
          <p className="text-sm text-gray-600">Click on driver names to mark them as available after delivery</p>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-12 w-12 mb-4" />
              <p>No active drivers in queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((driver) => (
                <div
                  key={driver.id}
                  className={`rounded-lg p-4 ${
                    driver.position === 1
                      ? "bg-emerald-50 border-2 border-emerald-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm text-white ${
                          driver.position === 1 ? "bg-emerald-600" : "bg-gray-400"
                        }`}
                      >
                        {driver.position}
                      </div>
                      <div>
                        <button
                          className="text-lg font-medium text-gray-900 hover:text-emerald-600 transition-colors text-left"
                          onClick={() => returnDriverMutation.mutate(driver.id)}
                          disabled={returnDriverMutation.isPending}
                        >
                          {driver.name}
                        </button>
                        <p className="text-sm text-gray-600">{driver.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={driver.position === 1 ? "default" : "secondary"}
                        className={
                          driver.position === 1
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        <div className="w-2 h-2 rounded-full bg-current mr-1" />
                        {driver.position === 1 ? "Next Up" : "Active"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Active {getActiveTime(driver)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Busy Drivers */}
      {busyDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Busy Drivers</CardTitle>
            <p className="text-sm text-gray-600">Currently out on deliveries</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {busyDrivers.map((driver) => (
                <div key={driver.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                        <Bike className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{driver.name}</h4>
                        <p className="text-sm text-gray-600">{driver.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-amber-100 text-amber-800">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-1" />
                        On Delivery
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Out {getActiveTime(driver)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Drivers Management */}
      {inactiveDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Drivers</CardTitle>
              <Button variant="outline" size="sm">
                Manage All
              </Button>
            </div>
            <p className="text-sm text-gray-600">Click "Activate" to add drivers to the queue</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveDrivers.map((driver) => (
                <div key={driver.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{driver.name}</h4>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
                      Inactive
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{driver.phone}</p>
                  <Button
                    onClick={() => activateDriverMutation.mutate(driver.id)}
                    disabled={activateDriverMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    size="sm"
                  >
                    {activateDriverMutation.isPending ? "Activating..." : "Activate Driver"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
