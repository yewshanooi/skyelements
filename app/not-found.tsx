import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { House } from 'lucide-react';
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-240px)] px-4">
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-semibold text-balance text-red-600">404</h2>
        <h1 className="scroll-m-20 text-4xl text-center font-semibold text-balance">
          Page Not Found
        </h1>
        <p className="text-muted-foreground max-w-md text-center text-l">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button variant="secondary" asChild>
            <Link href="/">
              <House /> Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
