import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, PartyPopper, BookOpen, Award, Plus, Settings2 } from "lucide-react";
import { EventManagementDialog, CalendarEvent } from "./EventManagementDialog";
import { toast } from "sonner";

const defaultEvents: CalendarEvent[] = [
  {
    id: '1',
    date: new Date(2025, 11, 10),
    title: 'Winter Break Begins',
    type: 'holiday',
    description: 'School closes for winter vacation'
  },
  {
    id: '2',
    date: new Date(2025, 11, 15),
    title: 'PTM Meeting',
    type: 'event',
    description: 'Parent-Teacher Meeting for all classes'
  },
  {
    id: '3',
    date: new Date(2025, 11, 25),
    title: 'Christmas Holiday',
    type: 'holiday',
    description: 'Christmas Day - School Closed'
  },
  {
    id: '4',
    date: new Date(2026, 0, 1),
    title: 'New Year Holiday',
    type: 'holiday',
    description: 'New Year Day - School Closed'
  },
  {
    id: '5',
    date: new Date(2026, 0, 14),
    title: 'Makar Sankranti',
    type: 'holiday',
    description: 'Festival Holiday'
  },
  {
    id: '6',
    date: new Date(2026, 0, 26),
    title: 'Republic Day',
    type: 'holiday',
    description: 'National Holiday - Flag Hoisting Ceremony'
  },
  {
    id: '7',
    date: new Date(2026, 1, 1),
    title: 'Unit Test 3',
    type: 'exam',
    description: 'Unit Test for Classes 1-12'
  },
  {
    id: '8',
    date: new Date(2026, 2, 1),
    title: 'Annual Day',
    type: 'event',
    description: 'School Annual Function & Cultural Program'
  }
];

export function CalendarWidget() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(defaultEvents);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const upcomingEvents = events
    .filter(event => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'holiday':
        return <CalendarDays className="h-4 w-4" />;
      case 'exam':
        return <BookOpen className="h-4 w-4" />;
      case 'event':
        return <Award className="h-4 w-4" />;
      case 'birthday':
        return <PartyPopper className="h-4 w-4" />;
      default:
        return <CalendarDays className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'holiday':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'exam':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'event':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'birthday':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-muted';
    }
  };

  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id'> & { id?: string }) => {
    if (eventData.id) {
      // Update existing
      setEvents(prev => prev.map(e => 
        e.id === eventData.id 
          ? { ...e, ...eventData } as CalendarEvent
          : e
      ));
      toast.success("Event updated successfully");
    } else {
      // Add new
      const newEvent: CalendarEvent = {
        ...eventData,
        id: Date.now().toString()
      };
      setEvents(prev => [...prev, newEvent]);
      toast.success("Event added successfully");
    }
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success("Event deleted successfully");
    setEditingEvent(null);
  };

  const modifiers = {
    events: events.map(e => e.date)
  };

  const modifiersStyles = {
    events: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'white',
      borderRadius: '50%'
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Calendar & Events</CardTitle>
            <CardDescription>Upcoming holidays, exams and events</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddDialog(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className="rounded-md border w-full"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">Upcoming Events</h4>
                <Badge variant="secondary" className="text-xs">{upcomingEvents.length} events</Badge>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer hover:bg-muted transition-colors group"
                    >
                      <div className={`p-1.5 rounded-md shrink-0 ${getEventColor(event.type)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {event.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.date.toLocaleDateString('en-IN', { 
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEvent(event);
                          }}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent && !editingEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventIcon(selectedEvent.type)}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Date</div>
              <div className="text-foreground">
                {selectedEvent?.date.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>
            {selectedEvent?.description && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                <div className="text-foreground">{selectedEvent.description}</div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Type</div>
              <Badge className={getEventColor(selectedEvent?.type || '')}>
                {selectedEvent?.type}
              </Badge>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setEditingEvent(selectedEvent);
                  setSelectedEvent(null);
                }}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Event Dialog */}
      <EventManagementDialog
        open={showAddDialog || !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingEvent(null);
          }
        }}
        event={editingEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </>
  );
}
