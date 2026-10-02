"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

type ThemeValue = "light" | "dark" | "system";

const options: { value: ThemeValue; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
  { value: "system", label: "시스템", icon: Monitor },
];

const noopSubscribe = () => () => {};

/** 서버 렌더링 중에는 저장된 테마를 알 수 없으므로, 마운트 후에만 선택 상태를 표시합니다. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

interface ThemeToggleProps {
  /** segmented: 세 가지를 나란히 / compact: 아이콘 버튼 하나로 순환 */
  variant?: "segmented" | "compact";
  className?: string;
}

export function ThemeToggle({ variant = "segmented", className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = (mounted ? theme : undefined) as ThemeValue | undefined;

  if (variant === "compact") {
    const index = options.findIndex((option) => option.value === current);
    const active = options[index] ?? options[0];
    const next = options[(index + 1) % options.length];
    const Icon = active.icon;

    return (
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        aria-label={`테마: ${active.label} (눌러서 ${next.label}로 변경)`}
        title={`테마: ${active.label}`}
        className={`inline-flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-soft hover:text-foreground ${className}`}
      >
        <Icon className="size-[18px]" aria-hidden />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="테마 선택"
      className={`grid grid-cols-3 gap-1 rounded-xl bg-surface-alt p-1 ${className}`}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const selected = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
              selected ? "bg-surface text-foreground shadow-soft" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
