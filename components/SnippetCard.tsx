"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Snippet } from "@/lib/supabase";
import { format } from "date-fns";
import { MessageSquare, User, Users } from "lucide-react";

interface SnippetCardProps {
  snippet: Snippet;
}

export function SnippetCard({ snippet }: SnippetCardProps) {
  const timestamp = new Date(snippet.timestamp);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {snippet.is_group ? (
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="font-semibold truncate">
              {snippet.sender_name || "Unknown"}
            </span>
            {snippet.is_group && snippet.group_name && (
              <Badge variant="secondary" className="truncate max-w-[150px]">
                {snippet.group_name}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(timestamp, "MMM d, yyyy")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <p className="text-sm whitespace-pre-wrap break-words">
            {snippet.content}
          </p>
        </div>
        {snippet.caption && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Caption: {snippet.caption}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {format(timestamp, "h:mm a")}
          </span>
          {snippet.message_type && (
            <Badge variant="outline" className="text-xs">
              {snippet.message_type}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
