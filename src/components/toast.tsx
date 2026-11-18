"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertIcon, CheckIcon, cx } from "./ui";

type ToastTone = "success" | "error";
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

/** Floating dark pills, bottom centre. Errors stay until dismissed; success fades after 5s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      if (t.tone === "success") setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="animate-toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-inverse px-4 py-3 text-sm text-inverse-fg shadow-[0_16px_40px_-12px_rgb(0_0_0/0.5)]"
          >
            <span
              className={cx(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                t.tone === "success" ? "bg-success text-inverse" : "bg-danger text-inverse",
              )}
            >
              {t.tone === "success" ? <CheckIcon /> : <AlertIcon />}
            </span>
            <div className="grow">
              <p className="font-medium">{t.title}</p>
              {t.body && <p className="mt-0.5 text-inverse-muted">{t.body}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="-mr-1 grid size-7 place-items-center rounded-full text-inverse-muted hover:text-inverse-fg"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
