import { useState, useEffect, useMemo } from "react";
import { useGitStore } from "../../stores/gitStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconGitBranch,
  IconChevronDown,
  IconLoader2,
} from "@/components/ui/icons";

interface CreateBranchModalProps {
  sessionId: string;
}

export default function CreateBranchModal({ sessionId }: CreateBranchModalProps) {
  const {
    sessionGitState,
    branches,
    createBranchModalOpen,
    isCreatingBranch,
    loadBranches,
    createBranch,
    setCreateBranchModalOpen,
  } = useGitStore();

  const [branchName, setBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [baseBranchOpen, setBaseBranchOpen] = useState(false);

  const gitState = sessionGitState.get(sessionId);
  const status = gitState?.status;

  // Load branches when modal opens
  useEffect(() => {
    if (createBranchModalOpen && sessionId) {
      loadBranches(sessionId);
    }
  }, [createBranchModalOpen, sessionId, loadBranches]);

  // Set default base branch to current branch
  useEffect(() => {
    if (createBranchModalOpen && status?.branchName) {
      setBaseBranch(status.branchName);
    }
  }, [createBranchModalOpen, status?.branchName]);

  // Reset state when modal closes
  useEffect(() => {
    if (!createBranchModalOpen) {
      setBranchName("");
      setError(null);
    }
  }, [createBranchModalOpen]);

  // Get local branches only for base branch selection
  const localBranches = useMemo(
    () => branches.filter((b) => !b.isRemote),
    [branches]
  );

  // Validate branch name
  const validateBranchName = (name: string): string | null => {
    if (!name.trim()) {
      return "Branch name is required";
    }
    if (/\s/.test(name)) {
      return "Branch name cannot contain spaces";
    }
    if (/[~^:?*\[\]\\]/.test(name)) {
      return "Branch name contains invalid characters";
    }
    if (name.startsWith("-") || name.startsWith(".")) {
      return "Branch name cannot start with '-' or '.'";
    }
    if (name.endsWith(".lock") || name.endsWith("/")) {
      return "Invalid branch name ending";
    }
    // Check if branch already exists
    if (branches.some((b) => !b.isRemote && b.name === name)) {
      return "A branch with this name already exists";
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validateBranchName(branchName);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!baseBranch) {
      setError("Please select a base branch");
      return;
    }

    try {
      setError(null);
      await createBranch(sessionId, branchName.trim(), baseBranch);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleClose = () => {
    setCreateBranchModalOpen(false);
  };

  return (
    <Dialog open={createBranchModalOpen} onOpenChange={setCreateBranchModalOpen}>
      <DialogContent className="bg-[#1e1e1e] border-[#333] text-[#e0e0e0] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#e0e0e0]">
            Create New Branch
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Branch name input */}
          <div className="space-y-2">
            <label className="text-sm text-[#999]">Branch name</label>
            <Input
              placeholder="feature/my-new-feature"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setError(null);
              }}
              className="bg-[#252525] border-[#333] text-[#e0e0e0] placeholder:text-[#666]"
              autoFocus
            />
          </div>

          {/* Base branch selector */}
          <div className="space-y-2">
            <label className="text-sm text-[#999]">Base branch</label>
            <DropdownMenu open={baseBranchOpen} onOpenChange={setBaseBranchOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-[#333] bg-[#252525] text-sm text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors">
                  <div className="flex items-center gap-2">
                    <IconGitBranch className="w-4 h-4 text-[#888]" stroke={2} />
                    <span>{baseBranch || "Select base branch"}</span>
                  </div>
                  <IconChevronDown className="w-4 h-4 text-[#666]" stroke={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-full min-w-[200px] bg-[#1e1e1e] border-[#333]"
              >
                <div className="max-h-48 overflow-y-auto">
                  {localBranches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.name}
                      onClick={() => {
                        setBaseBranch(branch.name);
                        setBaseBranchOpen(false);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-[#e0e0e0] hover:bg-[#333] cursor-pointer"
                    >
                      <IconGitBranch className="w-4 h-4 text-[#888]" stroke={2} />
                      <span className="flex-1 truncate">{branch.name}</span>
                      {branch.isCurrent && (
                        <span className="text-xs text-[#666]">(current)</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isCreatingBranch}
            className="text-[#999] hover:text-[#e0e0e0] hover:bg-[#333]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreatingBranch || !branchName.trim() || !baseBranch}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isCreatingBranch ? (
              <>
                <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create branch"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
