export interface NavItem {
  displayName?: string;
  iconName?: string;
  navCap?: string;
  route?: string;
  children?: NavItem[];
  chip?: boolean;
  chipContent?: string;
  chipClass?: string;
  external?: boolean;
  bgcolor?: string;
  disabled?: boolean;
  permission?: string;
  /** Keyboard shortcut hint displayed on the nav item (e.g. 'Ctrl+D'). */
  shortcutKey?: string;
}