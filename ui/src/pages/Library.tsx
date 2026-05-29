import { EnhancedLibraryManager } from "../components/library/EnhancedLibraryManager";
import { LibraryEnhanced } from "../components/library/LibraryEnhanced";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Library() {
  return (
    <Tabs defaultValue="catalog" className="space-y-4">
      <TabsList>
        <TabsTrigger value="catalog">Books & Issues</TabsTrigger>
        <TabsTrigger value="enhanced">Reservations / Periodicals / Members</TabsTrigger>
      </TabsList>
      <TabsContent value="catalog"><EnhancedLibraryManager /></TabsContent>
      <TabsContent value="enhanced"><LibraryEnhanced /></TabsContent>
    </Tabs>
  );
}
