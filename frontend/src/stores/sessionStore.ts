import { create } from 'zustand';
import { db, deleteRow, persistRow, SCHEMA_VERSION } from '../hooks/usePersistentStore';
import { uid } from '../utils/id';
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

interface SessionState {
  sessions: ObsSession[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addSession: (input: SessionInput) => Promise<ObsSession>;
  updateSession: (id: string, patch: Partial<SessionInput>) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  /** 批量改期到备用观测夜并填写改期原因 */
  rescheduleToBackup: (ids: string[], backupNightId: string, reason: string) => Promise<number>;
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
    const targets = get().sessions.filter((session) => ids.includes(session.id));
    const updated = targets.map((session) => ({
      ...session,
      backupNightId,
      status: '因云取消' as SessionStatus,
      rescheduleReason: reason.trim() || '改期至备用观测夜',
      schemaVersion: SCHEMA_VERSION,
    }));
    for (const session of updated) {
      await persistRow('sessions', session);
    }
    set({ sessions: get().sessions.map((session) => updated.find((item) => item.id === session.id) ?? session) });
    return updated.length;
  },

  updateStatus: async (id, status) => {
    await get().updateSession(id, { status });
  },
}));
