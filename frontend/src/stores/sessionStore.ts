import { create } from 'zustand';
import { db, deleteRow, persistRow, SCHEMA_VERSION } from '../hooks/usePersistentStore';
import { uid } from '../utils/id';
import { overlapMinutes } from '../utils/astro';
import type { ConflictItem, ObsSession, SessionStatus } from '../types';

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

/** 批量改期结果：冲突时整批不写入并带回冲突明细 */
export interface RescheduleResult {
  /** 是否已写入（false 表示因冲突整批拦截） */
  ok: boolean;
  /** 在备用夜新生成的待执行排程段数 */
  created: number;
  /** 已改期过 / 已取消而被跳过的段数（幂等，不重复生成） */
  skipped: number;
  /** 备用夜同望远镜时段重叠的冲突明细 */
  conflicts: ConflictItem[];
}

interface SessionState {
  sessions: ObsSession[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addSession: (input: SessionInput) => Promise<ObsSession>;
  updateSession: (id: string, patch: Partial<SessionInput>) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  /** 批量改期到备用观测夜：备用夜生成待执行新段，原段保留取消原因并记录新旧对应 */
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
    const all = get().sessions;
    const selected = all.filter((session) => ids.includes(session.id));
    // 幂等：已改期（已生成新段）或已取消的段直接跳过，不重复生成
    const pending = selected.filter((session) => !session.rescheduledToId && session.status !== '因云取消');
    const skipped = selected.length - pending.length;
    const reasonText = reason.trim() || '改期至备用观测夜';

    // 冲突守卫：新段 vs 备用夜现有未取消段，以及同批新段两两比对（同一望远镜时段重叠）
    const existing = all.filter((session) => session.nightId === backupNightId && session.status !== '因云取消');
    const conflicts: ConflictItem[] = [];
    const pushConflict = (a: ObsSession, b: ObsSession, overlap: number) => {
      const overlapStart = a.startTime > b.startTime ? a.startTime : b.startTime;
      conflicts.push({
        sessionId: a.id,
        otherId: b.id,
        nightId: backupNightId,
        telescopeId: a.telescopeId,
        overlapMinutes: overlap,
        overlapText: `${overlapStart} 起重叠 ${overlap} 分钟`,
      });
    };
    pending.forEach((session) => {
      existing.forEach((other) => {
        if (other.id === session.id || session.telescopeId !== other.telescopeId) return;
        const overlap = overlapMinutes(session.startTime, session.endTime, other.startTime, other.endTime);
        if (overlap > 0) pushConflict(session, other, overlap);
      });
    });
    for (let i = 0; i < pending.length; i += 1) {
      for (let j = i + 1; j < pending.length; j += 1) {
        const a = pending[i];
        const b = pending[j];
        if (a.telescopeId !== b.telescopeId) continue;
        const overlap = overlapMinutes(a.startTime, a.endTime, b.startTime, b.endTime);
        if (overlap > 0) pushConflict(a, b, overlap);
      }
    }
    // 任一时段重叠则整批不写入
    if (conflicts.length > 0) {
      return { ok: false, created: 0, skipped, conflicts };
    }

    // 换位：备用夜生成待执行新段（记录来源段），原段置为因云取消并指向新段
    const created: ObsSession[] = pending.map((session) => ({
      id: uid('s'),
      nightId: backupNightId,
      targetId: session.targetId,
      startTime: session.startTime,
      endTime: session.endTime,
      telescopeId: session.telescopeId,
      instrumentId: session.instrumentId,
      filterSlot: session.filterSlot,
      plannedFrames: session.plannedFrames,
      status: '待执行',
      rescheduledFromId: session.id,
      schemaVersion: SCHEMA_VERSION,
    }));
    const updated: ObsSession[] = pending.map((session, index) => ({
      ...session,
      status: '因云取消' as SessionStatus,
      rescheduleReason: reasonText,
      backupNightId,
      rescheduledToId: created[index].id,
      schemaVersion: SCHEMA_VERSION,
    }));
    await db.transaction('rw', db.sessions, async () => {
      await db.sessions.bulkPut([...updated, ...created]);
    });
    set({ sessions: [...get().sessions.map((session) => updated.find((item) => item.id === session.id) ?? session), ...created] });
    return { ok: true, created: created.length, skipped, conflicts: [] };
  },

  updateStatus: async (id, status) => {
    await get().updateSession(id, { status });
  },
}));
