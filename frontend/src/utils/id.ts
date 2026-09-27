/** 生成本地记录 id（无后端，前端自行分配唯一标识） */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
