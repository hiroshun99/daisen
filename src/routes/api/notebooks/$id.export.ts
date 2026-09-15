import { createFileRoute } from "@tanstack/react-router";
import { handleNotebookExport } from "@/lib/notebooks/export.server";

export const Route = createFileRoute("/api/notebooks/$id/export")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        return handleNotebookExport(request, params.id);
      },
    },
  },
});
