// Quiz question generator using Gemini AI with Bible content
import { GoogleGenAI } from "@google/genai";
import { fetchBookContent } from "./bibleApi";
import type { InsertQuizQuestion } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface GeneratedQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  scriptureReference: string;
}

export async function generateQuestionsForBook(bookName: string, count: number = 10): Promise<InsertQuizQuestion[]> {
  console.log(`Fetching scripture content for ${bookName}...`);
  
  // Fetch actual Bible content
  const scriptureContent = await fetchBookContent(bookName);
  
  if (!scriptureContent || scriptureContent.length < 100) {
    throw new Error(`Could not fetch sufficient content for ${bookName}`);
  }

  console.log(`Generating ${count} quiz questions for ${bookName} using AI...`);
  
  const prompt = `You are a Bible scholar creating educational quiz questions. Based on the following scripture from ${bookName}, create exactly ${count} multiple choice questions.

SCRIPTURE CONTENT FROM ${bookName.toUpperCase()}:
${scriptureContent.substring(0, 15000)}

REQUIREMENTS:
1. Each question should test knowledge of key events, people, teachings, or verses from ${bookName}
2. Questions should vary in difficulty (some easy, some moderate, some challenging)
3. All 4 answer choices must be plausible, but only one is correct
4. Include a scripture reference (chapter and verse) for each question
5. Questions should be accurate and based on the actual scripture text provided

Return ONLY a valid JSON array with exactly ${count} objects in this format:
[
  {
    "questionText": "What did God create on the first day according to Genesis 1?",
    "optionA": "Light",
    "optionB": "Animals",
    "optionC": "Man",
    "optionD": "Water",
    "correctAnswer": "A",
    "scriptureReference": "Genesis 1:3-5"
  }
]

Return ONLY the JSON array, no other text or explanation.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }]
    });

    const text = response.text || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in AI response");
      throw new Error("Failed to parse AI response - no JSON array found");
    }
    
    const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0]);
    
    // Validate and transform to our schema format
    const validQuestions: InsertQuizQuestion[] = questions
      .filter(q => 
        q.questionText && 
        q.optionA && 
        q.optionB && 
        q.optionC && 
        q.optionD && 
        ["A", "B", "C", "D"].includes(q.correctAnswer)
      )
      .map(q => ({
        book: bookName,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        scriptureReference: q.scriptureReference || null,
        isApproved: 0, // Questions need admin approval by default
      }));

    console.log(`Successfully generated ${validQuestions.length} questions for ${bookName}`);
    return validQuestions;
    
  } catch (error) {
    console.error(`Error generating questions for ${bookName}:`, error);
    throw error;
  }
}

export async function generateQuestionsForBooks(
  bookNames: string[], 
  questionsPerBook: number = 10,
  onProgress?: (book: string, completed: number, total: number) => void
): Promise<Map<string, InsertQuizQuestion[]>> {
  const results = new Map<string, InsertQuizQuestion[]>();
  
  for (let i = 0; i < bookNames.length; i++) {
    const book = bookNames[i];
    try {
      const questions = await generateQuestionsForBook(book, questionsPerBook);
      results.set(book, questions);
      
      if (onProgress) {
        onProgress(book, i + 1, bookNames.length);
      }
      
      // Add delay between books to avoid rate limiting
      if (i < bookNames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to generate questions for ${book}:`, error);
      results.set(book, []);
    }
  }
  
  return results;
}
