import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  recipientType: "all" | "class" | "individual";
  recipientFilter?: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: "scheduled" | "sent" | "failed";
  channel: "email" | "sms" | "app";
}

export function NotificationScheduler() {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([
    {
      id: "1",
      title: "Monthly Fee Reminder",
      message: "Please submit your monthly fees by the due date.",
      recipientType: "all",
      scheduledDate: new Date(Date.now() + 86400000),
      scheduledTime: "09:00",
      status: "scheduled",
      channel: "email",
    },
  ]);
  const [newNotification, setNewNotification] = useState<Partial<ScheduledNotification>>({
    recipientType: "all",
    channel: "email",
    scheduledDate: new Date(),
    scheduledTime: "09:00",
  });

  const handleSchedule = () => {
    if (!newNotification.title || !newNotification.message || !newNotification.scheduledDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const notification: ScheduledNotification = {
      id: Date.now().toString(),
      title: newNotification.title,
      message: newNotification.message,
      recipientType: newNotification.recipientType || "all",
      recipientFilter: newNotification.recipientFilter,
      scheduledDate: newNotification.scheduledDate,
      scheduledTime: newNotification.scheduledTime || "09:00",
      status: "scheduled",
      channel: newNotification.channel || "email",
    };

    setNotifications([...notifications, notification]);
    toast.success("Notification scheduled successfully");
    setNewNotification({
      recipientType: "all",
      channel: "email",
      scheduledDate: new Date(),
      scheduledTime: "09:00",
    });
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
    toast.success("Scheduled notification deleted");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule New Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newNotification.title || ""}
                onChange={(e) =>
                  setNewNotification({ ...newNotification, title: e.target.value })
                }
                placeholder="Notification title"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={newNotification.channel}
                onValueChange={(value: "email" | "sms" | "app") =>
                  setNewNotification({ ...newNotification, channel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="app">In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={newNotification.message || ""}
              onChange={(e) =>
                setNewNotification({ ...newNotification, message: e.target.value })
              }
              placeholder="Enter notification message"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select
                value={newNotification.recipientType}
                onValueChange={(value: "all" | "class" | "individual") =>
                  setNewNotification({ ...newNotification, recipientType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parents</SelectItem>
                  <SelectItem value="class">Specific Class</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newNotification.recipientType !== "all" && (
              <div className="space-y-2">
                <Label>Filter</Label>
                <Input
                  value={newNotification.recipientFilter || ""}
                  onChange={(e) =>
                    setNewNotification({ ...newNotification, recipientFilter: e.target.value })
                  }
                  placeholder="Class or student ID"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newNotification.scheduledDate
                      ? format(newNotification.scheduledDate, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newNotification.scheduledDate}
                    onSelect={(date) =>
                      setNewNotification({ ...newNotification, scheduledDate: date })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Schedule Time</Label>
              <Input
                type="time"
                value={newNotification.scheduledTime}
                onChange={(e) =>
                  setNewNotification({ ...newNotification, scheduledTime: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={handleSchedule} className="w-full">
            <Clock className="mr-2 h-4 w-4" />
            Schedule Notification
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <Badge
                          variant={
                            notification.status === "sent"
                              ? "default"
                              : notification.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {notification.status}
                        </Badge>
                        <Badge variant="outline">{notification.channel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {format(notification.scheduledDate, "PPP")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {notification.scheduledTime}
                        </span>
                      </div>
                    </div>
                    {notification.status === "scheduled" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
