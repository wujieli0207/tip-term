import { Folder, Keyboard } from "lucide-react";
import type { RecentItem } from "../../stores/quickOpenStore";
import { formatBinding } from "../../utils/hotkeyUtils";
import { getIconColor } from "./utils/iconColors";
import { SectionHeader } from "./SectionHeader";

interface RecentSearchesProps {
  recentSearches: RecentItem[];
  onSelect: (item: RecentItem) => void;
}

export function RecentSearches({ recentSearches, onSelect }: RecentSearchesProps) {
  if (recentSearches.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <SectionHeader title="RECENT PROJECTS" />
      {recentSearches.map((item) => {
        const iconColorClass = item.filePath ? getIconColor(item.filePath) : "text-accent-cyan";

        return (
          <div
            key={item.type === "file" ? item.filePath : item.hotkeyId}
            className="h-[52px] rounded-lg px-3 cursor-pointer hover:bg-hover flex items-center gap-3"
            onClick={() => onSelect(item)}
          >
            {item.type === "file" ? (
              <>
                {/* Folder Icon */}
                <div className="w-9 h-9 rounded-lg bg-hover flex items-center justify-center flex-shrink-0">
                  <Folder className={`w-[18px] h-[18px] ${iconColorClass}`} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="text-[14px] font-sans font-medium text-primary truncate">
                    {item.label}
                  </div>
                  {item.filePath && (
                    <div className="text-xs font-mono text-text-secondary truncate">{item.filePath}</div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Keyboard Icon */}
                <div className="w-9 h-9 rounded-lg bg-hover flex items-center justify-center flex-shrink-0">
                  <Keyboard className="w-[18px] h-[18px] text-accent-cyan" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="text-[14px] font-sans font-medium text-primary truncate">
                    {item.label}
                  </div>
                  {item.binding && (
                    <div className="text-xs font-mono text-text-secondary truncate">
                      {formatBinding(item.binding)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
