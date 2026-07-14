import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  Check,
  GripVertical,
} from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SortableCardItem } from "./sortable-card-item";
import { ListCard } from "./list-card";
import { t } from "@/lib/i18n";

export type DisplayMode = "detail" | "compact";

export interface SortOption {
  key: string;
  icon: React.ReactNode;
  labelKey: string;
}

export interface FilterCategory {
  key: string;
  labelKey: string;
  count: number;
}

export interface ToolbarConfig<T> {
  displayMode?: boolean;
  sortOptions?: SortOption[];
  activeSort?: string;
  onSortChange?: (key: string) => void;
  getFilterCategories?: (items: T[]) => FilterCategory[];
  activeFilters?: string[];
  onFiltersChange?: (keys: string[]) => void;
}

export interface SortableCardListProps<T extends { id: number }> {
  items: T[];
  renderItem: (item: T, mode: DisplayMode) => React.ReactNode;
  dragOverlay?: (item: T, mode: DisplayMode) => React.ReactNode;
  onReorder?: (orderedIds: number[]) => void;
  pageSize?: number;
  emptyState?: React.ReactNode;
  className?: string;
  toolbar?: ToolbarConfig<T>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

export function SortableCardList<T extends { id: number }>({
  items,
  renderItem,
  dragOverlay,
  onReorder,
  pageSize,
  emptyState,
  className,
  toolbar,
}: SortableCardListProps<T>) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("detail");
  const [showCount, setShowCount] = useState(pageSize ?? items.length);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<T | null>(null);
  const [dragItems, setDragItems] = useState<T[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const visibleItems = useMemo(
    () => (pageSize ? items.slice(0, showCount) : items),
    [items, showCount, pageSize],
  );
  const displayItems = dragItems ?? visibleItems;
  const hasMore = pageSize ? showCount < items.length : false;
  const remaining = pageSize ? items.length - showCount : 0;

  const displayIds = useMemo(() => displayItems.map((i) => i.id), [displayItems]);

  const hasFilters = !!(toolbar?.activeFilters?.length);

  const filteredVisible = useMemo(() => {
    if (!hasFilters) return displayItems;
    return displayItems.filter((item) => {
      if (!toolbar.getFilterCategories) return true;
      const cats = toolbar.getFilterCategories([item]);
      return cats.some(
        (c) => toolbar.activeFilters!.includes(c.key),
      );
    });
  }, [displayItems, toolbar, hasFilters]);

  const sortableIds = useMemo(() => {
    if (hasFilters) return filteredVisible.map((i) => i.id);
    return displayIds;
  }, [displayIds, filteredVisible, hasFilters]);

  const filterCategories = useMemo(() => {
    if (!toolbar?.getFilterCategories) return [];
    return toolbar.getFilterCategories(items);
  }, [items, toolbar]);

  const handleLoadMore = useCallback(() => {
    setShowCount((prev) => Math.min(prev + (pageSize ?? 20), items.length));
  }, [items.length, pageSize]);

  const dropAnimation: DropAnimation = {
    duration: 200,
    easing: "ease",
    keyframes: ({ transform }) => [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      { opacity: 0, transform: CSS.Transform.toString(transform.final) },
    ],
    sideEffects({ active }) {
      active.node.style.opacity = "";
      active.node.style.transform = "";
    },
  };

  const displayItemsRef = useRef(displayItems);
  displayItemsRef.current = displayItems;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (hasFilters) return;
      const current = displayItemsRef.current;
      setDragActive(true);
      setDragItems([...current]);
      const found = current.find((i) => String(i.id) === String(event.active.id));
      if (found) setActiveDragItem(found);
    },
    [hasFilters],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setDragItems((prev) => {
        if (!prev) return null;
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [],
  );

  const dragItemsRef = useRef(dragItems);
  dragItemsRef.current = dragItems;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const handleDragEnd = useCallback(() => {
    setDragActive(false);
    const currentDragItems = dragItemsRef.current;
    const currentItems = itemsRef.current;
    if (currentDragItems && onReorder && !hasFilters) {
      const dragIds = currentDragItems.map((i) => i.id);
      const fullIds = currentItems.map((i) => i.id);
      const reorderedIds = [
        ...dragIds,
        ...fullIds.filter((id) => !dragIds.includes(id)),
      ];
      onReorder(reorderedIds);
    }
    setTimeout(() => setActiveDragItem(null), 300);
  }, [onReorder, hasFilters]);

  useEffect(() => {
    setDragItems(null);
  }, [items]);

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className ?? ""}`}>
      {/* Toolbar */}
      {toolbar && (
        <div className="flex items-center gap-1 shrink-0 mb-2 px-2">
          {toolbar.displayMode && (
            <Tooltip
              content={
                displayMode === "detail" ? t("compactView") : t("detailView")
              }
              side="bottom"
            >
              <IconButton
                onClick={() =>
                  setDisplayMode((m) => (m === "detail" ? "compact" : "detail"))
                }
              >
                {displayMode === "detail" ? (
                  <List className="w-4 h-4" />
                ) : (
                  <LayoutGrid className="w-4 h-4" />
                )}
              </IconButton>
            </Tooltip>
          )}

          <div className="flex-1" />

          {toolbar.sortOptions && toolbar.sortOptions.length > 0 && (
            <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}
              trigger={
                <Tooltip content={t("sortBy")} side="bottom">
                  <IconButton onClick={() => setSortOpen((o) => !o)}>
                    <ArrowUpDown className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
              }
            >
              {toolbar.sortOptions.map((opt) => {
                const isActive = toolbar.activeSort === opt.key;
                return (
                  <DropdownMenuItem
                    key={opt.key}
                    active={isActive}
                    onClick={() => {
                      toolbar.onSortChange?.(opt.key);
                      setSortOpen(false);
                    }}
                  >
                    {opt.icon}
                    <span className="flex-1 text-left">{t(opt.labelKey)}</span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenu>
          )}

          {toolbar.getFilterCategories && (
            <Tooltip content={t("filter")} side="bottom">
              <IconButton onClick={() => setFilterOpen((o) => !o)}>
                <Filter className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      )}

      {/* Filter panel */}
      <AnimatePresence>
        {filterOpen && toolbar?.getFilterCategories && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex flex-wrap gap-1.5 pb-2 px-2">
              {filterCategories.map((cat) => {
                const isActive = toolbar.activeFilters?.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      const prev = toolbar.activeFilters ?? [];
                      const next = isActive
                        ? prev.filter((k) => k !== cat.key)
                        : [...prev, cat.key];
                      toolbar.onFiltersChange?.(next);
                    }}
                    className={
                      "rounded-full px-2.5 py-1 text-xs transition-colors"
                      + (isActive
                        ? " bg-blue-600 text-white"
                        : " bg-surface-elevated text-muted-foreground border border-border hover:border-primary/30 hover:text-white")
                    }
                  >
                    {t(cat.labelKey)}
                    <span className="ml-1 opacity-60">{cat.count}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence mode={dragActive ? "sync" : "popLayout"}>
              {filteredVisible.length === 0 ? (
                <motion.div
                  key="empty"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {emptyState ?? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("noItems")}
                    </p>
                  )}
                </motion.div>
              ) : (
                filteredVisible.map((item) => (
                  <motion.div
                    key={item.id}
                    layout={!dragActive}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit={dragActive ? undefined : "exit"}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  >
                    <SortableCardItem id={item.id}>
                      {renderItem(item, displayMode)}
                    </SortableCardItem>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </SortableContext>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeDragItem ? (
              <div className="px-2 py-0.5 opacity-60">
                <ListCard className="shadow-lg">
                  <div className="flex items-center justify-center w-9 shrink-0 text-muted-foreground">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  {dragOverlay
                    ? dragOverlay(activeDragItem, displayMode)
                    : renderItem(activeDragItem, displayMode)}
                </ListCard>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-3">
            <button
              onClick={handleLoadMore}
              className="text-xs text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-surface-overlay"
            >
              {t("loadMore")} ({t("remaining", { count: String(remaining) })})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
