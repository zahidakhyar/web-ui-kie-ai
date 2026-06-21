'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MODELS } from '@/lib/models';
import { Search, X, Grid3X3, LayoutGrid, ArrowUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GalleryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  gridDensity: 'compact' | 'comfortable';
  onGridDensityChange: (value: 'compact' | 'comfortable') => void;
  showModelFilter: boolean;
}

export function GalleryToolbar({
  search,
  onSearchChange,
  selectedModel,
  onModelChange,
  sortBy,
  onSortByChange,
  gridDensity,
  onGridDensityChange,
  showModelFilter,
}: GalleryToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sync state if changed externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const hasActiveFilters = search !== '' || (showModelFilter && selectedModel !== 'all') || sortBy !== 'newest';

  const handleClearFilters = () => {
    setLocalSearch('');
    onSearchChange('');
    onModelChange('all');
    onSortByChange('newest');
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 border-b border-border/40">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center max-w-2xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={showModelFilter ? "Search prompts..." : "Search uploads..."}
            className="pl-9 h-9 rounded-xl bg-card border-border/60 focus-visible:ring-primary/20"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Model Filter (only if showModelFilter is true) */}
        {showModelFilter && (
          <Select value={selectedModel} onValueChange={(val) => val && onModelChange(val)}>
            <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-xl border-border/60 bg-card cursor-pointer">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60">
              <SelectItem value="all">All Models</SelectItem>
              {MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2">
        {/* Sort Trigger */}
        <Select value={sortBy} onValueChange={(val) => val && onSortByChange(val)}>
          <SelectTrigger className="h-9 w-[120px] rounded-xl border-border/60 bg-card cursor-pointer">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60">
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border/40 hidden sm:block" />

        {/* Grid Density Buttons */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onGridDensityChange('compact')}
            className={`h-7 w-7 p-0 rounded-lg cursor-pointer ${gridDensity === 'compact' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            title="Compact grid"
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onGridDensityChange('comfortable')}
            className={`h-7 w-7 p-0 rounded-lg cursor-pointer ${gridDensity === 'comfortable' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            title="Comfortable grid"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 text-xs text-primary hover:bg-primary/5 hover:text-primary rounded-xl cursor-pointer"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
