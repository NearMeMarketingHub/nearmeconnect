import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ClientLayout } from "@/components/client-layout";
import { Video, FileText, Link2, HelpCircle, CheckCircle2, Circle, ExternalLink, Play } from "lucide-react";
import type { TrainingModule, TrainingAssignment, TrainingCompletion } from "@shared/schema";

interface TrainingWithProgress {
  module: TrainingModule;
  assignment: TrainingAssignment | null;
  completion: TrainingCompletion | null;
}

interface ClientTrainingProps {
  companyId?: string;
  embedded?: boolean;
}

export default function ClientTraining({ companyId, embedded = false }: ClientTrainingProps = {}) {
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<TrainingWithProgress | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data: training = [], isLoading } = useQuery<TrainingWithProgress[]>({
    queryKey: ["/api/my-training"],
  });

  const completeMutation = useMutation({
    mutationFn: async (data: { trainingModuleId: string; assignmentId?: string }) => {
      return apiRequest("/api/training-completions", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-training"] });
      toast({ title: "Training marked as complete!" });
      setViewDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to mark as complete", variant: "destructive" });
    },
  });

  const completedCount = training.filter(t => t.completion).length;
  const totalCount = training.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-5 w-5" />;
      case "document": return <FileText className="h-5 w-5" />;
      case "link": return <Link2 className="h-5 w-5" />;
      case "quiz": return <HelpCircle className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const openModule = (item: TrainingWithProgress) => {
    setSelectedModule(item);
    setViewDialogOpen(true);
  };

  const handleMarkComplete = () => {
    if (!selectedModule) return;
    completeMutation.mutate({
      trainingModuleId: selectedModule.module.id,
      assignmentId: selectedModule.assignment?.id,
    });
  };

  const getEmbedUrl = (url: string | null) => {
    if (!url) return null;
    if (url.includes("youtube.com/watch")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    return null;
  };

  const content = (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Training</h1>
          <p className="text-muted-foreground">Complete your assigned training modules</p>
        </div>

        {totalCount > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm text-muted-foreground">{completedCount} of {totalCount} completed</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : training.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No training assigned</p>
              <p className="text-sm">Check back later for new training modules.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {training.map((item) => (
              <Card
                key={item.module.id}
                className="cursor-pointer hover-elevate"
                onClick={() => openModule(item)}
                data-testid={`card-training-${item.module.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {getContentTypeIcon(item.module.contentType)}
                      <span className="text-xs uppercase">{item.module.contentType}</span>
                    </div>
                    {item.completion ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : item.assignment?.isRequired ? (
                      <Badge variant="secondary">Required</Badge>
                    ) : (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">{item.module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {item.module.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.module.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {item.module.duration && (
                      <span className="text-xs text-muted-foreground">{item.module.duration} min</span>
                    )}
                    {item.assignment?.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due: {parseLocalDate(item.assignment.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedModule && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    {getContentTypeIcon(selectedModule.module.contentType)}
                    <span className="text-xs uppercase">{selectedModule.module.contentType}</span>
                    {selectedModule.module.duration && (
                      <span className="text-xs">• {selectedModule.module.duration} min</span>
                    )}
                  </div>
                  <DialogTitle className="text-xl">{selectedModule.module.title}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  {selectedModule.module.description && (
                    <p className="text-muted-foreground">{selectedModule.module.description}</p>
                  )}

                  {selectedModule.module.contentType === "video" && selectedModule.module.contentUrl && (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      {getEmbedUrl(selectedModule.module.contentUrl) ? (
                        <iframe
                          src={getEmbedUrl(selectedModule.module.contentUrl)!}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Button asChild variant="outline">
                            <a
                              href={selectedModule.module.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Watch Video
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {(selectedModule.module.contentType === "document" || selectedModule.module.contentType === "link") && selectedModule.module.contentUrl && (
                    <Button asChild variant="outline" className="w-full">
                      <a
                        href={selectedModule.module.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open {selectedModule.module.contentType === "document" ? "Document" : "Link"}
                      </a>
                    </Button>
                  )}

                  {selectedModule.completion ? (
                    <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-700 dark:text-green-300">
                        Completed on {new Date(selectedModule.completion.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleMarkComplete}
                      disabled={completeMutation.isPending}
                      className="w-full"
                      data-testid="button-mark-complete"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {completeMutation.isPending ? "Marking Complete..." : "Mark as Complete"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <ClientLayout>
      <div className="p-6">
        {content}
      </div>
    </ClientLayout>
  );
}
