import {
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Journal", href: "/journal", icon: NotebookPen },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Team", href: "/team", icon: Users },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
];
