
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransportManager } from "../components/transport/TransportManager";
import { GPSTrackingManager } from "../components/transport/GPSTrackingManager";
import { RouteOptimizationManager } from "../components/transport/RouteOptimizationManager";
import { VehicleMaintenanceManager } from "../components/transport/VehicleMaintenanceManager";
import { Truck, MapPin, Route, Wrench } from "lucide-react";

export default function Transport() {
  const [activeTab, setActiveTab] = useState("routes");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transport Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage routes, vehicles, GPS tracking, maintenance and route optimization.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Routes & Vehicles</span>
            <span className="sm:hidden">Routes</span>
          </TabsTrigger>
          <TabsTrigger value="gps" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">GPS Tracking</span>
            <span className="sm:hidden">GPS</span>
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Route Optimization</span>
            <span className="sm:hidden">Optimize</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Maintenance</span>
            <span className="sm:hidden">Maint.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="mt-6">
          <TransportManager />
        </TabsContent>

        <TabsContent value="gps" className="mt-6">
          <GPSTrackingManager />
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <RouteOptimizationManager />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <VehicleMaintenanceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
