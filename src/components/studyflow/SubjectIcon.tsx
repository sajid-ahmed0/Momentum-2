import React from 'react';
import {
  Calculator,
  Atom,
  Beaker,
  Dna,
  Languages,
  Cpu,
  Terminal,
  Code,
  Percent,
  Microscope,
  BookOpen,
  BookA,
  Compass,
  Globe,
  Palette,
  Music,
  Brain,
  Laptop as Computer,
  Smartphone as MonitorSmartphone,
  Layers,
  GraduationCap,
  Sparkles,
  Flame,
  Target,
  FileText,
  Bookmark,
  LucideProps
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Calculator,
  Atom,
  Beaker,
  Dna,
  Languages,
  Cpu,
  Terminal,
  Code,
  Percent,
  Microscope,
  BookOpen,
  BookA,
  Compass,
  Globe,
  Palette,
  Music,
  Brain,
  Computer,
  MonitorSmartphone,
  Layers,
  GraduationCap,
  Sparkles,
  Flame,
  Target,
  FileText,
  Bookmark
};

export const AVAILABLE_SUBJECT_ICONS = Object.keys(ICON_MAP);

export const getLucideIconByName = (name: string, props: LucideProps = {}) => {
  const IconComponent = ICON_MAP[name] || BookOpen;
  return <IconComponent {...props} />;
};

interface SubjectIconProps extends LucideProps {
  name: string;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ name, ...props }) => {
  const IconComponent = ICON_MAP[name] || BookOpen;
  return <IconComponent {...props} />;
};
