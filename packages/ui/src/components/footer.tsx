interface FooterProps {
  email?: string;
  coupleName?: string;
}

export function Footer({
  email = "wedding@example.com",
  coupleName = "Helen & Enrique",
}: FooterProps) {
  return (
    <footer className="py-12 px-6 bg-card border-t border-border">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <p className="text-2xl font-serif text-foreground">
          We can't wait to celebrate with you!
        </p>
        <p className="text-muted-foreground text-sm">
          For questions, please contact us at{" "}
          <a
            href={`mailto:${email}`}
            className="underline hover:text-accent transition-colors"
          >
            {email}
          </a>
        </p>
        <p className="text-muted-foreground text-xs pt-4">
          © {new Date().getFullYear()} {coupleName}
        </p>
      </div>
    </footer>
  );
}
