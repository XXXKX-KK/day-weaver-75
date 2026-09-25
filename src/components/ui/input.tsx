import * as React from "react";
import { cn, roundedClassesOf } from "@/lib/utils";

/**
 * Pole tekstowe z animowanym pierścieniem na obwódce.
 *
 * Komponent sam owija pole w `.beam-wrap` i przenosi na opakowanie te same
 * klasy `rounded-*`, które ma pole. To jest cały sens jego istnienia:
 * pierścień rysuje się na ::after opakowania i dziedziczy z niego zaokrąglenie,
 * więc gdy opakowanie ma inne zaokrąglenie niż pole, pierścień odkleja się od
 * krawędzi. Ręcznie pisane opakowania trafiały w to tylko przy `rounded-2xl`.
 *
 * Wyglądu pola komponent nie narzuca — tło, wysokość i obwódka przychodzą
 * z `className`, tak jak wcześniej.
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Klasy układu dla opakowania (np. `min-w-0 flex-1`), nie dla samego pola. */
  wrapperClassName?: string | undefined;
  wrapperStyle?: React.CSSProperties | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, wrapperStyle, ...props }, ref) => (
    <div
      className={cn("beam-wrap", roundedClassesOf(className), wrapperClassName)}
      style={wrapperStyle}
    >
      <input ref={ref} className={cn("block", className)} {...props} />
    </div>
  ),
);
Input.displayName = "Input";
