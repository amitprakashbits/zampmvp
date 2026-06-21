import { C, R } from "../theme";

const Bar = ({ w, h = 12, r = 6 }: { w: number | string; h?: number; r?: number }) => (
  <div className="rcv-skel" style={{ width: w, height: h, borderRadius: r, background: C.lineSoft }} />
);

const Box = ({ flex, h }: { flex: string; h: number }) => (
  <div
    style={{
      flex,
      minWidth: 150,
      height: h,
      borderRadius: R.lg,
      background: C.surface,
      border: `1px solid ${C.line}`,
      padding: 15,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}
  >
    <Bar w={90} h={9} />
    <Bar w={70} h={22} r={6} />
  </div>
);

/* A skeleton that mirrors the real dashboard layout, so the swap to live
   content is seamless (perceived ~30% faster than a spinner). */
export function BootSkeleton() {
  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 22px 56px", animation: "rcv-fade .2s ease" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: C.lineSoft }} className="rcv-skel" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Bar w={150} h={20} />
          <Bar w={210} h={9} />
        </div>
        <div style={{ flex: 1 }} />
        <Bar w={260} h={44} r={R.lg} />
      </div>

      {/* control bar */}
      <div style={{ height: 52, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, marginBottom: 16 }} className="rcv-skel" />

      {/* scorecard */}
      <div style={{ display: "flex", gap: 11, marginBottom: 14, flexWrap: "wrap" }}>
        <Box flex="2 1 280px" h={104} />
        <Box flex="1 1 210px" h={104} />
        <Box flex="1 1 150px" h={104} />
        <Box flex="1 1 150px" h={104} />
      </div>

      {/* queue board */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 18 }}>
        <Bar w={260} h={10} />
        <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <Bar w="60%" h={22} r={999} />
              <div style={{ height: 92, borderRadius: R.md, background: C.surfaceAlt, border: `1px solid ${C.line}` }} className="rcv-skel" />
              <div style={{ height: 92, borderRadius: R.md, background: C.surfaceAlt, border: `1px solid ${C.line}` }} className="rcv-skel" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
