const LOWER_WORDS = ['de', 'del', 'la', 'las', 'los', 'y', 'da', 'dos', 'van', 'von'];

function formatSpanishName(text) {
  if (!text) return text;
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, index) =>
      LOWER_WORDS.includes(word) && index !== 0
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

module.exports = { formatSpanishName };
