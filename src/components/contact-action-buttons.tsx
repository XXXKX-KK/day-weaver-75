import { useState } from "react";
import { MessageSquare, Phone, PhoneCall, Settings2 } from "lucide-react";
import {
  effectiveContactAction,
  openDialer,
  openSms,
  openWhatsApp,
  openMessenger,
  type ContactActionType,
} from "@/lib/contact-action";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  manualAction: ContactActionType | null;
  onSetManual?: (action: ContactActionType | null) => void;
};

export function ContactActionButtons({ title, manualAction, onSetManual }: Props) {
  const action = effectiveContactAction(title, manualAction);
  const [showMessagePicker, setShowMessagePicker] = useState(false);
  const [showManualPicker, setShowManualPicker] = useState(false);

  if (action === "none" && !onSetManual) return null;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {(action === "call" || action === "both") && (
        <button
          onClick={openDialer}
          aria-label="Zadzwoń"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary transition-transform active:scale-90"
        >
          <PhoneCall className="h-4 w-4" />
        </button>
      )}

      {(action === "message" || action === "both") && (
        <div className="relative">
          <button
            onClick={() => setShowMessagePicker((p) => !p)}
            aria-label="Wyślij wiadomość"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary transition-transform active:scale-90"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          {showMessagePicker && (
            <MessagePickerPopover onClose={() => setShowMessagePicker(false)} />
          )}
        </div>
      )}

      {onSetManual && (
        <div className="relative">
          <button
            onClick={() => setShowManualPicker((p) => !p)}
            aria-label="Ustaw typ akcji"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-transform active:scale-90",
              manualAction != null
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground opacity-60 hover:opacity-100",
            )}
          >
            <Settings2 className="h-3 w-3" />
          </button>
          {showManualPicker && (
            <ManualPickerPopover
              current={manualAction}
              onSelect={(v) => {
                onSetManual(v);
                setShowManualPicker(false);
              }}
              onClose={() => setShowManualPicker(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MessagePickerPopover({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-2xl border border-border bg-popover p-1 shadow-lg">
        <PickerItem
          label="SMS"
          onClick={() => {
            openSms();
            onClose();
          }}
        />
        <PickerItem
          label="WhatsApp"
          onClick={() => {
            openWhatsApp();
            onClose();
          }}
        />
        <PickerItem
          label="Messenger"
          onClick={() => {
            openMessenger();
            onClose();
          }}
        />
      </div>
    </>
  );
}

function ManualPickerPopover({
  current,
  onSelect,
  onClose,
}: {
  current: ContactActionType | null;
  onSelect: (v: ContactActionType | null) => void;
  onClose: () => void;
}) {
  const options: { value: ContactActionType | null; label: string; icon: React.ReactNode }[] = [
    { value: null, label: "Auto", icon: null },
    { value: "call", label: "Telefon", icon: <Phone className="h-3.5 w-3.5" /> },
    { value: "message", label: "Wiadomość", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { value: "both", label: "Oba", icon: <PhoneCall className="h-3.5 w-3.5" /> },
    { value: "none", label: "Brak", icon: null },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-2xl border border-border bg-popover p-1 shadow-lg">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
              current === opt.value
                ? "bg-primary-soft text-primary font-medium"
                : "text-foreground hover:bg-elevated",
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}

function PickerItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-elevated"
    >
      {label}
    </button>
  );
}
