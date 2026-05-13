import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — SignBridge Live` },
      { name: "description", content: "Live AI translation room with captions and sign recognition." },
    ],
  }),
  component: RoomLayout,
});

function RoomLayout() {
  return <Outlet />;
}
