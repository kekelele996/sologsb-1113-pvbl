import { create } from 'zustand';
import { db, deleteRow, persistRow } from '../hooks/usePersistentStore';
import { uid } from '../utils/id';
import type { FieldOfView, Instrument, Telescope, TelescopeStatus, TerminalType } from '../types';

export interface TelescopeInput {
  code: string;
  apertureMm: number;
  focalLengthMm: number;
  mount: string;
  terminals: TerminalType[];
  maxPayloadKg: number;
  status: TelescopeStatus;
}

export interface InstrumentInput {
  model: string;
  terminalType: TerminalType;
  pixelSizeUm: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  readNoiseE: number;
  telescopeCode: string;
}

interface EquipmentState {
  telescopes: Telescope[];
  instruments: Instrument[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addTelescope: (input: TelescopeInput) => Promise<Telescope>;
  updateTelescope: (id: string, patch: Partial<TelescopeInput>) => Promise<void>;
  removeTelescope: (id: string) => Promise<void>;
  addInstrument: (input: InstrumentInput) => Promise<Instrument>;
  updateInstrument: (id: string, patch: Partial<InstrumentInput>) => Promise<void>;
  removeInstrument: (id: string) => Promise<void>;
  /** 按靶面与焦距换算视场角 */
  fieldOfView: (telescopeId: string, instrumentId: string) => FieldOfView;
}

const RAD = Math.PI / 180;

/** 望远镜与终端分配（含视场角换算） */
export const useEquipmentStore = create<EquipmentState>()((set, get) => ({
  telescopes: [],
  instruments: [],
  hydrated: false,

  hydrate: async () => {
    const [telescopes, instruments] = await Promise.all([db.telescopes.orderBy('code').toArray(), db.instruments.toArray()]);
    set({ telescopes, instruments, hydrated: true });
  },

  addTelescope: async (input) => {
    const telescope: Telescope = {
      id: uid('tel'),
      code: input.code.trim(),
      apertureMm: Number(input.apertureMm) || 0,
      focalLengthMm: Number(input.focalLengthMm) || 0,
      mount: input.mount.trim(),
      terminals: input.terminals.length ? input.terminals : ['CMOS 相机'],
      maxPayloadKg: Number(input.maxPayloadKg) || 0,
      status: input.status,
    };
    await persistRow('telescopes', telescope);
    set({ telescopes: [...get().telescopes, telescope].sort((a, b) => a.code.localeCompare(b.code)) });
    return telescope;
  },

  updateTelescope: async (id, patch) => {
    const current = get().telescopes.find((telescope) => telescope.id === id);
    if (!current) return;
    const next: Telescope = { ...current, ...patch };
    await persistRow('telescopes', next);
    set({ telescopes: get().telescopes.map((telescope) => (telescope.id === id ? next : telescope)) });
  },

  removeTelescope: async (id) => {
    await deleteRow('telescopes', id);
    set({ telescopes: get().telescopes.filter((telescope) => telescope.id !== id) });
  },

  addInstrument: async (input) => {
    const instrument: Instrument = {
      id: uid('ins'),
      model: input.model.trim(),
      terminalType: input.terminalType,
      pixelSizeUm: Number(input.pixelSizeUm) || 0,
      sensorWidthMm: Number(input.sensorWidthMm) || 0,
      sensorHeightMm: Number(input.sensorHeightMm) || 0,
      readNoiseE: Number(input.readNoiseE) || 0,
      telescopeCode: input.telescopeCode,
    };
    await persistRow('instruments', instrument);
    set({ instruments: [...get().instruments, instrument] });
    return instrument;
  },

  updateInstrument: async (id, patch) => {
    const current = get().instruments.find((instrument) => instrument.id === id);
    if (!current) return;
    const next: Instrument = { ...current, ...patch };
    await persistRow('instruments', next);
    set({ instruments: get().instruments.map((instrument) => (instrument.id === id ? next : instrument)) });
  },

  removeInstrument: async (id) => {
    await deleteRow('instruments', id);
    set({ instruments: get().instruments.filter((instrument) => instrument.id !== id) });
  },

  fieldOfView: (telescopeId, instrumentId) => {
    const telescope = get().telescopes.find((item) => item.id === telescopeId);
    const instrument = get().instruments.find((item) => item.id === instrumentId);
    if (!telescope || !instrument || telescope.focalLengthMm <= 0) {
      return { widthDeg: 0, heightDeg: 0, arcsecPerPixel: 0, text: '设备信息不完整，无法换算视场角' };
    }
    const widthDeg = (2 * Math.atan(instrument.sensorWidthMm / (2 * telescope.focalLengthMm))) / RAD;
    const heightDeg = (2 * Math.atan(instrument.sensorHeightMm / (2 * telescope.focalLengthMm))) / RAD;
    const arcsecPerPixel = (instrument.pixelSizeUm / telescope.focalLengthMm) * 206.265;
    return {
      widthDeg: Number(widthDeg.toFixed(2)),
      heightDeg: Number(heightDeg.toFixed(2)),
      arcsecPerPixel: Number(arcsecPerPixel.toFixed(2)),
      text: `${widthDeg.toFixed(2)}° × ${heightDeg.toFixed(2)}°（${arcsecPerPixel.toFixed(2)}″/px）`,
    };
  },
}));
