interface HighlightMatchProps {
  text: string;
  query: string;
}

export function HighlightMatch({ text, query }: HighlightMatchProps) {
  if (!query.trim()) {
    return <span>{text}</span>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;

  // Simple substring matching
  let searchIndex = 0;
  while (searchIndex < lowerText.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, searchIndex);
    if (matchIndex === -1) break;

    if (matchIndex > lastIndex) {
      parts.push({ text: text.slice(lastIndex, matchIndex), highlight: false });
    }
    parts.push({
      text: text.slice(matchIndex, matchIndex + query.length),
      highlight: true,
    });
    lastIndex = matchIndex + query.length;
    searchIndex = lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  if (parts.length === 0) {
    return <span>{text}</span>;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <span key={i} className="text-accent-primary font-semibold">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}
