import { useEditorStore } from "../../stores/editorStore";
import EditorTabs from "./EditorTabs";
import { IconX } from "@/components/ui/icons";

export default function EditorHeader() {
  const { setEditorVisible } = useEditorStore();

  return (
    <div className="flex items-center justify-between bg-[#0a0a0a] border-b border-[#2a2a2a] min-h-[36px]">
      <EditorTabs />
      <div className="flex items-center px-2">
        <button
          onClick={() => setEditorVisible(false)}
          className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-[#2a2a2a] transition-colors"
          title="Close Editor (Cmd+E)"
        >
          <IconX className="w-4 h-4" stroke={2} />
        </button>
      </div>
    </div>
  );
}
