export default function BlockSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 12,
        background: "#eee",
        animation: "pulse 1.2s infinite",
      }}
    />
  );
}
