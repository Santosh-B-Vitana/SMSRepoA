import { HostelManager } from "../components/hostel/HostelManager";
import { HostelEnhanced } from "../components/hostel/HostelEnhanced";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Hostel() {
  return (
    <Tabs defaultValue="rooms" className="space-y-4">
      <TabsList>
        <TabsTrigger value="rooms">Rooms & Students</TabsTrigger>
        <TabsTrigger value="enhanced">Blocks & Facilities</TabsTrigger>
      </TabsList>
      <TabsContent value="rooms"><HostelManager /></TabsContent>
      <TabsContent value="enhanced"><HostelEnhanced /></TabsContent>
    </Tabs>
  );
}