import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, ExternalLink, Clock, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface GenerationTask {
  id: string;
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  submitTime?: number;
  finishTime?: number;
  duration: number;
  model: string;
  amount: number;
  videoUrl?: string;
}

interface GenerationTrackerProps {
  tasks: GenerationTask[];
}

const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDuration = (submitTime?: number, finishTime?: number): string => {
  if (!submitTime || !finishTime) return "-";
  const durationSeconds = finishTime - submitTime;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const getStatusBadge = (status: GenerationTask["status"]) => {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Terminé
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          En cours
        </Badge>
      );
    case "queued":
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Clock className="h-3 w-3 mr-1" />
          En attente
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Échec
        </Badge>
      );
  }
};

export const GenerationTracker = ({ tasks }: GenerationTrackerProps) => {
  const { toast } = useToast();

  const copyTaskId = async (taskId: string) => {
    await navigator.clipboard.writeText(taskId);
    toast({
      title: "Copié !",
      description: "L'ID de la tâche a été copié dans le presse-papiers",
    });
  };

  const openVideoUrl = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const totalAmount = tasks.reduce((sum, task) => sum + task.amount, 0);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Suivi des Générations</span>
          <Badge variant="outline" className="text-xs">
            Total: ${totalAmount.toFixed(2)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Submit time</TableHead>
                <TableHead className="text-xs">Finish time</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Platform</TableHead>
                <TableHead className="text-xs">Task ID</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Progress</TableHead>
                <TableHead className="text-xs">Details</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="text-xs font-mono">
                    {formatTimestamp(task.submitTime)}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {formatTimestamp(task.finishTime)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDuration(task.submitTime, task.finishTime)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-xs">
                      {task.model}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-mono truncate max-w-[100px]" title={task.taskId}>
                        {task.taskId.substring(0, 15)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => copyTaskId(task.taskId)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell className="min-w-[100px]">
                    <div className="flex items-center gap-2">
                      <Progress value={task.progress} className="h-2 w-16" />
                      <span className="text-xs font-mono">{task.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.videoUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => openVideoUrl(task.videoUrl)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-green-400">
                    ${task.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
