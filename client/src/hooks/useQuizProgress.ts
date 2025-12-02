import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

const LOCAL_STORAGE_KEY = "quiz_completed_books";

interface QuizAttempt {
  id: number;
  book: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

function getLocalCompletedBooks(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalCompletedBooks(books: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

function addLocalCompletedBook(book: string) {
  const books = getLocalCompletedBooks();
  if (!books.includes(book)) {
    books.push(book);
    setLocalCompletedBooks(books);
  }
}

function clearLocalCompletedBooks() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}

export function useQuizProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localCompletedBooks, setLocalCompletedBooksState] = useState<string[]>([]);

  useEffect(() => {
    setLocalCompletedBooksState(getLocalCompletedBooks());
  }, []);

  const { data: serverHistory = [] } = useQuery<QuizAttempt[]>({
    queryKey: ["quiz-history"],
    queryFn: async () => {
      const response = await fetch("/api/quiz/my-history", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
    enabled: !!user,
  });

  const serverCompletedBooks = new Set(serverHistory.map(attempt => attempt.book));

  // Always merge local and server completions to ensure UI continuity during login/migration
  // Local books are included until they're migrated to the server and localStorage is cleared
  const completedBooks = new Set([
    ...localCompletedBooks,
    ...serverCompletedBooks
  ]);

  const isCompleted = useCallback((book: string) => {
    return completedBooks.has(book);
  }, [completedBooks]);

  const markCompleted = useCallback((book: string) => {
    if (!user) {
      addLocalCompletedBook(book);
      setLocalCompletedBooksState(getLocalCompletedBooks());
    } else {
      queryClient.invalidateQueries({ queryKey: ["quiz-history"] });
    }
  }, [user, queryClient]);

  const migrateLocalProgressToServer = useCallback(async () => {
    const localBooks = getLocalCompletedBooks();
    if (localBooks.length === 0 || !user) return;

    try {
      const response = await fetch("/api/quiz/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ books: localBooks }),
      });

      if (response.ok) {
        clearLocalCompletedBooks();
        setLocalCompletedBooksState([]);
        queryClient.invalidateQueries({ queryKey: ["quiz-history"] });
      }
    } catch (error) {
      console.error("Failed to migrate quiz progress:", error);
    }
  }, [user, queryClient]);

  useEffect(() => {
    if (user) {
      migrateLocalProgressToServer();
    }
  }, [user, migrateLocalProgressToServer]);

  const hasLocalProgress = localCompletedBooks.length > 0;

  return {
    completedBooks,
    isCompleted,
    markCompleted,
    hasLocalProgress,
    serverHistory,
  };
}
