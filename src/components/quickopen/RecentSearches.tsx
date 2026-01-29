import { Clock, Keyboard } from "lucide-react";
import type { RecentItem } from "../../stores/quickOpenStore";
import { getFileIcon } from "./utils/fileIcons";
import { formatBinding } from "../../utils/hotkeyUtils";

interface RecentSearchesProps {
  recentSearches: RecentItem[];
  onSelect: (item: RecentItem) => void;
}

export function RecentSearches({ recentSearches, onSelect }: RecentSearchesProps) {
  if (recentSearches.length === 0) return null;

  return (
    <>
      <div className="px-3 py-1.5 text-xs text-gray-400 font-medium bg-[#1a1a1a] sticky top-0 border-b border-[#2a2a2a] flex items-center gap-2">
        <Clock size={12} />
        recent
      </div>
      {recentSearches.map((item) => (
        <div
          key={item.type === "file" ? item.filePath : item.hotkeyId}
          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#222]"
          onClick={() => onSelect(item)}
        >
          {item.type === "file" ? (
            <>
              <span className="text-base flex-shrink-0">{getFileIcon(item.label)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{item.label}</div>
                {item.filePath && (
                  <div className="text-xs text-gray-500 truncate">{item.filePath}</div>
                )}
              </div>
            </>
          ) : (
            <>
              <Keyboard size={14} className="text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-gray-500 truncate">{item.description}</div>
                )}
              </div>
              {item.binding && (
                <kbd className="px-2 py-0.5 bg-[#333] rounded text-xs text-gray-300 font-mono flex-shrink-0">
                  {formatBinding(item.binding)}
                </kbd>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
}
