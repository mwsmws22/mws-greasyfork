/**
 * Yomitan-style deinflection: a table of suffix rewrites, applied repeatedly, to
 * get from a conjugated word back to the dictionary forms worth looking up.
 *
 * This is deliberately not a morphological analyser. It never decides which
 * reading is *right*; it offers every dictionary form a surface form could have
 * come from and leaves the dictionary to reject the ones that do not exist. So a
 * rule firing where it does not belong costs a wasted lookup, not a wrong answer.
 */

/**
 * Which words a rule may apply to, and what it produces. `ichidan` and `godan`
 * are the two verb classes, `adjective` is an い-adjective, and `any` is a form
 * whose class we cannot tell yet.
 */
type WordClass = 'ichidan' | 'godan' | 'adjective' | 'any';

interface Rule {
  from: string;
  to: string;
  /** The classes this rule accepts; a rewrite of `ichidan` only chains onto ichidan rules. */
  accepts: WordClass[];
  produces: WordClass;
}

/**
 * A godan verb changes its final kana to another in the same row before taking a
 * suffix, so each column below maps a stem ending back to its dictionary ending:
 * 飲む -> 飲み+ます (い-column), 飲まない (あ), 飲める (え), 飲もう (お).
 */
const I_COLUMN: Record<string, string> = {
  い: 'う',
  き: 'く',
  ぎ: 'ぐ',
  し: 'す',
  ち: 'つ',
  に: 'ぬ',
  び: 'ぶ',
  み: 'む',
  り: 'る',
};

/** う-verbs take わ rather than あ: 買う -> 買わない. */
const A_COLUMN: Record<string, string> = {
  わ: 'う',
  か: 'く',
  が: 'ぐ',
  さ: 'す',
  た: 'つ',
  な: 'ぬ',
  ば: 'ぶ',
  ま: 'む',
  ら: 'る',
};

const E_COLUMN: Record<string, string> = {
  え: 'う',
  け: 'く',
  げ: 'ぐ',
  せ: 'す',
  て: 'つ',
  ね: 'ぬ',
  べ: 'ぶ',
  め: 'む',
  れ: 'る',
};

const O_COLUMN: Record<string, string> = {
  お: 'う',
  こ: 'く',
  ご: 'ぐ',
  そ: 'す',
  と: 'つ',
  の: 'ぬ',
  ぼ: 'ぶ',
  も: 'む',
  ろ: 'る',
};

const VERB = ['ichidan', 'godan', 'any'] as const;

const RULES: Rule[] = [
  ...politeRules(),
  ...negativeRules(),
  ...pastAndConjunctiveRules(),
  ...potentialAndPassiveRules(),
  ...volitionalAndConditionalRules(),
  ...desireRules(),
  ...adjectiveRules(),
];

const MAX_CHAINED_RULES = 4;

/**
 * Every dictionary form `word` could be an inflection of, `word` itself first.
 * Ordering matters: the caller tries them in turn, so the least transformed
 * candidate is checked before the most speculative one.
 */
export function deinflect(word: string): string[] {
  const found = [word];
  const classOf = new Map<string, WordClass>([[word, 'any']]);

  for (let depth = 0; depth < MAX_CHAINED_RULES; depth += 1) {
    const grown = found.slice();
    for (const form of grown) {
      for (const derived of applyRules(form, classOf.get(form) ?? 'any')) {
        if (classOf.has(derived.word)) {
          continue;
        }
        classOf.set(derived.word, derived.wordClass);
        found.push(derived.word);
      }
    }
    if (found.length === grown.length) {
      break;
    }
  }

  return found;
}

function applyRules(
  word: string,
  wordClass: WordClass,
): { word: string; wordClass: WordClass }[] {
  const derived: { word: string; wordClass: WordClass }[] = [];
  for (const rule of RULES) {
    if (!rule.accepts.includes(wordClass) || !word.endsWith(rule.from)) {
      continue;
    }
    const stem = word.slice(0, word.length - rule.from.length);
    if (stem === '') {
      continue;
    }
    derived.push({ word: `${stem}${rule.to}`, wordClass: rule.produces });
  }
  return derived;
}

/**
 * Ichidan verbs take a suffix straight onto the stem (`食べ` + `ます`), godan verbs
 * change their last kana first (`飲む` -> `飲み` + `ます`), so one polite form has
 * one ichidan reading and one godan reading per row of the kana table.
 */
