import { useMemo, useState } from "react";
import { FiX, FiRefreshCw, FiMonitor } from "react-icons/fi";
import { WebViewPanelProps } from "../types/props";

const WebViewPanel = ({
  htmlContent = "",
  cssContent = "",
  jsContent = "",
  previewUrl = null,
  runtimeStatus = "idle",
  onClose,
}: WebViewPanelProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const srcDoc = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 8px; font-family: system-ui, sans-serif; }
          ${cssContent}
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          try {
            ${jsContent}
          } catch (error) {
            console.error('Preview Script Error:', error);
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'fixed';
            errorDiv.style.bottom = '0';
            errorDiv.style.left = '0';
            errorDiv.style.right = '0';
            errorDiv.style.backgroundColor = 'rgba(180, 40, 40, 0.85)';
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '8px 12px';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.zIndex = '9999';
            errorDiv.style.fontFamily = 'ui-monospace, monospace';
            errorDiv.textContent = 'Preview Script Error: ' + error.message;
            document.body.appendChild(errorDiv);
          }
        </script>
      </body>
      </html>
    `;
  }, [htmlContent, cssContent, jsContent, refreshKey]);

  return (
    <div className="h-full flex flex-col bg-ink-800">
      <div className="flex-shrink-0 border-b border-ink-500">
        <div className="flex items-center justify-between px-3 h-9">
          <div className="flex items-center gap-2 min-w-0">
            <FiMonitor size={13} className="text-signal flex-shrink-0" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist-400 truncate">
              Live preview
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 rounded text-mist-500 hover:text-mist-100 hover:bg-ink-600 transition-colors"
              title="Refresh preview"
              aria-label="Refresh preview"
            >
              <FiRefreshCw size={13} />
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="p-1.5 rounded text-mist-500 hover:text-mist-100 hover:bg-ink-600 transition-colors"
              title="Close preview"
              aria-label="Close preview"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
        <div className="px-3 pb-2.5">
          <div className="flex items-center gap-2 rounded-md bg-ink-900 border border-ink-500 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-signal flex-shrink-0" />
            <span className="font-mono text-[11px] text-mist-400 truncate">
              {previewUrl ??
                (runtimeStatus === "starting"
                  ? "Installing dependencies…"
                  : "preview://workspace")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white">
        <iframe
          key={refreshKey}
          title="WebView Preview"
          width="100%"
          height="100%"
          src={previewUrl ?? undefined}
          srcDoc={previewUrl ? undefined : srcDoc}
          className="w-full h-full border-0 bg-white"
          sandbox={
            previewUrl
              ? "allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
              : "allow-scripts"
          }
        />
      </div>
    </div>
  );
};

export default WebViewPanel;
