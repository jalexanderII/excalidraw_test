import type { ChartType } from "@excalidraw/element/types";

import { renderBarChart } from "./charts.bar";
import { renderLineChart } from "./charts.line";
import {
  tryParseCells,
  tryParseNumber,
  tryParseTable,
  tryParseSpreadsheet,
} from "./charts.parse";
import { renderRadarChart } from "./charts.radar";
import { renderTable } from "./charts.table";

import type { ChartElements, Spreadsheet } from "./charts.types";

export {
  type ParseTableResult,
  type ParseSpreadsheetResult,
  type SpreadsheetTable,
  type Spreadsheet,
  type SpreadsheetSeries,
  type ChartElements,
} from "./charts.types";

export { isSpreadsheetValidForChartType } from "./charts.helpers";
export { tryParseCells, tryParseNumber, tryParseSpreadsheet, tryParseTable };
export { renderTable };

export const renderSpreadsheet = (
  chartType: ChartType,
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
  colorSeed?: number,
): ChartElements | null => {
  if (chartType === "line") {
    return renderLineChart(spreadsheet, x, y, colorSeed);
  }
  if (chartType === "radar") {
    return renderRadarChart(spreadsheet, x, y, colorSeed);
  }
  return renderBarChart(spreadsheet, x, y, colorSeed);
};
