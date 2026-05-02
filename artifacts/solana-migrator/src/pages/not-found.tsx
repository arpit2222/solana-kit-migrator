import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 space-y-6">
      <div className="text-6xl font-bold font-mono text-muted-foreground/30">404</div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold font-mono">Page not found</h1>
        <p className="text-sm font-mono text-muted-foreground">This route doesn't exist.</p>
      </div>
      <Link
        href="/"
        className="text-sm font-mono text-primary hover:underline underline-offset-4"
      >
        ← back to home
      </Link>
    </div>
  );
}
