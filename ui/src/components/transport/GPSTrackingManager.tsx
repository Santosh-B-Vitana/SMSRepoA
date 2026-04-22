
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MapPin, Navigation, Truck, Clock, AlertCircle, CheckCircle, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GPSProvider {
  id: string;
  name: string;
  type: 'trackimo' | 'gpsgate' | 'fleetx' | 'mappls' | 'custom';
  status: 'connected' | 'disconnected';
  features: string[];
}

interface BusLocation {
  busId: string;
  busNumber: string;
  latitude: number;
  longitude: number;
  speed: number;
  lastUpdate: string;
  status: 'running' | 'stopped' | 'maintenance';
}

export function GPSTrackingManager() {
  const [providers] = useState<GPSProvider[]>([
    {
      id: "1",
      name: "TrackiMo GPS",
      type: "trackimo",
      status: "disconnected",
      features: ["Real-time Tracking", "Geofencing", "Route Optimization", "Driver Behavior"]
    },
    {
      id: "2",
      name: "GpsGate",
      type: "gpsgate", 
      status: "disconnected",
      features: ["Fleet Management", "Live Tracking", "Reports", "Alerts"]
    },
    {
      id: "3",
      name: "FleetX",
      type: "fleetx",
      status: "disconnected", 
      features: ["Vehicle Tracking", "Fuel Monitoring", "Driver Management", "Analytics"]
    },
    {
      id: "4",
      name: "MapmyIndia (Mappls)",
      type: "mappls",
      status: "disconnected",
      features: ["Indian Maps", "Traffic Updates", "Route Planning", "POI Database"]
    }
  ]);

  const [mockBusLocations] = useState<BusLocation[]>([
    {
      busId: "1",
      busNumber: "SCH-001",
      latitude: 28.6139,
      longitude: 77.2090,
      speed: 35,
      lastUpdate: "2 minutes ago",
      status: "running"
    },
    {
      busId: "2", 
      busNumber: "SCH-002",
      latitude: 28.7041,
      longitude: 77.1025,
      speed: 0,
      lastUpdate: "5 minutes ago", 
      status: "stopped"
    }
  ]);

  const { toast } = useToast();

  const handleProviderToggle = (providerId: string, connected: boolean) => {
    toast({
      title: "GPS Provider Status",
      description: `Provider ${connected ? 'connected' : 'disconnected'} successfully`,
    });
  };

  const handleTestConnection = (provider: GPSProvider) => {
    toast({
      title: "Testing Connection",
      description: `Testing ${provider.name} integration...`,
    });
  };

  const getProviderIcon = (type: GPSProvider['type']) => {
    switch (type) {
      case 'trackimo':
        return <Navigation className="h-5 w-5" />;
      case 'gpsgate':
        return <MapPin className="h-5 w-5" />;
      case 'fleetx':
        return <Truck className="h-5 w-5" />;
      case 'mappls':
        return <Navigation className="h-5 w-5" />;
      default:
        return <Wifi className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">GPS Tracking Management</h2>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Backend Integration Required
        </Badge>
      </div>

      {/* GPS Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <Card key={provider.id} className={`border-2 ${provider.status === 'connected' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getProviderIcon(provider.type)}
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                </div>
                <Badge variant={provider.status === 'connected' ? 'default' : 'secondary'}>
                  {provider.status === 'connected' ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                  {provider.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium">Features:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {provider.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor={`gps-toggle-${provider.id}`}>Enable Provider</Label>
                <Switch 
                  id={`gps-toggle-${provider.id}`}
                  checked={provider.status === 'connected'}
                  onCheckedChange={(checked) => handleProviderToggle(provider.id, checked)}
                />
              </div>

              <div className="space-y-2">
                <Input placeholder="API Key" type="password" disabled />
                <Input placeholder="Device IDs (comma separated)" disabled />
              </div>

              <Button 
                onClick={() => handleTestConnection(provider)}
                variant="outline" 
                className="w-full"
                disabled={provider.status !== 'connected'}
              >
                Test Connection
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Bus Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Live Bus Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockBusLocations.map((bus) => (
              <Card key={bus.busId} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{bus.busNumber}</span>
                    <Badge variant={
                      bus.status === 'running' ? 'default' :
                      bus.status === 'stopped' ? 'secondary' : 'destructive'
                    }>
                      {bus.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Speed:</span>
                      <span>{bus.speed} km/h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Update:</span>
                      <span>{bus.lastUpdate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Location:</span>
                      <span className="text-xs">{bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <MapPin className="h-3 w-3 mr-1" />
                    View on Map
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
