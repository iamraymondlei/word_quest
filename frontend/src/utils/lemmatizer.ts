/**
 * English Lemmatizer & Phrase-First Matcher for WordQuest.
 * Handles morphological inflections (plurals, past tense, progressive, etc.)
 * and multi-word phrase matching (e.g., "kinds of" -> "kind of", "nuts" -> "nut", "ruined" -> "ruin").
 */

export interface TokenItem {
  text: string;
  isWord: boolean;
  isPhrase?: boolean;
  matchedWord?: any | null;
}

// Prepositions, articles & auxiliary words that generally do not inflect in phrases
const INVARIABLE_WORDS = new Set([
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'up', 'out', 'down', 'off',
  'about', 'by', 'into', 'from', 'as', 'and', 'or', 'the', 'a', 'an', 'over', 'under'
]);

// Common English irregular verbs and irregular noun plurals
const IRREGULAR_LEMMAS: Record<string, string> = {
  // Verbs (past & participle -> base)
  went: 'go', gone: 'go', came: 'come', saw: 'see', seen: 'see',
  ate: 'eat', eaten: 'eat', took: 'take', taken: 'take', had: 'have',
  has: 'have', was: 'be', were: 'be', been: 'be', is: 'be', are: 'be',
  am: 'be', did: 'do', done: 'do', does: 'do', said: 'say', ran: 'run',
  swam: 'swim', swum: 'swim', flew: 'fly', flown: 'fly', knew: 'know',
  known: 'know', thought: 'think', brought: 'bring', bought: 'buy',
  caught: 'catch', taught: 'teach', felt: 'feel', left: 'leave',
  met: 'meet', sat: 'sit', stood: 'stand', lost: 'lose', paid: 'pay',
  told: 'tell', built: 'build', spent: 'spend', won: 'win', began: 'begin',
  begun: 'begin', drank: 'drink', drunk: 'drink', sang: 'sing', sung: 'sing',
  rang: 'ring', rung: 'ring', sank: 'sink', sunk: 'sink', grew: 'grow',
  grown: 'grow', threw: 'throw', thrown: 'throw', blew: 'blow', blown: 'blow',
  drew: 'draw', drawn: 'draw', fell: 'fall', fallen: 'fall', spoke: 'speak',
  spoken: 'speak', broke: 'break', broken: 'break', chose: 'choose',
  chosen: 'choose', froze: 'freeze', frozen: 'freeze', wore: 'wear',
  worn: 'wear', tore: 'tear', torn: 'tear', rode: 'ride', ridden: 'ride',
  wrote: 'write', written: 'write', drove: 'drive', driven: 'drive',
  hid: 'hide', hidden: 'hide', bit: 'bite', bitten: 'bite', shook: 'shake',
  shaken: 'shake', gave: 'give', given: 'give', forgot: 'forget',
  forgotten: 'forget', got: 'get', gotten: 'get', woke: 'wake', woken: 'wake',
  rose: 'rise', risen: 'rise', shone: 'shine', slept: 'sleep', swept: 'sweep',
  wept: 'weep', crept: 'creep', kept: 'keep', leapt: 'leap', meant: 'mean',
  dreamt: 'dream', burnt: 'burn', learnt: 'learn', smelt: 'smell', spelt: 'spell',
  spilt: 'spill', spoilt: 'spoil', bent: 'bend', lent: 'lend', sent: 'send',
  struck: 'strike', hung: 'hang', dug: 'dig', spun: 'spin', stuck: 'stick',
  swung: 'swing', clung: 'cling', stung: 'sting', flung: 'fling', slung: 'sling',
  wrung: 'wring', shrunk: 'shrink', sprang: 'spring', sprung: 'spring',
  stank: 'stink', stunk: 'stink', bled: 'bleed', fed: 'feed', fled: 'flee',
  led: 'lead', sped: 'speed', held: 'hold', sold: 'sell', heard: 'hear',

  // Nouns (irregular plurals -> singular)
  children: 'child', people: 'person', feet: 'foot', teeth: 'tooth',
  mice: 'mouse', geese: 'goose', men: 'man', women: 'woman', oxen: 'ox',
  leaves: 'leaf', halves: 'half', knives: 'knife', wives: 'wife', lives: 'life',
  wolves: 'wolf', thieves: 'thief', shelves: 'shelf', calves: 'calf',
  loaves: 'loaf', scarves: 'scarf', cacti: 'cactus', fungi: 'fungus',
  criteria: 'criterion', phenomena: 'phenomenon', data: 'datum'
};

