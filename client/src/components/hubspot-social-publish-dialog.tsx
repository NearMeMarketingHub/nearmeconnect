import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentCalendarItem } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, Clock, CheckCircle2, AlertCircle, Share2, ExternalLink } from "lucide-react";

interface HubspotSocialChannel {
  channelGuid: string;
  type: string;
  name?: string;
  accountType?: string;
  username?: string;
}

interface HubspotSocialPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ContentCalendarItem;
  companyId: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  TWITTER: "Twitter / X",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  GOOGLE_MY_BUSINESS: "Google Business",
};

export function HubspotSocialPublishDialog({
  open,
  onOpenChange,
  item,
  companyId,
}: HubspotSocialPublishDialogProps) {
  const { toast } = useToast();

  const buildBody = () =>
    [item.bodyContent, item.hashtags].filter(Boolean).join("\n\n") || item.title;

  const [channelGuid, setChannelGuid] = useState("");
  const [body, setBody] = useState(buildBody);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(item.scheduledDate || "");
  const [scheduleTime, setScheduleTime] = useState(item.scheduledTime || "09:00");

  const { data: channelsData, isLoading: channelsLoading, error: channelsError } = useQuery<{ results: HubspotSocialChannel[] }>({
    queryKey: ["/api/hubspot/crm", companyId, "social-channels"],
    queryFn: () =>
      apiRequest("GET", `/api/hubspot/crm/${companyId}/social-channels`).then(r => r.json()),
    enabled: open && !!companyId,
    staleTime: 60_000,
  });

  const channels = channelsData?.results ?? [];

  const publishMutation = useMutation({
    mutationFn: async () => {
      let triggerAt: string | undefined;
      if (scheduleMode && scheduleDate) {
        triggerAt = new Date(`${scheduleDate}T${scheduleTime || "09:00"}:00`).toISOString();
      }
      const res = await apiRequest("POST", `/api/hubspot/crm/${companyId}/social-publish`, {
        calendarItemId: item.id,
        channelGuid,
        body,
        triggerAt,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Publish failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: scheduleMode ? "Post scheduled via HubSpot" : "Post published via HubSpot",
        description: scheduleMode
          ? `Scheduled for ${new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${scheduleTime}`
          : "Your post has been queued in HubSpot.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({ title: "Publish failed", description: err.message, variant: "destructive" }),
  });

  const isDisabled =
    !channelGuid || !body.trim() || publishMutation.isPending || (scheduleMode && !scheduleDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-orange-500" />
            Publish via HubSpot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-sm font-medium leading-snug">{item.title}</p>
            {item.scheduledDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Content date:{" "}
                {new Date(item.scheduledDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Social Channel</Label>
            {channelsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-9 px-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading connected accounts…
              </div>
            ) : channelsError ? (
              <div className="flex items-start gap-2 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Could not load channels</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Make sure HubSpot is connected and the social scope is granted.
                  </p>
                </div>
              </div>
            ) : channels.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground rounded-md border px-3 py-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">No social accounts connected in HubSpot</p>
                  <p className="text-xs mt-0.5">
                    Connect social accounts under{" "}
                    <span className="font-medium">Settings → Social</span> inside the client's HubSpot portal.
                  </p>
                </div>
              </div>
            ) : (
              <Select value={channelGuid} onValueChange={setChannelGuid}>
                <SelectTrigger data-testid="select-social-channel">
                  <SelectValue placeholder="Select a channel…" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(ch => (
                    <SelectItem
                      key={ch.channelGuid}
                      value={ch.channelGuid}
                      data-testid={`channel-option-${ch.channelGuid}`}
                    >
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold uppercase tracking-wide">
                          {CHANNEL_LABELS[ch.type] ?? ch.type}
                        </Badge>
                        <span className="text-sm">{ch.name || ch.username || ch.accountType || ch.channelGuid}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Post Content</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className="resize-none text-sm"
              placeholder="What would you like to post?"
              data-testid="input-social-body"
            />
            <p className="text-xs text-muted-foreground text-right">{body.length} characters</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Switch
                id="schedule-toggle"
                checked={scheduleMode}
                onCheckedChange={v => setScheduleMode(v)}
                data-testid="toggle-schedule-mode"
              />
              <Label htmlFor="schedule-toggle" className="cursor-pointer font-normal">
                Schedule for a specific date &amp; time
              </Label>
            </div>

            {scheduleMode && (
              <div className="flex gap-3 pl-8">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    data-testid="input-schedule-date"
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    data-testid="input-schedule-time"
                  />
                </div>
              </div>
            )}
          </div>

          {item.hubspotPostId && (
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 rounded-md px-3 py-2 border border-green-200 dark:border-green-900/40">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Previously published via HubSpot
                <span className="ml-1 font-mono opacity-70">(ID: {item.hubspotPostId})</span>
              </span>
              <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={publishMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={isDisabled}
            data-testid="button-publish-social"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {scheduleMode ? "Scheduling…" : "Publishing…"}
              </>
            ) : scheduleMode ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Schedule Post
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
