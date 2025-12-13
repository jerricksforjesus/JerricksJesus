import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Book, CheckCircle, Trophy, ArrowLeft, Loader2, History, User, UserPlus, Crown, Medal, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BIBLE_BOOKS } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuizProgress } from "@/hooks/useQuizProgress";

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  quizzesTaken: number;
}

interface UserQuizStats {
  totalPoints: number;
  quizzesTaken: number;
  averageScore: number;
}

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

interface QuizAttempt {
  id: number;
  book: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

type ViewState = "selection" | "quiz" | "results" | "history";

export function BibleQuizSection() {
  const [view, setView] = useState<ViewState>("selection");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; selectedAnswer: string }[]>([]);
  const [results, setResults] = useState<{ score: number; totalQuestions: number; results: QuizResult[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctAnswer: string } | null>(null);
  const [isShowingFeedback, setIsShowingFeedback] = useState(false);
  const [, setLocation] = useLocation();
  
  const { user } = useAuth();
  const { completedBooks, markCompleted, serverHistory } = useQuizProgress();

  const { data: books = [] } = useQuery<BookStatus[]>({
    queryKey: ["quiz-books"],
    queryFn: async () => {
      const response = await fetch("/api/quiz/books");
      if (!response.ok) throw new Error("Failed to fetch books");
      return response.json();
    },
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["quiz-leaderboard"],
    queryFn: async () => {
      const response = await fetch("/api/quiz/leaderboard?limit=10");
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
  });

  const { data: myStats } = useQuery<UserQuizStats>({
    queryKey: ["quiz-my-stats"],
    queryFn: async () => {
      const response = await fetch("/api/quiz/my-stats", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
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
  
  const quizHistory = serverHistory;
  const loadingHistory = false;

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

  const handleAnswer = async (answer: string) => {
    if (isShowingFeedback) return;
    
    const question = questions[currentQuestionIndex];
    setSelectedAnswer(answer);
    setIsShowingFeedback(true);
    
    const moveToNextQuestion = (newAnswers: { questionId: number; selectedAnswer: string }[]) => {
      setTimeout(() => {
        setSelectedAnswer(null);
        setAnswerResult(null);
        setIsShowingFeedback(false);
        
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          submitQuiz(newAnswers);
        }
      }, 1500);
    };
    
    try {
      const response = await fetch("/api/quiz/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, selectedAnswer: answer }),
      });
      
      const newAnswers = [...answers, { questionId: question.id, selectedAnswer: answer }];
      setAnswers(newAnswers);
      
      if (response.ok) {
        const result = await response.json();
        setAnswerResult({ correct: result.correct, correctAnswer: result.correctAnswer });
        moveToNextQuestion(newAnswers);
      } else {
        setSelectedAnswer(null);
        setAnswerResult(null);
        setIsShowingFeedback(false);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          submitQuiz(newAnswers);
        }
      }
    } catch (error) {
      console.error("Failed to check answer:", error);
      const newAnswers = [...answers, { questionId: question.id, selectedAnswer: answer }];
      setAnswers(newAnswers);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setIsShowingFeedback(false);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        submitQuiz(newAnswers);
      }
    }
  };

  const submitQuiz = async (finalAnswers: { questionId: number; selectedAnswer: string }[]) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ book: selectedBook, answers: finalAnswers }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setView("results");
        if (selectedBook) {
          markCompleted(selectedBook);
        }
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
              {/* Personal Stats & Leaderboard */}
              <div className="grid md:grid-cols-2 gap-6 mb-10">
                {/* Personal Stats Card */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-serif font-bold text-lg">Your Stats</h3>
                  </div>
                  {user ? (
                    myStats && myStats.quizzesTaken > 0 ? (
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary" data-testid="text-user-points">{myStats.totalPoints}</div>
                          <div className="text-xs text-muted-foreground">Total Points</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold" data-testid="text-user-quizzes">{myStats.quizzesTaken}</div>
                          <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold" data-testid="text-user-average">{myStats.averageScore}%</div>
                          <div className="text-xs text-muted-foreground">Avg Score</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Take your first quiz to start earning points!</p>
                    )
                  ) : (
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm mb-3">Sign in to track your progress and compete on the leaderboard!</p>
                      <Button size="sm" onClick={() => setLocation("/login")} data-testid="button-login-quiz">
                        <User className="w-4 h-4 mr-2" />
                        Sign In
                      </Button>
                    </div>
                  )}
                </div>

                {/* Leaderboard Card */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <Crown className="w-5 h-5 text-yellow-600" />
                    </div>
                    <h3 className="font-serif font-bold text-lg">Leaderboard</h3>
                  </div>
                  {leaderboard.length > 0 ? (
                    <div className="space-y-2">
                      {leaderboard.slice(0, 5).map((entry, index) => (
                        <div 
                          key={entry.userId} 
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            index === 0 ? "bg-yellow-50" : index === 1 ? "bg-gray-100" : index === 2 ? "bg-orange-50" : "bg-muted/30"
                          }`}
                          data-testid={`leaderboard-row-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 text-center font-bold text-sm">
                              {index === 0 ? <Crown className="w-4 h-4 text-yellow-500 mx-auto" /> : 
                               index === 1 ? <Medal className="w-4 h-4 text-gray-400 mx-auto" /> :
                               index === 2 ? <Award className="w-4 h-4 text-orange-400 mx-auto" /> :
                               `${index + 1}`}
                            </div>
                            <span className="font-medium text-sm">{entry.username}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-primary">{entry.totalPoints}</span>
                            <span className="text-xs text-muted-foreground ml-1">pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center">No scores yet. Be the first to take a quiz!</p>
                  )}
                </div>
              </div>

              {/* Mobile/Tablet Accordion View */}
              <div className="lg:hidden">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="old-testament" className="border rounded-lg mb-4 overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30" data-testid="accordion-old-testament">
                      <span className="text-lg font-serif font-bold">Old Testament</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
                        {oldTestamentBooks.map((book) => {
                          const isCompleted = completedBooks.has(book.name);
                          return (
                            <button
                              key={book.name}
                              onClick={() => book.hasQuiz && handleSelectBook(book.name)}
                              disabled={!book.hasQuiz}
                              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                !book.hasQuiz
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                  : isCompleted
                                  ? "bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer border border-gray-200"
                              }`}
                              data-testid={`quiz-book-mobile-${book.name}`}
                            >
                              <span className="min-h-[2.5rem] flex items-center justify-center text-center leading-tight">{book.name}</span>
                              {book.hasQuiz && (
                                isCompleted 
                                  ? <CheckCircle className="w-3 h-3 mx-auto mt-1 shrink-0" />
                                  : <Book className="w-3 h-3 mx-auto mt-1 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="new-testament" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30" data-testid="accordion-new-testament">
                      <span className="text-lg font-serif font-bold">New Testament</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
                        {newTestamentBooks.map((book) => {
                          const isCompleted = completedBooks.has(book.name);
                          return (
                            <button
                              key={book.name}
                              onClick={() => book.hasQuiz && handleSelectBook(book.name)}
                              disabled={!book.hasQuiz}
                              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                !book.hasQuiz
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                  : isCompleted
                                  ? "bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer border border-gray-200"
                              }`}
                              data-testid={`quiz-book-mobile-${book.name}`}
                            >
                              <span className="min-h-[2.5rem] flex items-center justify-center text-center leading-tight">{book.name}</span>
                              {book.hasQuiz && (
                                isCompleted 
                                  ? <CheckCircle className="w-3 h-3 mx-auto mt-1 shrink-0" />
                                  : <Book className="w-3 h-3 mx-auto mt-1 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Desktop Grid View */}
              <div className="hidden lg:block">
                {/* Old Testament */}
                <div className="mb-10">
                  <h3 className="text-xl font-serif font-bold mb-4 text-center">Old Testament</h3>
                  <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
                    {oldTestamentBooks.map((book) => {
                      const isCompleted = completedBooks.has(book.name);
                      return (
                        <button
                          key={book.name}
                          onClick={() => book.hasQuiz && handleSelectBook(book.name)}
                          disabled={!book.hasQuiz}
                          className={`p-2 rounded-lg text-xs font-medium transition-all ${
                            !book.hasQuiz
                              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                              : isCompleted
                              ? "bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer border border-gray-200"
                          }`}
                          data-testid={`quiz-book-${book.name}`}
                        >
                          <span className="min-h-[2.5rem] flex items-center justify-center text-center leading-tight">{book.name}</span>
                          {book.hasQuiz && (
                            isCompleted 
                              ? <CheckCircle className="w-3 h-3 mx-auto mt-1 shrink-0" />
                              : <Book className="w-3 h-3 mx-auto mt-1 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* New Testament */}
                <div>
                  <h3 className="text-xl font-serif font-bold mb-4 text-center">New Testament</h3>
                  <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
                    {newTestamentBooks.map((book) => {
                      const isCompleted = completedBooks.has(book.name);
                      return (
                        <button
                          key={book.name}
                          onClick={() => book.hasQuiz && handleSelectBook(book.name)}
                          disabled={!book.hasQuiz}
                          className={`p-2 rounded-lg text-xs font-medium transition-all ${
                            !book.hasQuiz
                              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                              : isCompleted
                              ? "bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer border border-primary/20"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer border border-gray-200"
                          }`}
                          data-testid={`quiz-book-${book.name}`}
                        >
                          <span className="min-h-[2.5rem] flex items-center justify-center text-center leading-tight">{book.name}</span>
                          {book.hasQuiz && (
                            isCompleted 
                              ? <CheckCircle className="w-3 h-3 mx-auto mt-1 shrink-0" />
                              : <Book className="w-3 h-3 mx-auto mt-1 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {user 
                  ? "Completed books show a checkmark. Books with a book icon are ready to take!"
                  : "Sign in to track your progress and see your completed books marked with checkmarks."
                }
              </p>
              
              {/* User Actions */}
              <div className="flex justify-center gap-4 mt-8">
                {user ? (
                  <Button
                    variant="outline"
                    onClick={() => setView("history")}
                    data-testid="button-view-history"
                  >
                    <History className="w-4 h-4 mr-2" />
                    My Quiz History
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/login")}
                    data-testid="button-login-for-history"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Sign in to track your scores
                  </Button>
                )}
              </div>
            </motion.div>
          )}
          
          {view === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <Button
                variant="ghost"
                onClick={handleBackToSelection}
                className="mb-6"
                data-testid="button-back-from-history"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Books
              </Button>
              
              <div className="bg-card rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <History className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-serif font-bold">Your Quiz History</h3>
                </div>
                
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading history...</p>
                  </div>
                ) : quizHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-4">You haven't taken any quizzes yet.</p>
                    <Button onClick={handleBackToSelection} data-testid="button-start-first-quiz">
                      Take Your First Quiz
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quizHistory.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        data-testid={`history-attempt-${attempt.id}`}
                      >
                        <div>
                          <p className="font-medium">{attempt.book}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(attempt.completedAt).toLocaleDateString()} at{" "}
                            {new Date(attempt.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            attempt.score / attempt.totalQuestions >= 0.8 
                              ? "text-green-600" 
                              : attempt.score / attempt.totalQuestions >= 0.6
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}>
                            {attempt.score} / {attempt.totalQuestions}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round((attempt.score / attempt.totalQuestions) * 100)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                      
                      const isSelected = selectedAnswer === option;
                      const hasResult = answerResult !== null;
                      const isCorrectAnswer = answerResult?.correctAnswer === option;
                      const showCorrect = isShowingFeedback && hasResult && isSelected && answerResult?.correct;
                      const showWrong = isShowingFeedback && hasResult && isSelected && !answerResult?.correct;
                      const showCorrectHighlight = isShowingFeedback && hasResult && !answerResult?.correct && isCorrectAnswer;
                      
                      let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-all ";
                      
                      if (showCorrect) {
                        buttonClass += "border-green-500 bg-green-100 text-green-800";
                      } else if (showWrong) {
                        buttonClass += "border-red-500 bg-red-100 text-red-800";
                      } else if (showCorrectHighlight) {
                        buttonClass += "border-green-500 bg-green-50";
                      } else if (isShowingFeedback) {
                        buttonClass += "border-border opacity-50 cursor-not-allowed";
                      } else {
                        buttonClass += "border-border hover:border-primary hover:bg-primary/5 cursor-pointer";
                      }
                      
                      return (
                        <button
                          key={option}
                          onClick={() => handleAnswer(option)}
                          disabled={isSubmitting || isShowingFeedback}
                          className={buttonClass}
                          data-testid={`quiz-option-${option}`}
                        >
                          <span className="font-bold mr-3">{option}.</span>
                          {optionText}
                          {showCorrect && <span className="float-right text-green-600 font-bold">✓ Correct!</span>}
                          {showWrong && <span className="float-right text-red-600 font-bold">✗ Wrong</span>}
                          {showCorrectHighlight && <span className="float-right text-green-600 font-bold">✓ Correct Answer</span>}
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

              {/* Signup prompt for guest users */}
              {!user && (
                <div className="mt-6 bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                  <UserPlus className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h4 className="font-serif font-bold text-lg mb-2">Save Your Progress!</h4>
                  <p className="text-muted-foreground mb-4">
                    Create an account to permanently save your quiz scores and track your Bible knowledge journey.
                  </p>
                  <Button 
                    onClick={() => setLocation("/login")} 
                    style={{ backgroundColor: "#b47a5f", color: "white" }}
                    data-testid="button-signup-prompt"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </Button>
                </div>
              )}

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
