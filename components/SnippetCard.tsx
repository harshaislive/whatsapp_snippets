"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Snippet } from "@/lib/supabase";
import { format } from "date-fns";
import {
  MessageSquare,
  Users,
  Image as ImageIcon,
  Video,
  Music,
  File,
  ExternalLink
} from "lucide-react";
import { useState } from "react";

interface SnippetCardProps {
  snippet: Snippet;
}

export function SnippetCard({ snippet }: SnippetCardProps) {
  const [mediaError, setMediaError] = useState(false);
  const timestamp = new Date(snippet.timestamp);

  // Helper to check if content is a valid URL
  const isValidUrl = (str: string): boolean => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // Determine media type
  const content = snippet.content || "";
  const messageType = snippet.message_type?.toLowerCase() || "";
  const isUrl = isValidUrl(content);

  const isImageUrl =
    (messageType.includes("image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(content)) && isUrl;
  const isVideoUrl =
    (messageType.includes("video") || /\.(mp4|webm|ogg|mov)$/i.test(content)) && isUrl;
  const isAudioUrl =
    (messageType.includes("audio") || /\.(mp3|wav|ogg|m4a)$/i.test(content)) && isUrl;

  const displayType = isImageUrl
    ? "image"
    : isVideoUrl
    ? "video"
    : isAudioUrl
    ? "audio"
    : isUrl
    ? "media"
    : "text";

  const senderName = snippet.sender_name || snippet.sender_jid?.split("@")[0] || "Unknown";
  const senderInitial = senderName.charAt(0).toUpperCase();

  const getMediaIcon = () => {
    switch (displayType) {
      case "image":
        return <ImageIcon className="h-3 w-3 mr-1" />;
      case "video":
        return <Video className="h-3 w-3 mr-1" />;
      case "audio":
        return <Music className="h-3 w-3 mr-1" />;
      case "media":
        return <File className="h-3 w-3 mr-1" />;
      default:
        return <MessageSquare className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-medium">
            {senderInitial}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{senderName}</h3>
                {snippet.is_group && snippet.group_name && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Users className="h-3 w-3" />
                    <span className="truncate">{snippet.group_name}</span>
                  </div>
                )}
              </div>
              <time className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {format(timestamp, "h:mm a")}
              </time>
            </div>

            {/* Content */}
            <div className="text-sm">
              {isImageUrl && !mediaError && (
                <div className="mb-2">
                  <div className="relative overflow-hidden rounded-md max-h-[300px] group">
                    <img
                      src={content}
                      alt={snippet.caption || "Image"}
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                      onError={() => setMediaError(true)}
                    />
                  </div>
                  {snippet.caption && (
                    <p className="mt-2 whitespace-pre-wrap break-words">{snippet.caption}</p>
                  )}
                  <a
                    href={content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open image
                  </a>
                </div>
              )}

              {isVideoUrl && !mediaError && (
                <div className="mb-2">
                  <div className="relative overflow-hidden rounded-md">
                    <video
                      controls
                      src={content}
                      className="w-full max-h-96 object-contain"
                      onError={() => setMediaError(true)}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                  {snippet.caption && (
                    <p className="mt-2 whitespace-pre-wrap break-words">{snippet.caption}</p>
                  )}
                  <a
                    href={content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open video
                  </a>
                </div>
              )}

              {isAudioUrl && !mediaError && (
                <div className="mb-2">
                  <div className="p-3 bg-muted rounded-md">
                    <audio
                      controls
                      src={content}
                      className="w-full"
                      onError={() => setMediaError(true)}
                    >
                      Your browser doesn&apos;t support audio playback.
                    </audio>
                    {snippet.caption && (
                      <p className="mt-2 text-sm whitespace-pre-wrap break-words">{snippet.caption}</p>
                    )}
                  </div>
                  <a
                    href={content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open audio
                  </a>
                </div>
              )}

              {(mediaError || (isUrl && !isImageUrl && !isVideoUrl && !isAudioUrl)) && (
                <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="truncate text-sm">
                      {snippet.caption || "Media attachment"}
                    </span>
                  </div>
                  <a
                    href={content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-primary hover:text-primary/80 flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}

              {displayType === "text" && (
                <>
                  <p className="whitespace-pre-wrap break-words">{content}</p>
                  {snippet.caption && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
                      {snippet.caption}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="flex items-center text-xs text-muted-foreground">
                {getMediaIcon()}
                <span className="capitalize">{displayType}</span>
              </div>
              {snippet.message_type && (
                <Badge variant="outline" className="text-xs">
                  {snippet.message_type}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
