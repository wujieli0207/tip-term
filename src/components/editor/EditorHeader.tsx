import { useEditorStore } from "../../stores/editorStore";
import EditorTabs from "./EditorTabs";
import { IconX } from "@/components/ui/icons";

export default function EditorHeader() {
  const { setEditorVisible } = useEditorStore();

  return (
    <div className="flex items-center justify-between bg-bg-terminal border-b border-border-subtle min-h-[36px]">
      <EditorTabs />
      <div className="flex items-center px-2">
        <button
          onClick={() => setEditorVisible(false)}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Close Editor (Cmd+E)"
        >
          <IconX className="w-4 h-4" stroke={2} />
        </button>
      </div>
    </div>
  );
}
