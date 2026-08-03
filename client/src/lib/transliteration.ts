type SupportedScript = "en" | "hi" | "od";

const scriptData = {
  hi: {
    vowels: {
      a: "अ", aa: "आ", i: "इ", ee: "ई", u: "उ", oo: "ऊ",
      e: "ए", ai: "ऐ", o: "ओ", au: "औ", ri: "ऋ"
    },
    matras: {
      a: "", aa: "ा", i: "ि", ee: "ी", u: "ु", oo: "ू",
      e: "े", ai: "ै", o: "ो", au: "ौ", ri: "ृ"
    },
    consonants: {
      ksh: "क्ष", gy: "ज्ञ", tr: "त्र",
      kh: "ख", gh: "घ", chh: "छ", ch: "च", jh: "झ",
      th: "थ", dh: "ध", ph: "फ", bh: "भ", sh: "श",
      k: "क", g: "ग", c: "क", j: "ज", t: "त", d: "द",
      n: "न", p: "प", b: "ब", m: "म", y: "य", r: "र",
      l: "ल", v: "व", w: "व", s: "स", h: "ह", f: "फ",
      q: "क", x: "क्स", z: "ज"
    },
    anusvara: "ं"
  },
  od: {
    vowels: {
      a: "ଅ", aa: "ଆ", i: "ଇ", ee: "ଈ", u: "ଉ", oo: "ଊ",
      e: "ଏ", ai: "ଐ", o: "ଓ", au: "ଔ", ri: "ଋ"
    },
    matras: {
      a: "", aa: "ା", i: "ି", ee: "ୀ", u: "ୁ", oo: "ୂ",
      e: "େ", ai: "ୈ", o: "ୋ", au: "ୌ", ri: "ୃ"
    },
    consonants: {
      ksh: "କ୍ଷ", gy: "ଜ୍ଞ", tr: "ତ୍ର",
      kh: "ଖ", gh: "ଘ", chh: "ଛ", ch: "ଚ", jh: "ଝ",
      th: "ଥ", dh: "ଧ", ph: "ଫ", bh: "ଭ", sh: "ଶ",
      k: "କ", g: "ଗ", c: "କ", j: "ଜ", t: "ତ", d: "ଦ",
      n: "ନ", p: "ପ", b: "ବ", m: "ମ", y: "ୟ", r: "ର",
      l: "ଲ", v: "ଭ", w: "ୱ", s: "ସ", h: "ହ", f: "ଫ",
      q: "କ", x: "କ୍ସ", z: "ଜ"
    },
    anusvara: "ଂ"
  }
} as const;

const vowelTokens = ["aa", "ee", "oo", "ai", "au", "ri", "a", "i", "u", "e", "o"] as const;
const consonantTokens = ["ksh", "chh", "gy", "tr", "kh", "gh", "ch", "jh", "th", "dh", "ph", "bh", "sh", "k", "g", "c", "j", "t", "d", "n", "p", "b", "m", "y", "r", "l", "v", "w", "s", "h", "f", "q", "x", "z"] as const;

const isLatin = (char: string) => /[a-z]/i.test(char);

function matchToken<T extends readonly string[]>(text: string, index: number, tokens: T): T[number] | null {
  const lower = text.slice(index).toLowerCase();
  return tokens.find((token) => lower.startsWith(token)) ?? null;
}

function transliterateWord(word: string, language: Exclude<SupportedScript, "en">): string {
  if (!/[a-z]/i.test(word)) return word;

  const data = scriptData[language];
  let output = "";
  let index = 0;

  while (index < word.length) {
    const char = word[index];
    if (!isLatin(char)) {
      output += char;
      index += 1;
      continue;
    }

    const vowel = matchToken(word, index, vowelTokens);
    if (vowel) {
      output += data.vowels[vowel];
      index += vowel.length;
      continue;
    }

    const consonant = matchToken(word, index, consonantTokens);
    if (consonant) {
      output += data.consonants[consonant];
      index += consonant.length;

      const nextVowel = matchToken(word, index, vowelTokens);
      if (nextVowel) {
        output += data.matras[nextVowel];
        index += nextVowel.length;
      }
      continue;
    }

    output += char;
    index += 1;
  }

  return output.replace(new RegExp(`${data.consonants.n}${data.consonants.g}`, "g"), data.anusvara + data.consonants.g);
}

export function transliterateInput(value: string, language: string): string {
  if ((language !== "hi" && language !== "od") || !value) return value;

  return value
    .split(/(\s+)/)
    .map((part) => (part.trim() ? transliterateWord(part, language) : part))
    .join("");
}
