export type ModifierKey = "meta" | "ctrl" | "alt" | "shift";
export type HotkeyScope = "global" | "terminal" | "editor" | "modal";

export interface HotkeyBinding {
  key: string;              // 主键 (如 "t", ",", "\\")
  modifiers: ModifierKey[]; // 修饰键
}

export interface HotkeyDefinition {
  id: string;                         // 唯一标识
  action: string;                     // 动作名称
  label: string;                      // 显示名称
  description: string;                // 描述
  scope: HotkeyScope;                 // 作用范围
  defaultBinding: HotkeyBinding;      // 默认快捷键
  currentBinding: HotkeyBinding | null; // 当前快捷键 (null = disabled)
  category: string;                   // 分类
}

export interface HotkeyCustomization {
  [hotkeyId: string]: HotkeyBinding | null; // null means disabled
}
