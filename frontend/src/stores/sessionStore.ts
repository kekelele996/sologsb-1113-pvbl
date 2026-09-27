import { create } from 'zustand';
import { db, deleteRow, persistRow, SCHEMA_VERSION } from '../hooks/usePersistentStore';
import { uid } from '../utils/id';
import { overlapMinutes } from '../utils/astro';
import type { ObsSession, SessionStatus } from '../types';

export interface SessionInput {
  nightId: string;
  targetId: string;
  startTime: string;
  endTime: string;
  telescopeId: string;
  instrumentId: string;
  filterSlot: string;
  plannedFrames: number;
  status: SessionStatus;
  rescheduleReason?: string;
  backupNightId?: string;
}

/** 备用夜望远镜时段重叠明细（整批被拒时供页面指出冲突段） */
export interface RescheduleConflict {
  /** 本次申请改期的排程段 */
  sessionId: string;
  /** 与之冲突的备用夜已有段（或同批先占段） */
  otherId: string;
  telescopeId: string;
  /** 重叠区间文案 */
  overlapText: string;
}

/** 批量换位改期结果：成功时 moved 为生成的待执行段数，失败时整批未写入 */
export interface RescheduleResult {
  ok: boolean;
  backupNightId: string;
  /** 成功换位的段数（原段 → 备用夜待执行段） */
  moved: number;
  /** 幂等跳过：已改期过或本就在目标备用夜，未重复生成 */
  skipped: string[];
  /** 冲突明细；非空时整批不写入 */
  conflicts: RescheduleConflict[];
}

interface SessionState {
  sessions: ObsSession[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addSession: (input: SessionInput) => Promise<ObsSession>;
  updateSession: (id: string, patch: Partial<SessionInput>) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  /**
   * 批量改期到备用观测夜（可追溯换位）：
   * 每段在备用夜生成一条「待执行」新任务，原段保留「因云取消」、改期原因与双向新旧对应；
   * 同一望远镜时段与备用夜既有任务或批内其他段重叠时整批不写入；已改期过的段跳过不重复生成。
   */
  rescheduleToBackup: (ids: string[], backupNightId: string, reason: string) => Promise<RescheduleResult>;
  updateStatus: (id: string, status: SessionStatus) => Promise<void>;
}

/** 排程段与冲突检测所需数据 */
export const useSessionStore = create<SessionState>()((set, get) => ({
  sessions: [],
  hydrated: false,

  hydrate: async () => {
    const sessions = await db.sessions.orderBy('startTime').toArray();
    set({ sessions, hydrated: true });
  },

  addSession: async (input) => {
    const session: ObsSession = {
      id: uid('s'),
      nightId: input.nightId,
      targetId: input.targetId,
      startTime: input.startTime,
      endTime: input.endTime,
      telescopeId: input.telescopeId,
      instrumentId: input.instrumentId,
      filterSlot: input.filterSlot,
      plannedFrames: Number(input.plannedFrames) || 0,
      status: input.status,
      rescheduleReason: input.rescheduleReason?.trim() || undefined,
      backupNightId: input.backupNightId,
      schemaVersion: SCHEMA_VERSION,
    };
    await persistRow('sessions', session);
    set({ sessions: [...get().sessions, session] });
    return session;
  },

  updateSession: async (id, patch) => {
    const current = get().sessions.find((session) => session.id === id);
    if (!current) return;
    const next: ObsSession = { ...current, ...patch, schemaVersion: SCHEMA_VERSION };
    await persistRow('sessions', next);
    set({ sessions: get().sessions.map((session) => (session.id === id ? next : session)) });
  },

  removeSession: async (id) => {
    await deleteRow('sessions', id);
    set({ sessions: get().sessions.filter((session) => session.id !== id) });
  },

  rescheduleToBackup: async (ids, backupNightId, reason) => {
    const uniqueIds = Array.from(new Set(ids));
    const selected = get().sessions.filter((session) => uniqueIds.includes(session.id));

    // 幂等：已有备用夜对应段的不重复生成；本就在目标夜的也无需换位
    const skipped: string[] = [];
    const actionable = selected.filter((session) => {
      if (session.rescheduledToSessionId || session.nightId === backupNightId) {
        skipped.push(session.id);
        return false;
      }
      return true;
    });

    if (actionable.length === 0) {
      return { ok: true, backupNightId, moved: 0, skipped, conflicts: [] };
    }

    const movingIds = new Set(actionable.map((session) => session.id));
    const result = await db.transaction<RescheduleResult>('rw', db.sessions, async () => {
      const all = await db.sessions.toArray();
      // 备用夜上的有效占用：因云取消的段不占位；本次被换位的原段不在该夜，保险起见排除
      const occupiers = all.filter(
        (session) => session.nightId === backupNightId && session.status !== '因云取消' && !movingIds.has(session.id),
      );

      // 逐段把「拟生成的新任务」与备用夜既有任务及批内先放段比对望远镜重叠
      const conflicts: RescheduleConflict[] = [];
      const placed: ObsSession[] = [];
      for (const source of actionable) {
        for (const occ of [...occupiers, ...placed]) {
          if (occ.telescopeId !== source.telescopeId) continue;
          const overlap = overlapMinutes(source.startTime, source.endTime, occ.startTime, occ.endTime);
          if (overlap <= 0) continue;
          const overlapStart = source.startTime >= occ.startTime ? source.startTime : occ.startTime;
          conflicts.push({
            sessionId: source.id,
            otherId: occ.id,
            telescopeId: source.telescopeId,
            overlapText: `${overlapStart} 起重叠 ${overlap} 分钟`,
          });
        }
        placed.push(source);
      }

      // 有任何冲突：事务回滚，整批不写入
      if (conflicts.length > 0) {
        return { ok: false, backupNightId, moved: 0, skipped, conflicts };
      }

      const nowIso = new Date().toISOString();
      const reasonText = reason.trim() || '改期至备用观测夜';
      const updated: ObsSession[] = [];
      const created: ObsSession[] = [];
      for (const source of actionable) {
        const newId = uid('s');
        // 原段：保留取消原因并记录新段对应
        updated.push({
          ...source,
          status: '因云取消',
          rescheduleReason: reasonText,
          backupNightId,
          rescheduledToSessionId: newId,
          rescheduledAt: nowIso,
          schemaVersion: SCHEMA_VERSION,
        });
        // 备用夜新段：待执行任务，记录原段对应（不携带改期原因）
        created.push({
          id: newId,
          nightId: backupNightId,
          targetId: source.targetId,
          startTime: source.startTime,
          endTime: source.endTime,
          telescopeId: source.telescopeId,
          instrumentId: source.instrumentId,
          filterSlot: source.filterSlot,
          plannedFrames: source.plannedFrames,
          status: '待执行',
          rescheduledFromSessionId: source.id,
          rescheduledAt: nowIso,
          schemaVersion: SCHEMA_VERSION,
        });
      }
      await db.sessions.bulkPut(updated);
      await db.sessions.bulkAdd(created);
      return { ok: true, backupNightId, moved: updated.length, skipped, conflicts: [] };
    });

    if (result.ok) {
      // 以库内最新数据同步 store，保证原段更新与新段同时可见
      const sessions = await db.sessions.orderBy('startTime').toArray();
      set({ sessions });
    }
    return result;
  },

  updateStatus: async (id, status) => {
    await get().updateSession(id, { status });
  },
}));
