import { useState, useEffect, useMemo } from "react";
import { useGitStore } from "../../stores/gitStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  IconGitBranch,
  IconChevronDown,
  IconCheck,
  IconPlus,
  IconLoader2,
} from "@/components/ui/icons";

interface BranchSwitcherProps {
  sessionId: string;
}

export default function BranchSwitcher({ sessionId }: BranchSwitcherProps) {
  const {
    sessionGitState,
    branches,
    isBranchesLoading,
    branchSwitcherOpen,
    isSwitchingBranch,
    loadBranches,
    switchBranch,
    setBranchSwitcherOpen,
    setCreateBranchModalOpen,
  } = useGitStore();

  const [searchQuery, setSearchQuery] = useState("");

  const gitState = sessionGitState.get(sessionId);
  const status = gitState?.status;

  // Load branches when dropdown opens
  useEffect(() => {
    if (branchSwitcherOpen && sessionId) {
      loadBranches(sessionId);
    }
  }, [branchSwitcherOpen, sessionId, loadBranches]);

  // Filter branches based on search query
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;

    const query = searchQuery.toLowerCase();
    return branches.filter((branch) =>
      branch.name.toLowerCase().includes(query)
    );
  }, [branches, searchQuery]);

  // Separate local and remote branches
  const localBranches = useMemo(
    () => filteredBranches.filter((b) => !b.isRemote),
    [filteredBranches]
  );

  const remoteBranches = useMemo(
    () => filteredBranches.filter((b) => b.isRemote),
    [filteredBranches]
  );

  const handleSwitchBranch = async (branchName: string, isRemote: boolean) => {
    try {
      await switchBranch(sessionId, branchName, isRemote);
    } catch (error) {
      console.error("Failed to switch branch:", error);
    }
  };

  const handleCreateBranch = () => {
    setBranchSwitcherOpen(false);
    setCreateBranchModalOpen(true);
  };

  return (
    <DropdownMenu open={branchSwitcherOpen} onOpenChange={setBranchSwitcherOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-1 py-1 rounded hover:bg-bg-active text-text-primary transition-colors">
          <IconGitBranch className="w-4 h-4 text-accent-green" stroke={2} />
          <span className="text-[13px] font-medium">
            {status?.isDetached ? (
              <span className="text-accent-orange">{status.branchName}</span>
            ) : (
              status?.branchName || "Git"
            )}
          </span>
          <IconChevronDown className="w-3 h-3 text-text-muted" stroke={2} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-60 bg-bg-card border-border"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search input */}
        <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
          <Input
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-8 bg-bg-card border-border text-[13px] text-text-primary placeholder:text-text-muted"
            autoFocus
          />
        </div>

        <DropdownMenuSeparator className="bg-border" />

        {isBranchesLoading ? (
          <div className="flex items-center justify-center py-4 text-text-muted">
            <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-[13px]">Loading branches...</span>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {/* Local branches */}
            {localBranches.length > 0 && (
              <>
                <DropdownMenuLabel className="text-[10px] text-text-muted uppercase tracking-[1px] px-2 py-1">
                  Local Branches
                </DropdownMenuLabel>
                {localBranches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.name}
                    onClick={() => handleSwitchBranch(branch.name, false)}
                    disabled={branch.isCurrent || isSwitchingBranch}
                    className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-text-primary hover:bg-bg-active cursor-pointer"
                  >
                    <IconGitBranch className="w-4 h-4 text-text-muted" stroke={2} />
                    <span className="flex-1 truncate">{branch.name}</span>
                    {branch.isCurrent && (
                      <IconCheck className="w-4 h-4 text-accent-green" stroke={2} />
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* Remote branches */}
            {remoteBranches.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuLabel className="text-[10px] text-text-muted uppercase tracking-[1px] px-2 py-1">
                  Remote Branches
                </DropdownMenuLabel>
                {remoteBranches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.name}
                    onClick={() => handleSwitchBranch(branch.name, true)}
                    disabled={isSwitchingBranch}
                    className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-text-secondary hover:bg-bg-active cursor-pointer"
                  >
                    <IconGitBranch className="w-4 h-4 text-text-muted" stroke={2} />
                    <span className="flex-1 truncate">{branch.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* No results */}
            {localBranches.length === 0 && remoteBranches.length === 0 && (
              <div className="py-4 text-center text-[13px] text-text-muted">
                No branches found
              </div>
            )}
          </div>
        )}

        <DropdownMenuSeparator className="bg-border" />

        {/* Create new branch option */}
        <DropdownMenuItem
          onClick={handleCreateBranch}
          className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-text-primary hover:bg-bg-active cursor-pointer"
        >
          <IconPlus className="w-4 h-4 text-text-muted" stroke={2} />
          <span>Create new branch</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
