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
import { useState } from 'react';

export function CommandsClient() {
  const [catFactResult, setCatFactResult] = useState<string>('');
  const [generalFactResult, setGeneralFactResult] = useState<string>('');
  const [loading, setLoading] = useState({ cat: false, general: false });

  const runCatFact = async () => {
    setLoading(prev => ({ ...prev, cat: true }));
    try {
      const response = await fetch('https://catfact.ninja/fact');
      const data = await response.json();
      if (response.status === 429) {
        setCatFactResult('Error: Rate limit exceeded. Please try again later.');
        return;
      }
      if (!response.ok) {
        setCatFactResult('Error: Failed to fetch cat fact');
        return;
      }
      setCatFactResult(data.fact);
    } catch (error) {
      setCatFactResult(`Error: ${error}`);
    } finally {
      setLoading(prev => ({ ...prev, cat: false }));
    }
  };

  const runGeneralFact = async () => {
    setLoading(prev => ({ ...prev, general: true }));
    try {
      const response = await fetch('https://nekos.life/api/v2/fact');
      const data = await response.json();
      if (!response.ok) {
        setGeneralFactResult('Error: Failed to fetch general fact');
        return;
      }
      setGeneralFactResult(data.fact);
    } catch (error) {
      setGeneralFactResult(`Error: ${error}`);
    } finally {
      setLoading(prev => ({ ...prev, general: false }));
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

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
              <Button
                onClick={runCatFact}
                variant="secondary"
                disabled={loading.cat}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                {!loading.cat && <Terminal />}
                {loading.cat ? 'Loading...' : 'Run Command'}
              </Button>
            </div>
            
            {catFactResult && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                {/* <p className="text-sm font-semibold mb-2">Result:</p> */}
                <p className="text-sm">{catFactResult}</p>
              </div>
            )}
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
              <Button
                onClick={runGeneralFact}
                variant="secondary"
                disabled={loading.general}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                {!loading.general && <Terminal />}
                {loading.general ? 'Loading...' : 'Run Command'}
              </Button>
            </div>
            
            {generalFactResult && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                {/* <p className="text-sm font-semibold mb-2">Result:</p> */}
                <p className="text-sm">{generalFactResult}</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

    </main>
  );
}