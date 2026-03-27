import { r as reactExports, j as jsxRuntimeExports } from "./csv_data_analysis_vendor-react-core.js";
import { T as TabulatorFull } from "./csv_data_analysis_vendor-ui.js";
import { O as getTranslation } from "./csv_data_analysis_app-agent.js";
const TABULATOR_EVENT_TARGET_LOOKUP_WARNING = "Event Target Lookup Error - The row this cell is attached to cannot be found, has the table been reinitialized without being destroyed first?";
let applied$1 = false;
function applyTabulatorInteractionGuard() {
  if (applied$1) return;
  applied$1 = true;
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === "string" && args[0] === TABULATOR_EVENT_TARGET_LOOKUP_WARNING) {
      return;
    }
    originalWarn(...args);
  };
}
const GUARDED_PROPS = [
  { camel: "textAlign", css: "text-align" },
  { camel: "minHeight", css: "min-height" }
];
const GUARDED_CSS_PROPS = new Set(GUARDED_PROPS.map((prop) => prop.css));
let applied = false;
function findDescriptorOwner(prop) {
  const probe = document.createElement("div").style;
  let current = Object.getPrototypeOf(probe);
  while (current) {
    const desc = Object.getOwnPropertyDescriptor(current, prop);
    if (desc == null ? void 0 : desc.set) return [current, desc];
    current = Object.getPrototypeOf(current);
  }
  return null;
}
function findMethodDescriptorOwner(prop) {
  const probe = document.createElement("div").style;
  let current = Object.getPrototypeOf(probe);
  while (current) {
    const desc = Object.getOwnPropertyDescriptor(current, prop);
    if (typeof (desc == null ? void 0 : desc.value) === "function") return [current, desc];
    current = Object.getPrototypeOf(current);
  }
  return null;
}
const isInvalidCssValue = (cssProp, value) => {
  if (value == null || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return true;
    }
    if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
      try {
        return !CSS.supports(cssProp, String(value));
      } catch {
        return false;
      }
    }
    return false;
  }
  if (typeof value !== "string") {
    return true;
  }
  const normalized = value.trim();
  if (!normalized) {
    return true;
  }
  if (/\b(?:undefined|null|NaN)\b/i.test(normalized)) {
    return true;
  }
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    try {
      return !CSS.supports(cssProp, normalized);
    } catch {
      return false;
    }
  }
  return false;
};
function applyTabulatorStyleGuard() {
  if (applied) return;
  applied = true;
  const setPropertyOwner = findMethodDescriptorOwner("setProperty");
  if (setPropertyOwner) {
    const [proto, desc] = setPropertyOwner;
    const originalSetProperty = desc.value;
    Object.defineProperty(proto, "setProperty", {
      ...desc,
      value(property, value, priority) {
        if (GUARDED_CSS_PROPS.has(property) && isInvalidCssValue(property, value)) {
          this.removeProperty(property);
          return;
        }
        originalSetProperty.call(this, property, value, priority);
      }
    });
  }
  for (const { camel: camelProp, css: cssProp } of GUARDED_PROPS) {
    const found = findDescriptorOwner(camelProp);
    if (!found) continue;
    const [proto, desc] = found;
    const origSet = desc.set;
    Object.defineProperty(proto, camelProp, {
      ...desc,
      set(value) {
        if (isInvalidCssValue(cssProp, value)) {
          this.removeProperty(cssProp);
          return;
        }
        origSet.call(this, value);
      }
    });
  }
}
applyTabulatorStyleGuard();
applyTabulatorInteractionGuard();
const DEFAULT_EMPTY_STATE_KEY = "tabulator_empty_state";
const areSortStatesEqual = (left, right) => ((left == null ? void 0 : left.column) ?? null) === right.column && ((left == null ? void 0 : left.direction) ?? "asc") === right.direction;
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const getColumnLetter = (index) => {
  let nextIndex = index;
  let letter = "";
  while (nextIndex >= 0) {
    const remainder = nextIndex % 26;
    letter = String.fromCharCode(remainder + 65) + letter;
    nextIndex = Math.floor(nextIndex / 26) - 1;
  }
  return letter;
};
const calculateColumnWidth = (header, field, data) => {
  const headerLength = header.length * 8 + 30;
  const sampleLength = data.slice(0, 10).reduce((max, row) => {
    const value = row[field];
    return Math.max(max, String(value ?? "").length * 7);
  }, 0);
  return Math.max(120, headerLength, sampleLength);
};
const TABULATOR_LOCALES = {
  English: {
    pagination: {
      page_size: "Rows",
      page_title: "Show Page",
      first: "First",
      first_title: "First Page",
      last: "Last",
      last_title: "Last Page",
      prev: "Prev",
      prev_title: "Previous Page",
      next: "Next",
      next_title: "Next Page",
      all: "All",
      counter: {
        showing: "Showing",
        of: "of",
        rows: "rows",
        pages: "pages"
      }
    }
  },
  Mandarin: {
    pagination: {
      page_size: "每页",
      page_title: "跳转页码",
      first: "首页",
      first_title: "第一页",
      last: "末页",
      last_title: "最后一页",
      prev: "上一页",
      prev_title: "上一页",
      next: "下一页",
      next_title: "下一页",
      all: "全部",
      counter: {
        showing: "显示",
        of: "/",
        rows: "行",
        pages: "页"
      }
    }
  },
  Malay: {
    pagination: {
      page_size: "Baris",
      page_title: "Pergi ke halaman",
      first: "Pertama",
      first_title: "Halaman pertama",
      last: "Akhir",
      last_title: "Halaman terakhir",
      prev: "Sebelumnya",
      prev_title: "Halaman sebelumnya",
      next: "Seterusnya",
      next_title: "Halaman seterusnya",
      all: "Semua",
      counter: {
        showing: "Memaparkan",
        of: "daripada",
        rows: "baris",
        pages: "halaman"
      }
    }
  },
  Japanese: {
    pagination: {
      page_size: "行数",
      page_title: "ページを表示",
      first: "最初",
      first_title: "最初のページ",
      last: "最後",
      last_title: "最後のページ",
      prev: "前へ",
      prev_title: "前のページ",
      next: "次へ",
      next_title: "次のページ",
      all: "全て",
      counter: {
        showing: "表示",
        of: "/",
        rows: "行",
        pages: "ページ"
      }
    }
  }
};
const localeKeyByLanguage = {
  English: "en",
  Mandarin: "zh-cn",
  Malay: "ms",
  Japanese: "ja"
};
const buildColumns = (columns, data, displayColumnLabels, annotatedColumns) => [
  {
    title: "#",
    formatter: (cell) => {
      const rowPosition = cell.getRow().getPosition(true);
      return rowPosition === false ? "" : String(rowPosition);
    },
    cssClass: "raw-data-tabulator__index-column",
    headerSort: false,
    resizable: false,
    frozen: true,
    hozAlign: "center",
    headerHozAlign: "center",
    width: 60,
    minWidth: 60,
    maxWidth: 60
  },
  ...columns.map((column, index) => {
    const displayLabel = (displayColumnLabels == null ? void 0 : displayColumnLabels[column]) ?? column;
    const badge = (annotatedColumns == null ? void 0 : annotatedColumns.has(column)) ? " ✏" : "";
    return {
      title: `${getColumnLetter(index)} - ${displayLabel}${badge}`,
      field: column,
      hozAlign: "left",
      headerHozAlign: "left",
      minWidth: 120,
      width: calculateColumnWidth(displayLabel, column, data),
      tooltip: (_event, cell) => String(cell.getValue() ?? ""),
      formatter: (cell) => {
        const rawValue = String(cell.getValue() ?? "");
        const escapedValue = escapeHtml(rawValue);
        return `<span class="raw-data-tabulator__cell-value" title="${escapedValue}">${escapedValue}</span>`;
      }
    };
  })
];
const TabulatorTable = ({
  data,
  columns,
  displayColumnLabels,
  pageSize,
  tableKey,
  language,
  variant = "raw-explorer",
  pageSizeOptions,
  sortState,
  onSortChange,
  containerClassName,
  emptyStateText,
  annotatedColumns,
  onColumnHeaderClick
}) => {
  const resolvedEmptyStateText = emptyStateText ?? getTranslation(DEFAULT_EMPTY_STATE_KEY, language);
  const containerRef = reactExports.useRef(null);
  const tableRef = reactExports.useRef(null);
  const tableBuiltRef = reactExports.useRef(false);
  const sortStateRef = reactExports.useRef(sortState);
  const onSortChangeRef = reactExports.useRef(onSortChange);
  const onColumnHeaderClickRef = reactExports.useRef(onColumnHeaderClick);
  const hasColumns = columns.length > 0;
  const pageSizeOptionsKey = (pageSizeOptions == null ? void 0 : pageSizeOptions.join(",")) ?? "";
  const columnDefinitions = reactExports.useMemo(
    () => buildColumns(columns, data, displayColumnLabels, annotatedColumns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, data, displayColumnLabels, annotatedColumns == null ? void 0 : annotatedColumns.size]
  );
  const columnSignature = reactExports.useMemo(
    () => columnDefinitions.map((definition) => `${String(definition.field ?? "")}:${String(definition.title ?? "")}`).join("|"),
    [columnDefinitions]
  );
  const latestDataRef = reactExports.useRef(data);
  const latestColumnDefinitionsRef = reactExports.useRef(columnDefinitions);
  const latestColumnSignatureRef = reactExports.useRef(columnSignature);
  const appliedColumnSignatureRef = reactExports.useRef(null);
  latestDataRef.current = data;
  latestColumnDefinitionsRef.current = columnDefinitions;
  latestColumnSignatureRef.current = columnSignature;
  const updateGenerationRef = reactExports.useRef(0);
  const applyTableData = (table) => {
    var _a, _b, _c, _d;
    if (!table || !tableBuiltRef.current) {
      return;
    }
    const generation = ++updateGenerationRef.current;
    (_a = table.blockRedraw) == null ? void 0 : _a.call(table);
    try {
      if (appliedColumnSignatureRef.current !== latestColumnSignatureRef.current) {
        (_b = table.setColumns) == null ? void 0 : _b.call(table, latestColumnDefinitionsRef.current);
        appliedColumnSignatureRef.current = latestColumnSignatureRef.current;
      }
      const setDataResult = (_c = table.setData) == null ? void 0 : _c.call(table, latestDataRef.current);
      Promise.resolve(setDataResult).catch(() => void 0).finally(() => {
        var _a2, _b2;
        if (updateGenerationRef.current !== generation || tableRef.current !== table || !tableBuiltRef.current) {
          return;
        }
        (_a2 = table.restoreRedraw) == null ? void 0 : _a2.call(table);
        (_b2 = table.redraw) == null ? void 0 : _b2.call(table, true);
      });
    } catch (error) {
      (_d = table.restoreRedraw) == null ? void 0 : _d.call(table);
      throw error;
    }
  };
  const applySortState = (table) => {
    var _a, _b, _c, _d, _e;
    if (!table || !tableBuiltRef.current) {
      return;
    }
    const currentSorter = (_b = (_a = table.getSorters) == null ? void 0 : _a.call(table)) == null ? void 0 : _b[0];
    const currentState = (currentSorter == null ? void 0 : currentSorter.field) && (currentSorter.dir === "asc" || currentSorter.dir === "desc") ? { column: currentSorter.field, direction: currentSorter.dir } : { column: null, direction: "asc" };
    if (areSortStatesEqual(sortStateRef.current, currentState)) {
      return;
    }
    if ((_c = sortStateRef.current) == null ? void 0 : _c.column) {
      (_d = table.setSort) == null ? void 0 : _d.call(table, sortStateRef.current.column, sortStateRef.current.direction);
      return;
    }
    (_e = table.clearSort) == null ? void 0 : _e.call(table);
  };
  reactExports.useEffect(() => {
    sortStateRef.current = sortState;
  }, [sortState]);
  reactExports.useEffect(() => {
    onSortChangeRef.current = onSortChange;
  }, [onSortChange]);
  reactExports.useEffect(() => {
    onColumnHeaderClickRef.current = onColumnHeaderClick;
  }, [onColumnHeaderClick]);
  reactExports.useEffect(() => {
    var _a;
    const containerElement = containerRef.current;
    if (!hasColumns || !containerElement) {
      return void 0;
    }
    const localeKey = localeKeyByLanguage[language];
    const initialSort = ((_a = sortStateRef.current) == null ? void 0 : _a.column) ? [{ column: sortStateRef.current.column, dir: sortStateRef.current.direction }] : false;
    tableBuiltRef.current = false;
    const table = new TabulatorFull(containerElement, {
      data,
      columns: columnDefinitions,
      // Ensure all columns (including any Tabulator creates internally)
      // have a valid hozAlign so the library never writes empty textAlign.
      columnDefaults: { hozAlign: "left", headerHozAlign: "left" },
      layout: "fitDataTable",
      layoutColumnsOnNewData: false,
      height: "100%",
      placeholder: resolvedEmptyStateText,
      pagination: true,
      paginationMode: "local",
      paginationSize: pageSize,
      paginationSizeSelector: pageSizeOptions && pageSizeOptions.length > 0 ? pageSizeOptions : false,
      paginationCounter: "rows",
      initialSort,
      columnHeaderSortMulti: false,
      selectableRows: 1,
      selectableRowsPersistence: false,
      langs: {
        [localeKey]: TABULATOR_LOCALES[language]
      },
      locale: localeKey,
      rowClick: (_event, row) => {
        row.toggleSelect();
      }
    });
    tableRef.current = table;
    appliedColumnSignatureRef.current = columnSignature;
    table.on("tableBuilt", () => {
      if (tableRef.current !== table) {
        return;
      }
      tableBuiltRef.current = true;
      applyTableData(table);
      applySortState(table);
    });
    if (onSortChangeRef.current) {
      table.on("dataSorted", (sorters) => {
        var _a2, _b;
        const primarySorter = Array.isArray(sorters) ? sorters[0] : void 0;
        if ((primarySorter == null ? void 0 : primarySorter.field) && (primarySorter.dir === "asc" || primarySorter.dir === "desc")) {
          const nextState2 = { column: primarySorter.field, direction: primarySorter.dir };
          if (!areSortStatesEqual(sortStateRef.current, nextState2)) {
            (_a2 = onSortChangeRef.current) == null ? void 0 : _a2.call(onSortChangeRef, nextState2);
          }
          return;
        }
        const nextState = { column: null, direction: "asc" };
        if (!areSortStatesEqual(sortStateRef.current, nextState)) {
          (_b = onSortChangeRef.current) == null ? void 0 : _b.call(onSortChangeRef, nextState);
        }
      });
    }
    table.on("headerDblClick", (_e, column) => {
      var _a2, _b;
      const field = (_a2 = column.getField) == null ? void 0 : _a2.call(column);
      const element = (_b = column.getElement) == null ? void 0 : _b.call(column);
      if (field && element && onColumnHeaderClickRef.current) {
        onColumnHeaderClickRef.current(field, element.getBoundingClientRect());
      }
    });
    return () => {
      updateGenerationRef.current += 1;
      tableBuiltRef.current = false;
      appliedColumnSignatureRef.current = null;
      table.destroy();
      if (tableRef.current === table) {
        tableRef.current = null;
      }
      containerElement.innerHTML = "";
    };
  }, [
    resolvedEmptyStateText,
    hasColumns,
    language,
    pageSize,
    pageSizeOptionsKey,
    tableKey
  ]);
  reactExports.useEffect(() => {
    const table = tableRef.current;
    if (!table) {
      return;
    }
    applyTableData(table);
  }, [columnDefinitions, data]);
  reactExports.useEffect(() => {
    const table = tableRef.current;
    applySortState(table);
  }, [sortState]);
  if (columns.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: resolvedEmptyStateText });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `raw-data-tabulator tabulator-table--${variant} h-full w-full ${containerClassName ?? ""}`.trim(), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: containerRef, className: "h-full w-full" }, tableKey ?? "tabulator-root") });
};
export {
  TabulatorTable as T
};
