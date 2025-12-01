import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle, Trophy, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BIBLE_BOOKS } from "@shared/schema";

interface BookStatus {
  name: string;
  questionCount: number;
  approvedCount: number;
  hasQuiz: boolean;
}

interface QuizQuestion {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  scriptureReference: string | null;
}

interface QuizResult {
  questionId: number;
  correct: boolean;
  correctAnswer: string;
  scriptureReference: string | null;
}

type ViewState = "selection" | "quiz" | "results";

export function BibleQuizSection() {
  const [view, setView] = useState<ViewState>("selection");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; selectedAnswer: string }[]>([]);
  const [results, setResults] = useState<{ score: number; totalQuestions: number; results: QuizResult[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: books = [] } = useQuery<BookStatus[]>({
    queryKey: ["quiz-books"],
    queryFn: async () => {
      const response = await fetch("/api/quiz/books");
      if (!response.ok) throw new Error("Failed to fetch books");
      return response.json();
    },
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<QuizQuestion[]>({
    queryKey: ["quiz-questions", selectedBook],
    queryFn: async () => {
      const response = await fetch(`/api/quiz/questions/${encodeURIComponent(selectedBook!)}`);
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
    enabled: !!selectedBook && view === "quiz",
  });

  const oldTestamentBooks = books.filter(b => 
    (BIBLE_BOOKS.oldTestament as readonly string[]).includes(b.name)
  );
  const newTestamentBooks = books.filter(b => 
    (BIBLE_BOOKS.newTestament as readonly string[]).includes(b.name)
  );

  const handleSelectBook = (bookName: string) => {
    setSelectedBook(bookName);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setResults(null);
    setView("quiz");
  };

  const handleAnswer = (answer: string) => {
    const question = questions[currentQuestionIndex];
    setAnswers([...answers, { questionId: question.id, selectedAnswer: answer }]);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitQuiz([...answers, { questionId: question.id, selectedAnswer: answer }]);
    }
  };

  const submitQuiz = async (finalAnswers: { questionId: number; selectedAnswer: string }[]) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: selectedBook, answers: finalAnswers }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setView("results");
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSelection = () => {
    setView("selection");
    setSelectedBook(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setResults(null);
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setResults(null);
    setView("quiz");
  };

  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h2 className="text-3xl md:text-5xl font-serif font-bold">Bible Quiz</h2>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Test your knowledge of Scripture. Choose a book of the Bible and answer 10 questions.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === "selection" && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Old Testament */}
              <div className="mb-10">
                <h3 className="text-xl font-serif font-bold mb-4 text-center">Old Testament</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {oldTestamentBooks.map((book) => (
                    <button
                      key={book.name}
                      onClick={() => book.hasQuiz && handleSelectBook(book.name)}
                      disabled={!book.hasQuiz}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        book.hasQuiz
                          ? "bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20"
                          : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                      }`}
                      data-testid={`quiz-book-${book.name}`}
                    >
                      <span className="line-clamp-2">{book.name}</span>
                      {book.hasQuiz && <CheckCircle className="w-3 h-3 mx-auto mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* New Testament */}
              <div>
                <h3 className="text-xl font-serif font-bold mb-4 text-center">New Testament</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {newTestamentBooks.map((book) => (
                    <button
                      key={book.name}
                      onClick={() => book.hasQuiz && handleSelectBook(book.name)}
                      disabled={!book.hasQuiz}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        book.hasQuiz
                          ? "bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20"
                          : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                      }`}
                      data-testid={`quiz-book-${book.name}`}
                    >
                      <span className="line-clamp-2">{book.name}</span>
                      {book.hasQuiz && <CheckCircle className="w-3 h-3 mx-auto mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Books with a checkmark have quizzes available. More coming soon!
              </p>
            </motion.div>
          )}

          {view === "quiz" && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <Button
                variant="ghost"
                onClick={handleBackToSelection}
                className="mb-6"
                data-testid="button-back-to-selection"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Books
              </Button>

              {loadingQuestions ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Loading questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No questions available for this book yet.</p>
                  <Button onClick={handleBackToSelection} className="mt-4">
                    Choose Another Book
                  </Button>
                </div>
              ) : (
                <div className="bg-card rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-serif font-bold">{selectedBook}</h3>
                    <span className="text-sm text-muted-foreground">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 mb-6">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>

                  <p className="text-lg mb-6" data-testid="quiz-question-text">
                    {questions[currentQuestionIndex]?.questionText}
                  </p>

                  <div className="grid gap-3">
                    {["A", "B", "C", "D"].map((option) => {
                      const question = questions[currentQuestionIndex];
                      const optionText = question?.[`option${option}` as keyof QuizQuestion] as string;
                      
                      return (
                        <button
                          key={option}
                          onClick={() => handleAnswer(option)}
                          disabled={isSubmitting}
                          className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                          data-testid={`quiz-option-${option}`}
                        >
                          <span className="font-bold mr-3">{option}.</span>
                          {optionText}
                        </button>
                      );
                    })}
                  </div>

                  {questions[currentQuestionIndex]?.scriptureReference && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Reference: {questions[currentQuestionIndex].scriptureReference}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === "results" && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-card rounded-xl shadow-lg p-8 text-center">
                <Trophy className={`w-16 h-16 mx-auto mb-4 ${
                  results.score >= 8 ? "text-yellow-500" :
                  results.score >= 5 ? "text-primary" : "text-muted-foreground"
                }`} />
                
                <h3 className="text-2xl font-serif font-bold mb-2">Quiz Complete!</h3>
                <p className="text-4xl font-bold text-primary mb-2">
                  {results.score} / {results.totalQuestions}
                </p>
                <p className="text-muted-foreground mb-6">
                  {results.score === results.totalQuestions
                    ? "Perfect score! Excellent knowledge of Scripture!"
                    : results.score >= 8
                    ? "Great job! You know your Bible well!"
                    : results.score >= 5
                    ? "Good effort! Keep studying the Word!"
                    : "Keep reading and learning. Every journey begins with a step!"}
                </p>

                <div className="flex gap-4 justify-center">
                  <Button onClick={handleRetry} data-testid="button-retry-quiz">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={handleBackToSelection} data-testid="button-choose-another">
                    Choose Another Book
                  </Button>
                </div>
              </div>

              {/* Show which answers were correct/incorrect */}
              <div className="mt-8 space-y-3">
                <h4 className="font-serif font-bold text-lg">Review Your Answers</h4>
                {results.results.map((result, index) => (
                  <div
                    key={result.questionId}
                    className={`p-4 rounded-lg border ${
                      result.correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${result.correct ? "text-green-700" : "text-red-700"}`}>
                        {result.correct ? "✓" : "✗"} Question {index + 1}
                      </span>
                      {!result.correct && (
                        <span className="text-sm text-red-600">
                          Correct answer: {result.correctAnswer}
                        </span>
                      )}
                    </div>
                    {result.scriptureReference && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reference: {result.scriptureReference}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
