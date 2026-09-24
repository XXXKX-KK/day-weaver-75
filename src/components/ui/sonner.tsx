import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toasts in the app's own skin: dark glass, card rounding, and the same
 * animated ring the focused inputs use (.beam-ring shares its definition with
 * .beam-wrap — see styles.css). Sonner keeps its own slide+fade entrance.
 *
 * Colours come from --primary / --destructive, so a toast follows whatever
 * accent the user picked instead of hardcoding one.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: [
            "group toast beam-ring glass",
            "group-[.toaster]:rounded-2xl",
            "group-[.toaster]:border-0",
            "group-[.toaster]:bg-[var(--glass-bg)]",
            "group-[.toaster]:backdrop-blur-xl",
            "group-[.toaster]:text-foreground",
            "group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
          ].join(" "),
          title: "group-[.toast]:text-[14px] group-[.toast]:font-semibold",
          description: "group-[.toast]:text-[13px] group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-foreground/10 group-[.toast]:text-muted-foreground",
          error: "beam-ring-danger",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
