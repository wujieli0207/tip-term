import { ReactNode } from 'react';
import { GroupInfo } from '../../stores/sessionStore';
import GroupHeader from './GroupHeader';

interface GroupContainerProps {
  group: GroupInfo;
  children: ReactNode;
}

export default function GroupContainer({ group, children }: GroupContainerProps) {
  return (
    <div className="transition-all duration-200">
      {/* Group header */}
      <GroupHeader group={group} />

      {/* Sessions container with collapse animation */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          group.isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="pl-[22px]">
          {children}
        </div>
      </div>
    </div>
  );
}