/**
 * Given a word form from the text (e.g. "nuts", "ruined", "stories"),
 * produces a list of potential lemma/base forms.
 */
export const getWordCandidates = (rawWord: string): string[] => {
  const w = rawWord.toLowerCase().replace(/['’]s?$/i, '').trim();
  if (!w) return [];
  const candidates = new Set<string>([w]);

  // 1. Exact lookup in irregular dictionary
  if (IRREGULAR_LEMMAS[w]) {
    candidates.add(IRREGULAR_LEMMAS[w]);
  }

  // 2. Plural & 3rd-person singular:
  // -ies -> -y (stories -> story, flies -> fly)
  if (w.endsWith('ies') && w.length > 4) {
    candidates.add(w.slice(0, -3) + 'y');
  }

  // -ves -> -f or -fe (leaves -> leaf, knives -> knife)
  if (w.endsWith('ves') && w.length > 4) {
    candidates.add(w.slice(0, -3) + 'f');
    candidates.add(w.slice(0, -3) + 'fe');
  }

  // -es endings (boxes -> box, watches -> watch, buses -> bus)
  if (w.endsWith('sses') || w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes') || w.endsWith('zes')) {
    candidates.add(w.slice(0, -2));
  } else if (w.endsWith('es') && w.length > 3) {
    candidates.add(w.slice(0, -2));
    candidates.add(w.slice(0, -1)); // horses -> horse, smiles -> smile
  }

  // -s ending (nuts -> nut, kinds -> kind, runs -> run)
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) {
    candidates.add(w.slice(0, -1));
  }

  // 3. Past tense & past participle:
  // -ied -> -y (cried -> cry, studied -> study)
  if (w.endsWith('ied') && w.length > 4) {
    candidates.add(w.slice(0, -3) + 'y');
  }

  // -ed (ruined -> ruin, stopped -> stop, liked -> like)
  if (w.endsWith('ed') && w.length > 3) {
    candidates.add(w.slice(0, -2)); // ruined -> ruin, jumped -> jump
    candidates.add(w.slice(0, -1)); // liked -> like, smiled -> smile
    // Doubled consonant stem: stopped -> stop, planned -> plan, nodded -> nod
    const stem = w.slice(0, -2);
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.add(stem.slice(0, -1));
    }
  }

  // 4. Present participle (-ing):
  // -ying -> -ie (tying -> tie, lying -> lie)
  if (w.endsWith('ying') && w.length > 4) {
    candidates.add(w.slice(0, -4) + 'ie');
  }

  // -ing (jumping -> jump, making -> make, running -> run)
  if (w.endsWith('ing') && w.length > 4) {
    candidates.add(w.slice(0, -3)); // jumping -> jump
    candidates.add(w.slice(0, -3) + 'e'); // making -> make
    const stem = w.slice(0, -3);
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.add(stem.slice(0, -1)); // running -> run
    }
  }

  // 5. Comparatives & Superlatives (-er, -est):
  if (w.endsWith('ier') && w.length > 4) candidates.add(w.slice(0, -3) + 'y');
  if (w.endsWith('iest') && w.length > 5) candidates.add(w.slice(0, -4) + 'y');
  if (w.endsWith('er') && w.length > 3) {
    candidates.add(w.slice(0, -2));
    candidates.add(w.slice(0, -1));
  }
  if (w.endsWith('est') && w.length > 4) {
    candidates.add(w.slice(0, -3));
    candidates.add(w.slice(0, -2));
  }

  return Array.from(candidates);
};

/**
 * Builds a regex that matches a phrase and its typical inflected variants
 * (e.g. "kind of" -> matches "kind of", "kinds of", "look for" -> matches "looks for", "looked for", "looking for").
 */
