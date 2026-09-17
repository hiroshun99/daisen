import { FileDown } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getBearerToken } from "@/lib/auth/client";
import {
  exportFilename,
  notebookExportPath,
  type ExportNotebook,
} from "@/lib/notebooks/export";

function useExportHref(id: string, format: "csv" | "pdf" | "md") {
  return useMemo(() => {
    return notebookExportPath(id, format, {
      access: getBearerToken(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, [id, format]);
}

export function NotebookExport({ note }: { note: ExportNotebook }) {
  const csvHref = useExportHref(note.id, "csv");
  const pdfHref = useExportHref(note.id, "pdf");
  const mdHref = useExportHref(note.id, "md");

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <a href={mdHref} download={exportFilename(note.id, "md")}>
          <FileDown />
          Markdown
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={csvHref} download={exportFilename(note.id, "csv")}>
          <FileDown />
          CSV
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={pdfHref} download={exportFilename(note.id, "pdf")}>
          <FileDown />
          PDF
        </a>
      </Button>
    </div>
  );
}
