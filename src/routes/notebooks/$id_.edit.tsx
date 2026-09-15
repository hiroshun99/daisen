import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/notebooks/$id_/edit")({
  component: EditRedirect,
});

function EditRedirect() {
  const { id } = Route.useParams();
  return <Navigate to="/notebooks/$id" params={{ id }} />;
}
