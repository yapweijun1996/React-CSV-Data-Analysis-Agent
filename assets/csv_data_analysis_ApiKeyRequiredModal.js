import { r as reactExports, j as jsxRuntimeExports } from "./csv_data_analysis_vendor-react-core.js";
import { u as useAppStore, d as IconApiKeyRequired } from "./csv_data_analysis_index.js";
import { O as getTranslation } from "./csv_data_analysis_app-agent.js";
import "./csv_data_analysis_vendor-data.js";
import "./csv_data_analysis_vendor-monaco.js";
import "./csv_data_analysis_vendor-misc.js";
import "./csv_data_analysis_vendor-state.js";
import "./csv_data_analysis_app-reporting.js";
import "./csv_data_analysis_vendor-ai-sdk.js";
import "./csv_data_analysis_app-ai.js";
import "./csv_data_analysis_app-agent-planning.js";
import "./csv_data_analysis_vendor-storage.js";
const ApiKeyRequiredModal = () => {
  const isOpen = useAppStore((s) => s.isApiKeyRequiredModalOpen);
  const setModalOpen = useAppStore((s) => s.setIsApiKeyRequiredModalOpen);
  const language = useAppStore((s) => s.settings.language);
  const dialogRef = reactExports.useRef(null);
  const handleClose = reactExports.useCallback(() => setModalOpen(false), [setModalOpen]);
  reactExports.useEffect(() => {
    var _a;
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    (_a = dialogRef.current) == null ? void 0 : _a.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
      onClick: handleClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          ref: dialogRef,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "api-key-required-title",
          "aria-describedby": "api-key-required-desc",
          tabIndex: -1,
          onClick: (e) => e.stopPropagation(),
          className: "bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col outline-none",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 pt-8 pb-2 flex flex-col items-center text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(IconApiKeyRequired, { className: "w-14 h-14 text-slate-400 mb-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "api-key-required-title", className: "text-lg font-semibold text-slate-800", children: getTranslation("api_key_required_modal_title", language) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { id: "api-key-required-desc", className: "mt-3 text-sm text-slate-500 leading-relaxed", children: getTranslation("api_key_required_modal_message", language) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-6 py-5 flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleClose,
                className: "px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none",
                children: getTranslation("api_key_required_modal_ok", language)
              }
            ) })
          ]
        }
      )
    }
  );
};
export {
  ApiKeyRequiredModal
};
