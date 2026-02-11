'use client';

import { Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from 'react';

export function CommandsClient() {
  const [catFactResult, setCatFactResult] = useState<string>('');
  const [generalFactResult, setGeneralFactResult] = useState<string>('');
  const [loading, setLoading] = useState({ cat: false, general: false });
  const [dialogOpen, setDialogOpen] = useState({ cat: false, general: false });

  const fetchFact = async (
    type: 'cat' | 'general',
    url: string,
    setResult: (result: string) => void,
    errorMessage: string
  ) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setResult('');
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.status === 429) {
        setResult('Error: Rate limit exceeded. Please try again later.');
        setDialogOpen(prev => ({ ...prev, [type]: true }));
        return;
      }

      if (!response.ok) {
        setResult(errorMessage);
        setDialogOpen(prev => ({ ...prev, [type]: true }));
        return;
      }

      setResult(data.fact);
      setDialogOpen(prev => ({ ...prev, [type]: true }));
    } catch (error) {
      setResult(`Error: ${error}`);
      setDialogOpen(prev => ({ ...prev, [type]: true }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const runCatFact = () => 
    fetchFact('cat', 'https://catfact.ninja/fact', setCatFactResult, 'Error: Failed to fetch cat fact');

  const runGeneralFact = () => 
    fetchFact('general', 'https://nekos.life/api/v2/fact', setGeneralFactResult, 'Error: Failed to fetch general fact');

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-24">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold text-balance">
          Commands
        </h1>
        <p className="text-muted-foreground text-center text-l">
          Preview commands from Sodium.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 w-full max-w-3xl items-start">

        <Card className="w-full h-fit">
          <CardHeader>
            <CardTitle>Cat Fact</CardTitle>
            <CardDescription>
              Get a random cat fact
            </CardDescription>
            <CardAction>
              <CardDescription>
                <Badge variant="outline">catfact.ninja — v1</Badge>
              </CardDescription>
            </CardAction>
          </CardHeader>
          
          <CardContent>

            <div className="flex gap-2">
              <AlertDialog open={dialogOpen.cat} onOpenChange={(open) => setDialogOpen(prev => ({ ...prev, cat: open }))}>
                <Button
                  onClick={runCatFact}
                  variant="secondary"
                  disabled={loading.cat}
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  {!loading.cat && <Terminal />}
                  {loading.cat ? 'Loading...' : 'Run Command'}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cat Fact</AlertDialogTitle>
                    <AlertDialogDescription>
                      {catFactResult}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

          </CardContent>
        </Card>

        <Card className="w-full h-fit">
          <CardHeader>
            <CardTitle>General Fact</CardTitle>
            <CardDescription>
              Get a random general fact
            </CardDescription>
            <CardAction>
              <CardDescription>
                <Badge variant="outline">nekos.life — v2</Badge>
              </CardDescription>
            </CardAction>
          </CardHeader>
          
          <CardContent>

            <div className="flex gap-2">
              <AlertDialog open={dialogOpen.general} onOpenChange={(open) => setDialogOpen(prev => ({ ...prev, general: open }))}>
                <Button
                  onClick={runGeneralFact}
                  variant="secondary"
                  disabled={loading.general}
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  {!loading.general && <Terminal />}
                  {loading.general ? 'Loading...' : 'Run Command'}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>General Fact</AlertDialogTitle>
                    <AlertDialogDescription>
                      {generalFactResult}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

          </CardContent>
        </Card>

      </div>

    </main>
  );
}