const buildPhraseRegex = (phrase: string): RegExp => {
  const parts = phrase.trim().split(/\s+/);
  const regexParts = parts.map((part) => {
    const p = part.toLowerCase();
    if (INVARIABLE_WORDS.has(p)) {
      return p;
    }
    const variants = new Set<string>([p, p + 's']);
    if (p.endsWith('e')) {
      variants.add(p + 'd');
      variants.add(p.slice(0, -1) + 'ing');
    } else {
      variants.add(p + 'ed');
      variants.add(p + 'ing');
    }
    // Handle doubled consonant inflections in phrase roots (e.g. "run" -> "running", "ran")
    if (p === 'run') {
      variants.add('ran');
      variants.add('running');
    } else if (p === 'give') {
      variants.add('gave');
      variants.add('given');
      variants.add('giving');
    } else if (p === 'take') {
      variants.add('took');
      variants.add('taken');
      variants.add('taking');
    } else if (p === 'make') {
      variants.add('made');
      variants.add('making');
    } else if (p === 'go') {
      variants.add('went');
      variants.add('goes');
      variants.add('going');
      variants.add('gone');
    }

    const pattern = Array.from(variants)
      .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    return `(?:${pattern})`;
  });

  return new RegExp(`\\b${regexParts.join('\\s+')}\\b`, 'gi');
};

/**
 * Tokenizes a story sentence or passage into sequential tokens,
 * prioritizing multi-word phrases and performing rule-based lemmatization
 * to match against the active word bank.
 */
export const tokenizePassageWithLemmas = (text: string, wordsList: any[]): TokenItem[] => {
  if (!text) return [];
  const list = Array.isArray(wordsList) ? wordsList : [];

  // 1. Extract and prioritize multi-word phrases (sorted by length desc)
  const phraseItems = list.filter((w) => w && w.word && w.word.trim().includes(' '));
  phraseItems.sort((a, b) => b.word.trim().length - a.word.trim().length);

  interface PhraseMatch {
    start: number;
    end: number;
    text: string;
    matchedWord: any;
  }

  const phraseMatches: PhraseMatch[] = [];
  for (const item of phraseItems) {
    const re = buildPhraseRegex(item.word);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = re.lastIndex;
      // Prevent overlapping matches
      const collides = phraseMatches.some((m) => !(end <= m.start || start >= m.end));
      if (!collides) {
        phraseMatches.push({ start, end, text: match[0], matchedWord: item });
      }
    }
  }

  phraseMatches.sort((a, b) => a.start - b.start);

  // 2. Tokenize into output array with phrase cuts & single word lemmatization
  const tokens: TokenItem[] = [];
  let currentIndex = 0;

  const processSingleWordRegion = (chunk: string) => {
    const wordRegex = /([a-zA-Z'-]+)/g;
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = wordRegex.exec(chunk)) !== null) {
      if (m.index > last) {
        tokens.push({
          text: chunk.substring(last, m.index),
          isWord: false
        });
      }

      const wordText = m[0];
      const candidates = getWordCandidates(wordText);

      // Find matching word in activeWordsList by checking candidate lemmas
      const matched = list.find((w) => {
        if (!w || !w.word) return false;
        const targetClean = w.word.trim().toLowerCase();
        return candidates.includes(targetClean);
      });

      tokens.push({
        text: wordText,
        isWord: true,
        matchedWord: matched || null
      });

      last = wordRegex.lastIndex;
    }

    if (last < chunk.length) {
      tokens.push({
        text: chunk.substring(last),
        isWord: false
      });
    }
  };

  for (const pm of phraseMatches) {
    if (pm.start > currentIndex) {
      processSingleWordRegion(text.substring(currentIndex, pm.start));
    }
    tokens.push({
      text: pm.text,
      isWord: true,
      isPhrase: true,
      matchedWord: pm.matchedWord
    });
    currentIndex = pm.end;
  }

  if (currentIndex < text.length) {
    processSingleWordRegion(text.substring(currentIndex));
  }

  return tokens;
};
