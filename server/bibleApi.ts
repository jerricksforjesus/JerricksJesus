// Bible API service for fetching scripture text
// Uses the free bible-api.com which requires no API key

const BIBLE_API_BASE = "https://bible-api.com";

// Map book names to API-friendly format
const BOOK_NAME_MAP: Record<string, string> = {
  "Genesis": "genesis",
  "Exodus": "exodus",
  "Leviticus": "leviticus",
  "Numbers": "numbers",
  "Deuteronomy": "deuteronomy",
  "Joshua": "joshua",
  "Judges": "judges",
  "Ruth": "ruth",
  "1 Samuel": "1 samuel",
  "2 Samuel": "2 samuel",
  "1 Kings": "1 kings",
  "2 Kings": "2 kings",
  "1 Chronicles": "1 chronicles",
  "2 Chronicles": "2 chronicles",
  "Ezra": "ezra",
  "Nehemiah": "nehemiah",
  "Esther": "esther",
  "Job": "job",
  "Psalms": "psalms",
  "Proverbs": "proverbs",
  "Ecclesiastes": "ecclesiastes",
  "Song of Solomon": "song of solomon",
  "Isaiah": "isaiah",
  "Jeremiah": "jeremiah",
  "Lamentations": "lamentations",
  "Ezekiel": "ezekiel",
  "Daniel": "daniel",
  "Hosea": "hosea",
  "Joel": "joel",
  "Amos": "amos",
  "Obadiah": "obadiah",
  "Jonah": "jonah",
  "Micah": "micah",
  "Nahum": "nahum",
  "Habakkuk": "habakkuk",
  "Zephaniah": "zephaniah",
  "Haggai": "haggai",
  "Zechariah": "zechariah",
  "Malachi": "malachi",
  "Matthew": "matthew",
  "Mark": "mark",
  "Luke": "luke",
  "John": "john",
  "Acts": "acts",
  "Romans": "romans",
  "1 Corinthians": "1 corinthians",
  "2 Corinthians": "2 corinthians",
  "Galatians": "galatians",
  "Ephesians": "ephesians",
  "Philippians": "philippians",
  "Colossians": "colossians",
  "1 Thessalonians": "1 thessalonians",
  "2 Thessalonians": "2 thessalonians",
  "1 Timothy": "1 timothy",
  "2 Timothy": "2 timothy",
  "Titus": "titus",
  "Philemon": "philemon",
  "Hebrews": "hebrews",
  "James": "james",
  "1 Peter": "1 peter",
  "2 Peter": "2 peter",
  "1 John": "1john",
  "2 John": "2john",
  "3 John": "3john",
  "Jude": "jude",
  "Revelation": "revelation",
};

// Approximate chapter counts for each book
export const BOOK_CHAPTERS: Record<string, number> = {
  "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
  "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
  "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10,
  "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31,
  "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5,
  "Ezekiel": 48, "Daniel": 12, "Hosea": 14, "Joel": 3, "Amos": 9,
  "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3, "Habakkuk": 3,
  "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
  "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
  "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6,
  "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6,
  "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5,
  "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1,
  "Jude": 1, "Revelation": 22,
};

interface BibleApiResponse {
  reference: string;
  verses: Array<{
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

export async function fetchBookContent(bookName: string): Promise<string> {
  const apiBookName = BOOK_NAME_MAP[bookName];
  if (!apiBookName) {
    throw new Error(`Unknown book: ${bookName}`);
  }

  const chapters = BOOK_CHAPTERS[bookName] || 1;
  
  // For single-chapter books (Obadiah, Philemon, 2 John, 3 John, Jude), 
  // fetch the entire book at once - need to specify chapter 1 and a verse range
  if (chapters === 1) {
    // For single-chapter books, use format: bookname+1:1-999 to get all verses
    const url = `${BIBLE_API_BASE}/${apiBookName}+1:1-999?translation=kjv`;
    console.log(`Fetching single-chapter book ${bookName}: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        const data: BibleApiResponse = await response.json();
        console.log(`SUCCESS: Fetched ${bookName}: ${data.text?.length || 0} characters`);
        return data.text || "";
      } else {
        console.error(`Failed to fetch ${bookName}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error fetching single-chapter book ${bookName}:`, error);
    }
    
    return "";
  }
  
  // Fetch a representative sample of chapters for multi-chapter books
  // For very long books, we'll sample key chapters to keep API calls reasonable
  const chaptersToFetch: number[] = [];
  
  if (chapters <= 10) {
    // Fetch all chapters for short books
    for (let i = 1; i <= chapters; i++) {
      chaptersToFetch.push(i);
    }
  } else if (chapters <= 30) {
    // For medium books, fetch first few, middle, and last few
    chaptersToFetch.push(1, 2, 3);
    chaptersToFetch.push(Math.floor(chapters / 2));
    chaptersToFetch.push(chapters - 1, chapters);
  } else {
    // For long books (Psalms, Isaiah, etc), sample evenly
    const step = Math.floor(chapters / 6);
    for (let i = 1; i <= chapters; i += step) {
      chaptersToFetch.push(i);
    }
    if (!chaptersToFetch.includes(chapters)) {
      chaptersToFetch.push(chapters);
    }
  }

  const allText: string[] = [];
  
  for (const chapter of chaptersToFetch) {
    try {
      const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(apiBookName)}+${chapter}?translation=kjv`);
      
      if (response.ok) {
        const data: BibleApiResponse = await response.json();
        allText.push(`Chapter ${chapter}:\n${data.text}`);
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching ${bookName} chapter ${chapter}:`, error);
    }
  }

  return allText.join("\n\n");
}

export async function fetchChapter(bookName: string, chapter: number): Promise<string> {
  const apiBookName = BOOK_NAME_MAP[bookName];
  if (!apiBookName) {
    throw new Error(`Unknown book: ${bookName}`);
  }

  const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(apiBookName)}+${chapter}?translation=kjv`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${bookName} ${chapter}`);
  }
  
  const data: BibleApiResponse = await response.json();
  return data.text;
}
