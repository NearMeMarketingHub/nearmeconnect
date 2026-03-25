import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Repeat, Calendar as CalendarIcon, Clock, X, Check, Circle, Video } from "lucide-react";
import type { Company, Task, MeetingRequest } from "@shared/schema";
import { getBillingPeriod, formatBillingPeriod } from "@shared/billing";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CalendarMeeting {
  id: string;
  title: string;
  proposedDate: string;
  proposedTime: string;
  duration: number;
  status: string;
  companyId: string;
  teamsLink?: string | null;
}

interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isBillingStart: boolean;
  isBillingEnd: boolean;
  tasks: Task[];
  meetings: CalendarMeeting[];
}

type ViewMode = "month" | "week";

export default function AdminCalendar() {
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: allTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: allMeetingRequests = [] } = useQuery<MeetingRequest[]>({
    queryKey: ["/api/meeting-requests"],
  });

  const approvedMeetings: CalendarMeeting[] = useMemo(() => {
    return allMeetingRequests
      .filter(r => r.status === "approved" || r.status === "completed")
      .filter(r => selectedCompany === "all" || r.companyId === selectedCompany)
      .map(r => ({
        id: r.id,
        title: r.title,
        proposedDate: r.proposedDate,
        proposedTime: r.proposedTime,
        duration: r.duration,
        status: r.status,
        companyId: r.companyId,
        teamsLink: r.teamsLink,
      }));
  }, [allMeetingRequests, selectedCompany]);

  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    if (selectedCompany === "all") return allTasks;
    return allTasks.filter(t => t.companyId === selectedCompany);
  }, [allTasks, selectedCompany]);

  const getMeetingDateStr = (proposedDate: string) => {
    return proposedDate.split(' ')[0].split('T')[0];
  };

  const selectedCompanyData = companies?.find(c => c.id === selectedCompany);
  const billingStartDay = selectedCompanyData?.billingStartDay || 1;
  const billingPeriod = getBillingPeriod(billingStartDay, currentDate);

  const getTaskDateStr = (dueDate: string | null) => {
    if (!dueDate) return null;
    return dueDate.split(' ')[0].split('T')[0];
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDay = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        dayNum: date.getDate(),
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isBillingStart: date.getDate() === billingStartDay,
        isBillingEnd: date.getDate() === billingStartDay - 1 || (billingStartDay === 1 && date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()),
        tasks: [],
        meetings: approvedMeetings.filter(m => getMeetingDateStr(m.proposedDate) === dateStr),
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = filteredTasks.filter(t => getTaskDateStr(t.dueDate) === dateStr);
      const dayMeetings = approvedMeetings.filter(m => getMeetingDateStr(m.proposedDate) === dateStr);
      
      days.push({
        date,
        dayNum: day,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isBillingStart: day === billingStartDay,
        isBillingEnd: day === billingStartDay - 1 || (billingStartDay === 1 && day === totalDays),
        tasks: dayTasks,
        meetings: dayMeetings,
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        dayNum: i,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isBillingStart: i === billingStartDay,
        isBillingEnd: i === billingStartDay - 1,
        tasks: [],
        meetings: approvedMeetings.filter(m => getMeetingDateStr(m.proposedDate) === dateStr),
      });
    }

    return days;
  }, [currentDate, filteredTasks, approvedMeetings, billingStartDay]);

  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = filteredTasks.filter(t => getTaskDateStr(t.dueDate) === dateStr);
      
      days.push({
        date,
        dayNum: date.getDate(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: date.getTime() === today.getTime(),
        isBillingStart: date.getDate() === billingStartDay,
        isBillingEnd: false,
        tasks: dayTasks,
        meetings: approvedMeetings.filter(m => getMeetingDateStr(m.proposedDate) === dateStr),
      });
    }
    return days;
  }, [currentDate, filteredTasks, approvedMeetings, billingStartDay]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 20; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      slots.push(`${displayHour}:00 ${ampm}`);
    }
    return slots;
  }, []);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekRange = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, [currentDate]);

  const goToPrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50";
      case "in_progress": return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/50";
      case "review": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50";
      case "cancelled": return "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/50";
      default: return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50";
    }
  };

  const getCompanyName = (companyId: string) => {
    return companies?.find(c => c.id === companyId)?.name || "Unknown";
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.tasks.length > 0 || day.isCurrentMonth) {
      setSelectedDay(day);
    }
  };

  const handleTaskClick = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTask(task);
    setSelectedDay(null);
  };

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { taskId: string; updates: Partial<Task> }) => {
      return apiRequest("PATCH", `/api/tasks/${data.taskId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated", description: "Task has been updated successfully." });
    },
  });

  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async (data: { taskId: string; isCompleted: boolean }) => {
      return apiRequest("PUT", `/api/tasks/${data.taskId}/completion`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
  });

  const handleStatusChange = (taskId: string, status: string) => {
    updateTaskMutation.mutate({ taskId, updates: { status } });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6" data-testid="calendar-page">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Task Calendar
            </h1>
            <p className="text-muted-foreground">
              View all tasks by due date
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center border rounded-md">
              <Button 
                variant={viewMode === "month" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("month")}
                className="rounded-r-none"
                data-testid="button-month-view"
              >
                Month
              </Button>
              <Button 
                variant={viewMode === "week" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("week")}
                className="rounded-l-none"
                data-testid="button-week-view"
              >
                Week
              </Button>
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px]" data-testid="select-company-filter">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedCompany !== "all" && billingPeriod && (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-primary/10">Billing Period</Badge>
                <span className="text-muted-foreground">{formatBillingPeriod(billingPeriod)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPrev} data-testid="button-prev">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-semibold min-w-[250px] text-center">
                  {viewMode === "month" ? monthName : weekRange}
                </h2>
                <Button variant="outline" size="icon" onClick={goToNext} data-testid="button-next">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={goToToday} data-testid="button-today">
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading || companiesLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : viewMode === "month" ? (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      className={`min-h-[100px] p-1 border rounded-md cursor-pointer hover-elevate ${
                        !day.isCurrentMonth ? 'bg-muted/30' : ''
                      } ${day.isToday ? 'ring-2 ring-primary' : ''} ${
                        day.isBillingStart && selectedCompany !== "all" ? 'border-l-4 border-l-green-500' : ''
                      } ${
                        day.isBillingEnd && selectedCompany !== "all" ? 'border-r-4 border-r-red-500' : ''
                      }`}
                      data-testid={`calendar-day-${day.dayNum}`}
                    >
                      <div className={`text-sm font-medium ${!day.isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                        {day.dayNum}
                        {day.isBillingStart && selectedCompany !== "all" && (
                          <span className="ml-1 text-xs text-green-600">Start</span>
                        )}
                      </div>
                      <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px]">
                        {day.tasks.slice(0, 3).map(task => (
                          <div 
                            key={task.id}
                            onClick={(e) => handleTaskClick(task, e)}
                            className={`text-xs p-1 rounded truncate cursor-pointer hover-elevate ${getStatusColor(task.status)}`}
                            title={task.title}
                          >
                            <div className="flex items-center gap-1">
                              {task.isRecurring && <Repeat className="w-3 h-3 flex-shrink-0" />}
                              <span className="truncate">{task.title}</span>
                            </div>
                            {selectedCompany === "all" && (
                              <div className="text-[10px] opacity-70 truncate">
                                {getCompanyName(task.companyId)}
                              </div>
                            )}
                          </div>
                        ))}
                        {day.meetings.map(meeting => (
                          <div 
                            key={`meeting-${meeting.id}`}
                            className="text-xs p-1 rounded truncate bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                            title={`Meeting: ${meeting.title} at ${meeting.proposedTime}`}
                          >
                            <div className="flex items-center gap-1">
                              <Video className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{meeting.title}</span>
                            </div>
                            {selectedCompany === "all" && (
                              <div className="text-[10px] opacity-70 truncate">
                                {getCompanyName(meeting.companyId)}
                              </div>
                            )}
                          </div>
                        ))}
                        {day.tasks.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{day.tasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col">
                <div className="grid grid-cols-8 gap-1 mb-1 border-b pb-2">
                  <div className="text-center text-sm font-medium text-muted-foreground py-2">
                    <Clock className="w-4 h-4 mx-auto" />
                  </div>
                  {weekDays.map((day, idx) => (
                    <div 
                      key={idx} 
                      className={`text-center py-2 rounded ${day.isToday ? 'bg-primary/10' : ''}`}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className="text-xs text-muted-foreground">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}
                      </div>
                      <div className={`text-lg font-semibold ${day.isToday ? 'text-primary' : ''}`}>
                        {day.dayNum}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="overflow-y-auto max-h-[500px]">
                  {timeSlots.map((slot, slotIdx) => (
                    <div key={slot} className="grid grid-cols-8 gap-1 border-b">
                      <div className="text-xs text-muted-foreground py-2 px-1 text-right">
                        {slot}
                      </div>
                      {weekDays.map((day, dayIdx) => {
                        const slotHour = 6 + slotIdx;
                        const tasksInSlot = day.tasks.filter((_, i) => {
                          const taskSlot = Math.floor(i * 15 / day.tasks.length) + 6;
                          return taskSlot === slotHour;
                        });
                        
                        return (
                          <div 
                            key={dayIdx} 
                            className={`min-h-[50px] p-1 border-l ${day.isToday ? 'bg-primary/5' : ''}`}
                          >
                            {slotIdx === 0 && day.tasks.map(task => (
                              <div 
                                key={task.id}
                                onClick={() => handleTaskClick(task)}
                                className={`text-xs p-1 rounded mb-1 cursor-pointer hover-elevate border-l-2 ${getStatusColor(task.status)}`}
                                title={task.title}
                              >
                                <div className="flex items-center gap-1">
                                  {task.isRecurring && <Repeat className="w-3 h-3 flex-shrink-0" />}
                                  <span className="truncate">{task.title}</span>
                                </div>
                                {selectedCompany === "all" && (
                                  <div className="text-[10px] opacity-70 truncate">
                                    {getCompanyName(task.companyId)}
                                  </div>
                                )}
                              </div>
                            ))}
                            {slotIdx === 0 && day.meetings.map(meeting => (
                              <div 
                                key={`meeting-${meeting.id}`}
                                className="text-xs p-1 rounded mb-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-l-2 border-l-purple-500"
                                title={`Meeting: ${meeting.title} at ${meeting.proposedTime}`}
                              >
                                <div className="flex items-center gap-1">
                                  <Video className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{meeting.title}</span>
                                </div>
                                <div className="text-[10px] opacity-70">{meeting.proposedTime} · {meeting.duration}min</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-l-4 border-l-green-500 rounded" />
            <span>Billing period start</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-r-4 border-r-red-500 rounded" />
            <span>Billing period end</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 ring-2 ring-primary rounded" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            <span>Recurring task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center">
              <Video className="w-3 h-3 text-purple-600 dark:text-purple-300" />
            </div>
            <span>Meeting</span>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {(selectedDay?.tasks.length === 0 && selectedDay?.meetings.length === 0) ? (
              <p className="text-muted-foreground text-center py-8">No tasks or meetings scheduled for this day</p>
            ) : (
              <>
                {selectedDay?.meetings.map(meeting => (
                  <div 
                    key={`meeting-${meeting.id}`}
                    className="p-3 rounded-lg border bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800"
                  >
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-600 dark:text-purple-300 flex-shrink-0" />
                      <span className="font-medium">{meeting.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        {meeting.proposedTime} · {meeting.duration}min
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">{meeting.status}</Badge>
                    </div>
                    {selectedCompany === "all" && (
                      <p className="text-xs text-muted-foreground mt-2">{getCompanyName(meeting.companyId)}</p>
                    )}
                    {meeting.teamsLink && (
                      <a href={meeting.teamsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 mt-1 inline-block hover:underline">
                        Join Teams Meeting
                      </a>
                    )}
                  </div>
                ))}
                {selectedDay?.tasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={`p-3 rounded-lg cursor-pointer hover-elevate border ${getStatusColor(task.status)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {task.isRecurring && <Repeat className="w-4 h-4 flex-shrink-0" />}
                          <span className="font-medium">{task.title}</span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="capitalize text-xs">
                            {task.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {task.priority}
                          </Badge>
                          {task.noCredit ? (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs">
                              No Credit
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{task.creditCost} credits</span>
                          )}
                        </div>
                        {selectedCompany === "all" && (
                          <p className="text-xs text-muted-foreground mt-2">{getCompanyName(task.companyId)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedTask?.isRecurring && <Repeat className="w-5 h-5" />}
              {selectedTask?.title}
            </SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Company</Label>
                <p className="font-medium">{getCompanyName(selectedTask.companyId)}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <Select 
                  value={selectedTask.status} 
                  onValueChange={(value) => handleStatusChange(selectedTask.id, value)}
                >
                  <SelectTrigger data-testid="select-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTask.description && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Priority</Label>
                  <Badge variant={selectedTask.priority === "urgent" ? "destructive" : "secondary"} className="capitalize">
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Credits</Label>
                  {selectedTask.noCredit ? (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      No Credit
                    </Badge>
                  ) : (
                    <p className="font-mono">{selectedTask.creditCost}</p>
                  )}
                </div>
              </div>

              {selectedTask.deliverableType && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Deliverable Type</Label>
                  <p className="capitalize">{selectedTask.deliverableType.replace(/_/g, " ")}</p>
                </div>
              )}

              {selectedTask.dueDate && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Due Date</Label>
                  <p>{parseLocalDate(selectedTask.dueDate).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedTask.status !== "completed" ? (
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      toggleTaskCompletionMutation.mutate({ taskId: selectedTask.id, isCompleted: true });
                      setSelectedTask(null);
                    }}
                    data-testid="button-complete-task"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      toggleTaskCompletionMutation.mutate({ taskId: selectedTask.id, isCompleted: false });
                      setSelectedTask(null);
                    }}
                    data-testid="button-reopen-task"
                  >
                    <Circle className="w-4 h-4 mr-2" />
                    Reopen Task
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
