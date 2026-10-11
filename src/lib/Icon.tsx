import {
  Award,
  Clock,
  HardHat,
  Home,
  Languages,
  Layers,
  Scale,
  Search,
  ShieldCheck,
  Users,
  type LucideProps,
} from 'lucide-react'

const map = {
  users: Users,
  hardhat: HardHat,
  layers: Layers,
  search: Search,
  clock: Clock,
  shield: ShieldCheck,
  languages: Languages,
  home: Home,
  scale: Scale,
  award: Award,
}

export type IconName = keyof typeof map

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = map[name as IconName] ?? Users
  return <Cmp {...props} />
}
