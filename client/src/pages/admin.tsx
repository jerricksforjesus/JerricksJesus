import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save } from "lucide-react";
import { useState } from "react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [verse, setVerse] = useState("For where two or three are gathered together in my name, there am I in the midst of them.");
  const [reference, setReference] = useState("Matthew 18:20");

  const handleSaveVerse = () => {
    toast({
      title: "Verse Updated",
      description: "The verse of the day has been updated successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Navigation />
      
      <div className="pt-32 pb-12 px-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage website content and replays.</p>
        </div>

        <Tabs defaultValue="verse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="verse">Verse of the Day</TabsTrigger>
            <TabsTrigger value="replays">Manage Replays</TabsTrigger>
          </TabsList>

          <TabsContent value="verse">
            <Card>
              <CardHeader>
                <CardTitle>Edit Verse</CardTitle>
                <CardDescription>Update the featured verse displayed on the homepage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="verse-text">Verse Text</Label>
                  <Textarea 
                    id="verse-text" 
                    value={verse}
                    onChange={(e) => setVerse(e.target.value)}
                    className="min-h-[120px] text-lg font-serif"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input 
                    id="reference" 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="font-medium"
                  />
                </div>
                <Button onClick={handleSaveVerse} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" /> Update Verse
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="replays">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sermon Replays</CardTitle>
                  <CardDescription>Add or remove past sermon videos.</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add New
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-10 bg-muted rounded overflow-hidden">
                          <div className="w-full h-full bg-zinc-200 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-medium">Sunday Service - Nov {24 - i * 7}</h4>
                          <p className="text-xs text-muted-foreground">Duration: 45:00 • Views: 120</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
