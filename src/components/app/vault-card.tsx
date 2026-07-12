import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { ListCard, ListCardIcon, ListCardContent } from "./list-card";
import { SortableCardItem } from "./sortable-card-item";

function avatarColor(name: string): string {
  const colors = [
    "bg-blue-500/20 text-blue-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-violet-500/20 text-violet-400",
    "bg-amber-500/20 text-amber-400",
    "bg-rose-500/20 text-rose-400",
    "bg-cyan-500/20 text-cyan-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface VaultCardProps {
  id?: number;
  name: string;
  createdAt: string;
  onClick: () => void;
  onDelete?: () => void;
  sortable?: boolean;
}

function VaultCardInner({ name, createdAt, onClick, onDelete }: Omit<VaultCardProps, "id" | "sortable">) {
  useLocale();

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex items-center gap-3 p-3 pl-1 text-left min-w-0"
      >
        <ListCardIcon className={`rounded-full ${avatarColor(name)}`}>
          <span className="text-sm font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
        </ListCardIcon>
        <ListCardContent name={name} subtitle={createdAt} />
      </button>
      {onDelete && (
        <div className="flex items-center pr-2">
          <Tooltip content={t("deleteVault")} side="bottom">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      )}
    </>
  );
}

export function VaultCard({ id, sortable, ...rest }: VaultCardProps) {
  if (sortable && id !== undefined) {
    return (
      <SortableCardItem id={id}>
        <VaultCardInner {...rest} />
      </SortableCardItem>
    );
  }

  return (
    <div className="px-2 py-0.5">
      <ListCard>
        <button
          type="button"
          onClick={rest.onClick}
          className="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
        >
          <ListCardIcon className={`rounded-full ${avatarColor(rest.name)}`}>
            <span className="text-sm font-semibold">
              {rest.name.charAt(0).toUpperCase()}
            </span>
          </ListCardIcon>
          <ListCardContent name={rest.name} subtitle={rest.createdAt} />
        </button>
      </ListCard>
    </div>
  );
}
