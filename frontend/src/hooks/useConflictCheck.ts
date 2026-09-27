import { useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { SCHEMA_VERSION } from './usePersistentStore';
import type { ConflictItem, ObsSession } from '../types';
import { overlapMinutes } from '../utils/astro';

export interface ConflictCheckInput {
  nightId: string;
  telescopeId: string;
  startTime: string;
  endTime: string;
  /** 编辑时忽略自身 */
  ignoreSessionId?: string;
}

export interface ConflictCheckApi {
  findConflicts: (input: ConflictCheckInput) => ConflictItem[];
  /** 某一观测夜内的全部冲突（两两比对同一望远镜的重叠时段） */
  conflictsOfNight: (nightId: string) => ConflictItem[];
  /** 冲突排程段 id 集合（可传观测夜过滤） */
  conflictIds: (nightId?: string) => Set<string>;
  hasConflict: (sessionId: string) => boolean;
}

function describe(a: ObsSession, b: ObsSession): ConflictItem | null {
  if (a.nightId !== b.nightId || a.telescopeId !== b.telescopeId || a.id === b.id) {
    return null;
  }
  const overlap = overlapMinutes(a.startTime, a.endTime, b.startTime, b.endTime);
  if (overlap <= 0) {
    return null;
  }
  const overlapStart = a.startTime > b.startTime ? a.startTime : b.startTime;
  return {
    sessionId: a.id,
    otherId: b.id,
    nightId: a.nightId,
    telescopeId: a.telescopeId,
    overlapMinutes: overlap,
    overlapText: `${overlapStart} 起重叠 ${overlap} 分钟`,
  };
}

/** 输入设备与时段区间即返回冲突排程段数组；被排程段列表与设备分配视图消费 */
export function useConflictCheck(): ConflictCheckApi {
  const sessions = useSessionStore((s) => s.sessions);

  const findConflicts = useCallback(
    (input: ConflictCheckInput): ConflictItem[] => {
      const candidate: ObsSession = {
        id: input.ignoreSessionId ?? '__candidate__',
        nightId: input.nightId,
        targetId: '',
        startTime: input.startTime,
        endTime: input.endTime,
        telescopeId: input.telescopeId,
        instrumentId: '',
        filterSlot: '',
        plannedFrames: 0,
        status: '待执行',
        schemaVersion: SCHEMA_VERSION,
      };
      return sessions
        .filter((session) => session.id !== input.ignoreSessionId)
        .map((session) => describe(candidate, session))
        .filter((item): item is ConflictItem => item !== null);
    },
    [sessions],
  );

  const conflictsOfNight = useCallback(
    (nightId: string): ConflictItem[] => {
      const scoped = sessions.filter((session) => session.nightId === nightId);
      const result: ConflictItem[] = [];
      scoped.forEach((a) => {
        scoped.forEach((b) => {
          const item = describe(a, b);
          if (item && !result.some((existing) => existing.sessionId === item.otherId && existing.otherId === item.sessionId)) {
            result.push(item);
          }
        });
      });
      return result;
    },
    [sessions],
  );

  const conflictIds = useCallback(
    (nightId?: string): Set<string> => {
      const ids = new Set<string>();
      const scoped = nightId ? sessions.filter((session) => session.nightId === nightId) : sessions;
      scoped.forEach((a) => {
        scoped.forEach((b) => {
          const item = describe(a, b);
          if (item) {
            ids.add(a.id);
            ids.add(b.id);
          }
        });
      });
      return ids;
    },
    [sessions],
  );

  const hasConflict = useCallback((sessionId: string) => conflictIds().has(sessionId), [conflictIds]);

  return { findConflicts, conflictsOfNight, conflictIds, hasConflict };
}
