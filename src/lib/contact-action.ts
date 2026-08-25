export type ContactActionType = "call" | "message" | "both" | "none";

const CALL_KEYWORDS: string[] = [
  "zadzwoń",
  "zadzwonić",
  "zadzwon",
  "zadzwonic",
  "dzwoń",
  "dzwonić",
  "dzwon",
  "dzwonic",
  "zatelefonuj",
  "zatelefonować",
  "telefon do",
  "telefonuj",
  "oddzwoń",
  "oddzwonić",
  "oddzwon",
  "oddzwonic",
  "wykręć numer",
  "wykrec numer",
];

const MESSAGE_KEYWORDS: string[] = [
  "napisz",
  "napisać",
  "napisac",
  "napiszę",
  "napisze",
  "odpisz",
  "odpisać",
  "odpisac",
  "wyślij",
  "wyslij",
  "wyślij wiadomość",
  "wyslij wiadomosc",
  "wyślij sms",
  "wyslij sms",
  "sms do",
  "sms",
  "messenger",
  "whatsapp",
  "wyślij whatsapp",
  "wyslij whatsapp",
  "wyślij messenger",
  "wyslij messenger",
];

const AMBIGUOUS_KEYWORDS: string[] = [
  "odezwij się",
  "odezwij sie",
  "odezwać się",
  "odezwac sie",
  "skontaktuj się",
  "skontaktuj sie",
  "skontaktować się",
  "skontaktowac sie",
  "daj znać",
  "daj znac",
  "złap kontakt",
  "zlap kontakt",
  "dogadaj się",
  "dogadaj sie",
  "umów się",
  "umow sie",
];

function titleContains(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function detectContactAction(title: string): ContactActionType {
  const isAmbiguous = titleContains(title, AMBIGUOUS_KEYWORDS);
  if (isAmbiguous) return "both";

  const isCall = titleContains(title, CALL_KEYWORDS);
  const isMessage = titleContains(title, MESSAGE_KEYWORDS);

  if (isCall && isMessage) return "both";
  if (isCall) return "call";
  if (isMessage) return "message";
  return "none";
}

export function effectiveContactAction(
  title: string,
  manual: ContactActionType | null | undefined,
): ContactActionType {
  if (manual != null) return manual;
  return detectContactAction(title);
}

export function openDialer(): void {
  const a = document.createElement("a");
  a.href = "tel:";
  a.click();
}

export function openSms(): void {
  const a = document.createElement("a");
  a.href = "sms:";
  a.click();
}

export function openWhatsApp(): void {
  window.open("https://wa.me/", "_system");
}

export function openMessenger(): void {
  window.open("https://m.me/", "_system");
}
