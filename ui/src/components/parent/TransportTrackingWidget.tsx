import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bus, MapPin, Clock, Phone, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BusLocation {
  latitude: number;
  longitude: number;
  lastUpdated: string;
}

interface TransportInfo {
  busNumber: string;
  driverName: string;
  driverPhone: string;
  routeName: string;
  currentStop: string;
  nextStop: string;
  estimatedArrival: string;
  status: "on-time" | "delayed" | "arrived" | "not-started";
  location: BusLocation;
  totalStops: number;
  completedStops: number;
}

interface TransportTrackingWidgetProps {
  childId: string;
}

export function TransportTrackingWidget({ childId }: TransportTrackingWidgetProps) {
  const [tracking, setTracking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Mock transport data
  const [transportInfo] = useState<TransportInfo>({
    busNumber: "SCH-BUS-042",
    driverName: "Rajesh Kumar",
    driverPhone: "+91 98765 43210",
    routeName: "Route 4 - Sector 15",
    currentStop: "Nehru Park",
    nextStop: "Gandhi Chowk",
    estimatedArrival: "15 mins",
    status: "on-time",
    location: {
      latitude: 28.5355,
      longitude: 77.3910,
      lastUpdated: new Date().toISOString()
    },
    totalStops: 12,
    completedStops: 8
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status: TransportInfo['status']) => {
    switch (status) {
      case 'on-time': return 'default';
      case 'delayed': return 'destructive';
      case 'arrived': return 'secondary';
      default: return 'outline';
    }
  };

  const progressPercentage = (transportInfo.completedStops / transportInfo.totalStops) * 100;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5 text-primary" />
            Live Bus Tracking
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bus Info */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <div>
            <div className="font-semibold">{transportInfo.busNumber}</div>
            <div className="text-sm text-muted-foreground">{transportInfo.routeName}</div>
          </div>
          <Badge variant={getStatusColor(transportInfo.status)}>
            {transportInfo.status.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Route Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Route Progress</span>
            <span className="font-medium">
              {transportInfo.completedStops} of {transportInfo.totalStops} stops
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Current Location */}
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <MapPin className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Current Location</div>
              <div className="text-sm text-muted-foreground">{transportInfo.currentStop}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Next Stop</div>
              <div className="text-sm text-muted-foreground">{transportInfo.nextStop}</div>
            </div>
          </div>
        </div>

        {/* ETA */}
        <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Estimated Arrival</span>
          </div>
          <span className="text-lg font-bold text-primary">{transportInfo.estimatedArrival}</span>
        </div>

        {/* Driver Contact */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm font-medium">Driver: {transportInfo.driverName}</div>
            <div className="text-xs text-muted-foreground">Emergency Contact</div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${transportInfo.driverPhone}`}>
              <Phone className="h-4 w-4 mr-2" />
              Call
            </a>
          </Button>
        </div>

        {/* Last Updated */}
        <div className="text-center text-xs text-muted-foreground">
          Last updated: {new Date(transportInfo.location.lastUpdated).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
