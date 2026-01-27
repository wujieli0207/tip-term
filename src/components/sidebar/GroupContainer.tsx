import { ReactNode } from 'react';
import { GroupInfo, GROUP_COLORS } from '../../stores/sessionStore';
import GroupHeader from './GroupHeader';

interface GroupContainerProps {
  group: GroupInfo;
  children: ReactNode;
}

export default function GroupContainer({ group, children }: GroupContainerProps) {
  const colors = GROUP_COLORS[group.color];

  return (
    <div
      className="relative rounded-lg my-0.5 mx-1 transition-all duration-200"
      style={{
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
      }}
    >
      {/* Group header */}
      <GroupHeader group={group} />

      {/* Sessions container with collapse animation - overflow-hidden only here */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          group.isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="pb-1">
          {children}
        </div>
      </div>
    </div>
  );
}
