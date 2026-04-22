import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Route, TrendingUp, MapPin } from "lucide-react";

interface RouteStop {
  stopName: string;
  students: number;
  estimatedTime: string;
}

interface OptimizedRoute {
  routeId: string;
  routeName: string;
  currentDistance: number;
  optimizedDistance: number;
  savings: string;
  stops: RouteStop[];
}

export function RouteOptimizationManager() {
  const [routes, setRoutes] = useState<OptimizedRoute[]>([
    {
      routeId: "ROUTE001",
      routeName: "North Route",
      currentDistance: 25.5,
      optimizedDistance: 22.3,
      savings: "12.5%",
      stops: [
        { stopName: "Sector 1 Gate", students: 8, estimatedTime: "07:15" },
        { stopName: "Sector 2 Market", students: 12, estimatedTime: "07:25" },
        { stopName: "Sector 3 Plaza", students: 10, estimatedTime: "07:35" }
      ]
    }
  ]);
  const { toast } = useToast();

  const applyOptimization = (routeId: string) => {
    toast({
      title: "Success",
      description: "Route optimization applied successfully"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Route Optimization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {routes.map((route) => (
          <div key={route.routeId} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{route.routeName}</h3>
                <p className="text-sm text-muted-foreground">Route ID: {route.routeId}</p>
              </div>
              <Badge variant="outline" className="text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                Save {route.savings}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current Distance</p>
                <p className="text-lg font-bold">{route.currentDistance} km</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Optimized Distance</p>
                <p className="text-lg font-bold text-green-600">{route.optimizedDistance} km</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Optimized Stops</h4>
              {route.stops.map((stop, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{stop.stopName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stop.students} students • {stop.estimatedTime}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={() => applyOptimization(route.routeId)} className="w-full">
              Apply Optimization
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
