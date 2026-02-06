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
      <DialogContent className="bg-bg-card border-border-subtle text-text-primary sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-text-primary">
            Create New Branch
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Branch name input */}
          <div className="space-y-2">
            <label className="text-sm text-text-muted">Branch name</label>
            <Input
              placeholder="feature/my-new-feature"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setError(null);
              }}
              className="bg-bg-card border-border-subtle text-text-primary placeholder:text-text-muted"
              autoFocus
            />
          </div>

          {/* Base branch selector */}
          <div className="space-y-2">
            <label className="text-sm text-text-muted">Base branch</label>
            <DropdownMenu open={baseBranchOpen} onOpenChange={setBaseBranchOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-border-subtle bg-bg-card text-sm text-text-primary hover:bg-bg-hover transition-colors">
                  <div className="flex items-center gap-2">
                    <IconGitBranch className="w-4 h-4 text-text-muted" stroke={2} />
                    <span>{baseBranch || "Select base branch"}</span>
                  </div>
                  <IconChevronDown className="w-4 h-4 text-text-muted" stroke={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-full min-w-[200px] bg-bg-card border-border-subtle"
              >
                <div className="max-h-48 overflow-y-auto">
                  {localBranches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.name}
                      onClick={() => {
                        setBaseBranch(branch.name);
                        setBaseBranchOpen(false);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-bg-hover cursor-pointer"
                    >
                      <IconGitBranch className="w-4 h-4 text-text-muted" stroke={2} />
                      <span className="flex-1 truncate">{branch.name}</span>
                      {branch.isCurrent && (
                        <span className="text-xs text-text-muted">(current)</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-accent-red bg-accent-red/15 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isCreatingBranch}
            className="text-text-muted hover:text-text-primary hover:bg-bg-hover"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreatingBranch || !branchName.trim() || !baseBranch}
            className="bg-accent-primary hover:bg-accent-primary/90 text-white"
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
