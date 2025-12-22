import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: "#EDEBE5" }}>
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <h1 className="text-2xl font-serif font-bold text-foreground mb-4">
            Sorry, this page does not exist
          </h1>

          <Link href="/">
            <Button className="mt-4" style={{ backgroundColor: "#b47a5f", color: "#ffffff" }} data-testid="button-navigate-home">
              <Home className="w-4 h-4 mr-2" />
              Navigate back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
