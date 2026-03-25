import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Zap } from "lucide-react";
import { taskPriorities } from "@shared/schema";

const RUSH_MULTIPLIER = 2;

const taskRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Please provide more details about your request"),
  priority: z.enum(taskPriorities),
});

type TaskRequestFormData = z.infer<typeof taskRequestSchema>;

export interface TaskRequestSubmitData extends TaskRequestFormData {
  isRush: boolean;
  creditCost: number;
}

interface TaskRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskRequestSubmitData) => void;
  isSubmitting?: boolean;
  availableCredits?: number;
}

export function TaskRequestForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: TaskRequestFormProps) {
  const [isRush, setIsRush] = useState(false);

  const form = useForm<TaskRequestFormData>({
    resolver: zodResolver(taskRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const handleSubmit = (data: TaskRequestFormData) => {
    const creditCost = isRush ? 1 * RUSH_MULTIPLIER : 1;
    onSubmit({ ...data, creditCost, isRush });
    form.reset();
    setIsRush(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { setIsRush(false); } onOpenChange(val); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a Task</DialogTitle>
          <DialogDescription>
            Submit a new task request. Our team will review and begin work based
            on your priority level.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Create Instagram post for product launch"
                      {...field}
                      data-testid="input-task-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe what you need in detail. Include any specific requirements, brand guidelines, or reference materials."
                      className="min-h-[100px] resize-none"
                      {...field}
                      data-testid="input-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taskPriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          <span className="capitalize">{priority}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Rush Request</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs cursor-help">
                          {RUSH_MULTIPLIER}x credits
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Rush requests are prioritized and completed faster.</p>
                        <p>Credit cost is multiplied by {RUSH_MULTIPLIER}x.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Prioritize this task for faster turnaround
                  </p>
                </div>
              </div>
              <Switch
                checked={isRush}
                onCheckedChange={setIsRush}
                data-testid="switch-rush-request"
              />
            </div>

            {isRush && (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Rush pricing: <span className="line-through text-muted-foreground">1</span>{" "}
                  <span className="font-semibold">{RUSH_MULTIPLIER} credits</span> ({RUSH_MULTIPLIER}x multiplier)
                </span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-request"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-submit-request"
              >
                {isSubmitting ? "Submitting..." : isRush ? "Submit Rush Request" : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
