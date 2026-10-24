import {
  Bot,
  FolderKanban,
  ListChecks,
  Plug,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Agent", href: "/journal", icon: Bot },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Team", href: "/team", icon: Users },
  { label: "Integrations", href: "/integrations", icon: Plug },
];
