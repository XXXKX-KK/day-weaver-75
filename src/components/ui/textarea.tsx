import * as React from "react";
import { cn, roundedClassesOf } from "@/lib/utils";

/**
 * Wielolinijkowe pole z tym samym pierścieniem co `Input` — patrz komentarz
 * tam. Apka nie ma dziś ani jednego pola wielolinijkowego; komponent istnieje
 * po to, żeby pierwsze nie zostało dopisane gołym `<textarea>` i nie wypadło
 * z jedynej animacji obwódki.
 *
 * `block` na polu nie jest kosmetyką: domyślnie `inline-block` zostawia pod
 * spodem odstęp na linię bazową, opakowanie jest wtedy wyższe od pola i widać
 * dwa pierścienie zamiast jednego. Klasa z `className` i tak ją nadpisze.
 */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Klasy układu dla opakowania (np. `min-w-0 flex-1`), nie dla samego pola. */
  wrapperClassName?: string | undefined;
  wrapperStyle?: React.CSSProperties | undefined;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, wrapperClassName, wrapperStyle, ...props }, ref) => (
    <div
      className={cn("beam-wrap", roundedClassesOf(className), wrapperClassName)}
      style={wrapperStyle}
    >
      <textarea ref={ref} className={cn("block", className)} {...props} />
    </div>
  ),
);
Textarea.displayName = "Textarea";
