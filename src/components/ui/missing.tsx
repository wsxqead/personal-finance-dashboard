/** 값이 아직 입력되지 않았거나 계산할 수 없을 때 숫자 자리에 표시 */
export function Missing({ children = "미입력", className = "" }: { children?: string; className?: string }) {
  return <span className={`font-medium whitespace-nowrap text-muted ${className}`}>{children}</span>;
}
