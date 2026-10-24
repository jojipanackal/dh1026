// "JEERA" rendered with figlet (`figlet -f "ANSI Shadow" JEERA`), shown on the
// empty journal screen like the OpenCode start screen. Each row fades and
// rises in with a staggered delay, then the whole mark pulses slowly.

const WORDMARK = `     ██╗███████╗███████╗██████╗  █████╗
     ██║██╔════╝██╔════╝██╔══██╗██╔══██╗
     ██║█████╗  █████╗  ██████╔╝███████║
██   ██║██╔══╝  ██╔══╝  ██╔══██╗██╔══██║
╚█████╔╝███████╗███████╗██║  ██║██║  ██║
 ╚════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝`.split("\n");

export function JeeraWordmark() {
  return (
    <pre
      aria-label="Jeera"
      className="select-none font-mono text-[9px] leading-[1.15] text-muted-foreground sm:text-xs md:text-sm"
    >
      {WORDMARK.map((row, i) => (
        <span
          key={i}
          className="wordmark-row block"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          {row}
        </span>
      ))}
    </pre>
  );
}
