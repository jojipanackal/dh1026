import {
  Bot,
  FolderKanban,
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
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Team", href: "/team", icon: Users },
  { label: "Integrations", href: "/integrations", icon: Plug },
];
