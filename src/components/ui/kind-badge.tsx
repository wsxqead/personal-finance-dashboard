/** 실제 기록과 예상치를 구분하는 배지. 예상은 점선 테두리로 색 외에도 모양이 다릅니다. */
export function KindBadge({ kind, className = "" }: { kind: "actual" | "forecast"; className?: string }) {
  return kind === "actual" ? (
    <span
      className={`inline-flex items-center rounded-full border border-transparent bg-primary-soft px-1.5 py-px text-[10px] font-medium whitespace-nowrap text-primary-text ${className}`}
    >
      실제
    </span>
  ) : (
    <span
      className={`inline-flex items-center rounded-full border border-dashed border-muted/50 px-1.5 py-px text-[10px] font-medium whitespace-nowrap text-muted ${className}`}
    >
      예상
    </span>
  );
}
