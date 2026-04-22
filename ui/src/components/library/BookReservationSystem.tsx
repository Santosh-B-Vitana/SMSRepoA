import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookmarkCheck, Search } from "lucide-react";

interface Reservation {
  id: string;
  studentName: string;
  bookTitle: string;
  reservationDate: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  notificationSent: boolean;
}

export function BookReservationSystem() {
  const [reservations, setReservations] = useState<Reservation[]>([
    {
      id: "RES001",
      studentName: "Aarav Gupta",
      bookTitle: "Advanced Mathematics",
      reservationDate: "2024-04-15",
      status: "pending",
      notificationSent: false
    },
    {
      id: "RES002",
      studentName: "Ananya Sharma",
      bookTitle: "Physics Fundamentals",
      reservationDate: "2024-04-14",
      status: "fulfilled",
      notificationSent: true
    }
  ]);
  const { toast } = useToast();

  const fulfillReservation = (id: string) => {
    setReservations(reservations.map(res =>
      res.id === id ? { ...res, status: 'fulfilled' as const, notificationSent: true } : res
    ));
    toast({
      title: "Success",
      description: "Reservation fulfilled and student notified"
    });
  };

  const cancelReservation = (id: string) => {
    setReservations(reservations.map(res =>
      res.id === id ? { ...res, status: 'cancelled' as const } : res
    ));
    toast({
      title: "Success",
      description: "Reservation cancelled"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookmarkCheck className="h-5 w-5" />
          Book Reservation System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Search reservations..." />
          <Button variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Book Title</TableHead>
              <TableHead>Reservation Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notification</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">{reservation.studentName}</TableCell>
                <TableCell>{reservation.bookTitle}</TableCell>
                <TableCell>{reservation.reservationDate}</TableCell>
                <TableCell>
                  <Badge variant={
                    reservation.status === 'fulfilled' ? 'default' :
                    reservation.status === 'cancelled' ? 'destructive' : 'secondary'
                  }>
                    {reservation.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {reservation.notificationSent ? 
                    <Badge variant="outline">Sent</Badge> : 
                    <Badge variant="secondary">Pending</Badge>
                  }
                </TableCell>
                <TableCell>
                  {reservation.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => fulfillReservation(reservation.id)}>
                        Fulfill
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => cancelReservation(reservation.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
