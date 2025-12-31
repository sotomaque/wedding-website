export function Footer() {
  return (
    <footer className="py-12 px-6 bg-card border-t border-border">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <p className="text-2xl font-serif text-foreground">
          We can't wait to celebrate with you!
        </p>
        <p className="text-muted-foreground text-sm">
          For questions, please contact us at{" "}
          <a
            href="mailto:wedding@example.com"
            className="underline hover:text-accent transition-colors"
          >
            wedding@example.com
          </a>
        </p>
        <p className="text-muted-foreground text-xs pt-4">© 2025 Helen & Enrique</p>
      </div>
    </footer>
  );
}
