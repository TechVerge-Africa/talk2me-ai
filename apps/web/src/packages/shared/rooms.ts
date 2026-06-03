export function generateRoomCode() {
  const segs = [
    "S",
    Math.floor(100 + Math.random() * 900).toString(),
    Array.from({ length: 3 }, () =>
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 30)],
    ).join(""),
  ];
  return segs.join("-");
}

export function roomShareUrl(code: string) {
  if (typeof window === "undefined") return `https://talk2me.ai/room/${code}`;
  return `${window.location.origin}/room/${code}`;
}
