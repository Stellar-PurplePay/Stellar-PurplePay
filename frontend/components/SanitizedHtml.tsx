import { sanitizeRichHtml } from "@/lib/sanitize";

type SanitizedHtmlProps = {
  html: string;
  as?: "span" | "div";
  className?: string;
  nonce?: string;
};

export default function SanitizedHtml({ html, as = "span", className, nonce }: SanitizedHtmlProps) {
  const sanitizedHtml = sanitizeRichHtml(html);
  const Element = as === "div" ? "div" : "span";

  return <Element className={className} nonce={nonce} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}