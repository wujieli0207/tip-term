import { IconTerminal2 } from "@/components/ui/icons";

export default function ApplicationSection() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-200 mb-6">Application</h2>

      <div className="space-y-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <IconTerminal2 className="w-7 h-7 text-white" stroke={2} />
            </div>
            <div>
              <div className="text-gray-200 font-medium">TipTerm</div>
              <div className="text-sm text-gray-500">Version 0.1.0</div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
          <div className="text-sm text-gray-400 mb-2">About</div>
          <p className="text-sm text-gray-500 leading-relaxed">
            TipTerm is a modern terminal emulator built with Tauri, React, and xterm.js.
            It provides a fast, native experience with GPU-accelerated rendering.
          </p>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
          <div className="text-sm text-gray-400 mb-3">Keyboard Shortcuts</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">New Session</span>
              <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-xs text-gray-400">Cmd+T</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Close Session</span>
              <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-xs text-gray-400">Cmd+W</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Toggle Sidebar</span>
              <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-xs text-gray-400">Cmd+\</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Settings</span>
              <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-xs text-gray-400">Cmd+,</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Switch Session</span>
              <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-xs text-gray-400">Cmd+1-9</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
