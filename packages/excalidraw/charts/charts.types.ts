import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

export type ChartElements = readonly NonDeletedExcalidrawElement[];

export interface Spreadsheet {
  title: string | null;
  labels: string[] | null;
  series: SpreadsheetSeries[];
}

export interface SpreadsheetSeries {
  title: string | null;
  values: number[];
}

export interface SpreadsheetTable {
  rows: string[][];
}

export type ParseSpreadsheetResult =
  | { ok: false; reason: string }
  | { ok: true; data: Spreadsheet };

export type ParseTableResult =
  | { ok: false; reason: string }
  | { ok: true; data: SpreadsheetTable };
