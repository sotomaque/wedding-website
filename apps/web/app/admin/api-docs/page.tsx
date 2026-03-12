import dynamic from "next/dynamic";

const SwaggerUIClient = dynamic(() => import("./swagger-ui-client"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">Loading API documentation...</p>
    </div>
  ),
});

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-foreground mb-2">
          API Documentation
        </h1>
        <p className="text-muted-foreground">
          Interactive API reference for the wedding website. Use the quick
          tester below to send requests to your local endpoints, or browse the
          full OpenAPI specification.
        </p>
      </div>
      <SwaggerUIClient specUrl="/openapi.json" />
    </div>
  );
}
