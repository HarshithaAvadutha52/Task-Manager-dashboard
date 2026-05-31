import React from "react";
import * as Lucide from "lucide-react";

export type IconName = keyof typeof Lucide;

interface CozyIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CozyIcon: React.FC<CozyIconProps> = ({ name, className = "", size = 20 }) => {
  // Safe resolver for lucide icons
  const IconComponent = (Lucide as any)[name];

  if (!IconComponent) {
    // Return a default fallback user icon if not found
    return <Lucide.User className={className} size={size} />;
  }

  return <IconComponent className={className} size={size} />;
};

// Curated selection of cozy avatars
export const CURATED_AVATARS: string[] = [
  "Sparkles",
  "User",
  "Heart",
  "Smile",
  "Coffee",
  "Sun",
  "Moon",
  "Feather",
  "Zap",
  "Compass",
  "Anchor",
  "Ghost",
  "Target",
  "Palette",
  "Crown",
  "Award",
];

// Curated selection of workspace icons
export const WORKSPACE_ICONS: string[] = [
  "Briefcase",
  "User",
  "Heart",
  "Sparkles",
  "Feather",
  "Coffee",
  "Palette",
  "Target",
];