function verbRules(suffix: string): Rule[] {
  return [
    { from: suffix, to: 'る', accepts: ['any'], produces: 'ichidan' },
    ...columnRules(I_COLUMN, suffix, ['any']),
  ];
}

function columnRules(
  column: Record<string, string>,
  suffix: string,
  accepts: WordClass[],
): Rule[] {
  return Object.entries(column).map(([stem, dictionary]) => ({
    from: `${stem}${suffix}`,
    to: dictionary,
    accepts,
    produces: 'godan' as WordClass,
  }));
}

function politeRules(): Rule[] {
  return [
    ...verbRules('ます'),
    ...verbRules('ません'),
    ...verbRules('ました'),
    ...verbRules('ませんでした'),
    ...verbRules('まして'),
  ];
}

function negativeRules(): Rule[] {
  const suffixes = ['ない', 'なかった', 'なくて'];
  return suffixes.flatMap((suffix) => [
    { from: suffix, to: 'る', accepts: [...VERB], produces: 'ichidan' as WordClass },
    ...columnRules(A_COLUMN, suffix, [...VERB]),
  ]);
}

/**
 * The te-form and the plain past are where godan verbs are least regular: the
 * sound change depends on the row, and 行く is irregular on top of that.
 */
function pastAndConjunctiveRules(): Rule[] {
  const godan: [string, string][] = [
    ['った', 'う'],
    ['った', 'つ'],
    ['った', 'る'],
    ['いた', 'く'],
    ['いだ', 'ぐ'],
    ['した', 'す'],
    ['んだ', 'ぬ'],
    ['んだ', 'ぶ'],
    ['んだ', 'む'],
    ['って', 'う'],
    ['って', 'つ'],
    ['って', 'る'],
    ['いて', 'く'],
    ['いで', 'ぐ'],
    ['して', 'す'],
    ['んで', 'ぬ'],
    ['んで', 'ぶ'],
    ['んで', 'む'],
  ];

  return [
    { from: 'た', to: 'る', accepts: [...VERB], produces: 'ichidan' },
    { from: 'て', to: 'る', accepts: [...VERB], produces: 'ichidan' },
    ...godan.map(([from, to]) => ({
      from,
      to,
      accepts: [...VERB],
      produces: 'godan' as WordClass,
    })),
  ];
}

function potentialAndPassiveRules(): Rule[] {
  return [
    /** られる covers both the ichidan potential and its passive. */
    { from: 'られる', to: 'る', accepts: [...VERB], produces: 'ichidan' },
    { from: 'させる', to: 'る', accepts: [...VERB], produces: 'ichidan' },
    ...verbRules('れる'),
    ...verbRules('せる'),
    /** The godan potential is the え-column plus る: 飲む -> 飲める. */
    ...columnRules(E_COLUMN, 'る', [...VERB]),
  ];
}

function volitionalAndConditionalRules(): Rule[] {
  return [
    { from: 'よう', to: 'る', accepts: [...VERB], produces: 'ichidan' },
    ...columnRules(O_COLUMN, 'う', [...VERB]),
    { from: 'れば', to: 'る', accepts: ['ichidan', 'any'], produces: 'ichidan' },
    ...columnRules(E_COLUMN, 'ば', [...VERB]),
  ];
}

function desireRules(): Rule[] {
  return [
    ...verbRules('たい'),
    ...verbRules('たがる'),
    ...verbRules('そう'),
    ...verbRules('やすい'),
    ...verbRules('にくい'),
    ...verbRules('ながら'),
  ];
}

function adjectiveRules(): Rule[] {
  return [
    { from: 'くない', to: 'い', accepts: ['adjective', 'any'], produces: 'adjective' },
    { from: 'くなかった', to: 'い', accepts: ['adjective', 'any'], produces: 'adjective' },
    { from: 'かった', to: 'い', accepts: ['adjective', 'any'], produces: 'adjective' },
    { from: 'くて', to: 'い', accepts: ['adjective', 'any'], produces: 'adjective' },
    { from: 'く', to: 'い', accepts: ['adjective', 'any'], produces: 'adjective' },
    { from: 'ければ', to: 'い', accepts: ['adjective', 'any'], produces: 'adjective' },
    { from: 'さ', to: 'い', accepts: ['adjective', 'any'], produces: 'adjective' },
  ];
}
