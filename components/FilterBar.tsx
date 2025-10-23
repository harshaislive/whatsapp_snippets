"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";

interface FilterBarProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedGroup: string | null;
  availableGroups: string[];
  searchQuery: string;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onGroupChange: (group: string | null) => void;
  onSearchChange: (query: string) => void;
}

type QuickFilter = "all" | "today" | "yesterday" | "last7" | "last30" | "custom";

export function FilterBar({
  startDate,
  endDate,
  selectedGroup,
  availableGroups,
  searchQuery,
  onStartDateChange,
  onEndDateChange,
  onGroupChange,
  onSearchChange,
}: FilterBarProps) {
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("all");

  const applyQuickFilter = (filter: QuickFilter) => {
    setActiveFilter(filter);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case "all":
        onStartDateChange(null);
        onEndDateChange(null);
        break;
      case "today":
        onStartDateChange(today);
        onEndDateChange(today);
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        onStartDateChange(yesterday);
        onEndDateChange(yesterday);
        break;
      case "last7":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        onStartDateChange(sevenDaysAgo);
        onEndDateChange(today);
        break;
      case "last30":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        onStartDateChange(thirtyDaysAgo);
        onEndDateChange(today);
        break;
      case "custom":
        // Don't change dates, let user pick manually
        break;
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          onClick={() => applyQuickFilter("all")}
        >
          All Time
        </Button>
        <Button
          variant={activeFilter === "today" ? "default" : "outline"}
          onClick={() => applyQuickFilter("today")}
        >
          Today
        </Button>
        <Button
          variant={activeFilter === "yesterday" ? "default" : "outline"}
          onClick={() => applyQuickFilter("yesterday")}
        >
          Yesterday
        </Button>
        <Button
          variant={activeFilter === "last7" ? "default" : "outline"}
          onClick={() => applyQuickFilter("last7")}
        >
          Last 7 Days
        </Button>
        <Button
          variant={activeFilter === "last30" ? "default" : "outline"}
          onClick={() => applyQuickFilter("last30")}
        >
          Last 30 Days
        </Button>
        <Button
          variant={activeFilter === "custom" ? "default" : "outline"}
          onClick={() => {
            setActiveFilter("custom");
          }}
        >
          Custom Range
        </Button>
      </div>

      {/* Desktop Filters Row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Custom Date Range */}
        {activeFilter === "custom" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate || undefined}
                    onSelect={(date) => onStartDateChange(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={(date) => onEndDateChange(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        {/* Group Filter */}
        {availableGroups.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Group:</span>
            <Select
              value={selectedGroup || "all"}
              onValueChange={(value) => onGroupChange(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {availableGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[400px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages, captions, or senders..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("")}
              className="h-8 px-2"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
