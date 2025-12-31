export function Footer() {
  return (
    <footer className="py-12 px-6 bg-white border-t border-neutral-200">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <p className="text-2xl font-serif text-neutral-900">
          We can't wait to celebrate with you!
        </p>
        <p className="text-neutral-600 text-sm">
          For questions, please contact us at{" "}
          <a
            href="mailto:wedding@example.com"
            className="underline hover:text-neutral-900"
          >
            wedding@example.com
          </a>
        </p>
        <p className="text-neutral-400 text-xs pt-4">© 2025 Helen & Enrique</p>
      </div>
    </footer>
  );
}
