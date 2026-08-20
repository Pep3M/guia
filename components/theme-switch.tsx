"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()

  const handleToggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <DropdownMenuCheckboxItem 
      checked={theme === "dark"} 
      onCheckedChange={handleToggleTheme}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute left-8 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span>Modo oscuro</span>
    </DropdownMenuCheckboxItem>
  )
}

