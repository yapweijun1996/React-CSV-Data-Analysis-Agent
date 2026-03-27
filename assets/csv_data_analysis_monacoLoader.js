const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./csv_data_analysis_vendor-react-core.js","./csv_data_analysis_vendor-data.js","./csv_data_analysis_vendor-misc.js","./csv_data_analysis_vendor-ai-sdk.js","./csv_data_analysis_app-reporting.js","./csv_data_analysis_vendor-storage.js"])))=>i.map(i=>d[i]);
import { a7 as __vitePreload } from "./csv_data_analysis_app-agent.js";
import "./csv_data_analysis_vendor-data.js";
import "./csv_data_analysis_app-ai.js";
import "./csv_data_analysis_vendor-ai-sdk.js";
import "./csv_data_analysis_vendor-misc.js";
import "./csv_data_analysis_app-reporting.js";
import "./csv_data_analysis_app-agent-planning.js";
import "./csv_data_analysis_vendor-storage.js";
let configured = false;
async function ensureMonacoConfigured() {
  if (configured) return;
  const [
    { loader },
    monaco,
    editorWorkerMod,
    jsonWorkerMod,
    cssWorkerMod,
    htmlWorkerMod,
    tsWorkerMod
  ] = await Promise.all([
    __vitePreload(() => import("./csv_data_analysis_vendor-react-core.js").then((n) => n.i), true ? __vite__mapDeps([0,1,2,3,4,5]) : void 0, import.meta.url),
    __vitePreload(() => import("./csv_data_analysis_vendor-monaco.js").then((n) => n.e), true ? __vite__mapDeps([2,1,3,4,5]) : void 0, import.meta.url),
    __vitePreload(() => import("./csv_data_analysis_vendor-monaco.js").then((n) => n.a), true ? __vite__mapDeps([2,1,3,4,5]) : void 0, import.meta.url),
    __vitePreload(() => import("./csv_data_analysis_vendor-monaco.js").then((n) => n.j), true ? __vite__mapDeps([2,1,3,4,5]) : void 0, import.meta.url),
    __vitePreload(() => import("./csv_data_analysis_vendor-monaco.js").then((n) => n.c), true ? __vite__mapDeps([2,1,3,4,5]) : void 0, import.meta.url),
    __vitePreload(() => import("./csv_data_analysis_vendor-monaco.js").then((n) => n.h), true ? __vite__mapDeps([2,1,3,4,5]) : void 0, import.meta.url),
    __vitePreload(() => import("./csv_data_analysis_vendor-monaco.js").then((n) => n.t), true ? __vite__mapDeps([2,1,3,4,5]) : void 0, import.meta.url)
  ]);
  const EditorWorker = editorWorkerMod.default;
  const JsonWorker = jsonWorkerMod.default;
  const CssWorker = cssWorkerMod.default;
  const HtmlWorker = htmlWorkerMod.default;
  const TsWorker = tsWorkerMod.default;
  const localMonacoEnvironment = {
    getWorker(_workerId, label) {
      if (label === "json") return new JsonWorker();
      if (label === "css" || label === "scss" || label === "less") return new CssWorker();
      if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
      if (label === "typescript" || label === "javascript") return new TsWorker();
      return new EditorWorker();
    }
  };
  const monacoGlobal = self;
  monacoGlobal.MonacoEnvironment = localMonacoEnvironment;
  loader.config({ monaco });
  configured = true;
}
export {
  ensureMonacoConfigured
};
