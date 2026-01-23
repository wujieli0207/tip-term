import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import TerminalCanvas from "./components/TerminalCanvas";

function App() {
  const [termId, setTermId] = useState<string | null>(null);

  useEffect(() => {
    // Create terminal session on mount
    invoke<string>("create_session", { shell: "/bin/zsh" })
      .then((id) => setTermId(id))
      .catch(console.error);
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-950 overflow-hidden">
      <TerminalCanvas sessionId={termId} />
    </div>
  );
}

export default App;
