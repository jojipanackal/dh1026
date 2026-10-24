export type NavItem = {
  label: string;
  href: string;
};

export const navItems: NavItem[] = [
  { label: "Overview", href: "/" },
  { label: "Journal", href: "/journal" },
  { label: "Tasks", href: "/tasks" },
  { label: "Team", href: "/team" },
  { label: "Knowledge", href: "/knowledge" },
];
