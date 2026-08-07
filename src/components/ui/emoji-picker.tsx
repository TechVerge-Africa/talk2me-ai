import React, { useMemo, useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  initialQuery?: string;
}

// A curated but wide selection of emojis grouped by category.
const EMOJIS: { category: string; list: string[] }[] = [
  {
    category: 'Smileys',
    list: [
      '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡'
    ]
  },
  {
    category: 'People',
    list: [
      '👋','🤚','🖐️','✋','🫱','🫲','🫶','🙏','👏','🙌','🤝','👍','👎','👌','✌️','🤞','🫰','🤟','🤘','🤙','🖖','👈','👉','👆','👇','☝️','✍️','💪','🦾','🦵','🦿'
    ]
  },
  {
    category: 'Gestures',
    list: ['🫡','👏','👏🏻','👏🏼','👏🏽','👏🏾','👏🏿','🙏','🙏🏻','🙏🏼','🙏🏽','🙏🏾','🙏🏿']
  },
  {
    category: 'Hearts',
    list: ['❤️','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖']
  },
  {
    category: 'Objects',
    list: ['🎉','🎊','🎈','✨','🔥','⭐','🌟','💫','💥','🌈','☀️','🌙','⚡','💡','🎁','📣','🛎️','🔔']
  },
  {
    category: 'Food',
    list: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬']
  },
  {
    category: 'Animals',
    list: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆']
  },
  {
    category: 'Symbols',
    list: ['✅','❌','⚠️','🚫','ℹ️','❗','❓','♻️','🔒','🔓','🔑','🔍']
  },
  {
    category: 'Travel',
    list: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','✈️','🛫','🛬','🚀','🚁','🚂']
  }
];

export function EmojiPicker({ onSelect, onClose, initialQuery = '' }: EmojiPickerProps) {
  const [query, setQuery] = useState(initialQuery);

  const flat = useMemo(() => EMOJIS.flatMap(g => g.list), []);

  const results = useMemo(() => {
    if (!query.trim()) return flat;
    const q = query.toLowerCase();
    return flat.filter(e => e.includes(q));
  }, [flat, query]);

  return (
    <div className="w-[360px] max-w-full bg-card p-3 rounded-2xl ring-1 ring-border shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search emoji" className="flex-1 px-3 py-2 rounded-lg bg-muted/30 border border-border outline-none" />
        <button onClick={() => onClose && onClose()} className="px-3 py-2 rounded-lg bg-muted/30">Close</button>
      </div>

      <div className="grid grid-cols-8 gap-2 max-h-56 overflow-auto p-1">
        {results.map((e, i) => (
          <button key={`${e}-${i}`} onClick={() => onSelect(e)} className="text-2xl p-2 rounded-lg hover:bg-muted/50">{e}</button>
        ))}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">Tip: search by part of emoji name (like &apos;heart&apos; or &apos;smile&apos;).</div>
    </div>
  );
}
