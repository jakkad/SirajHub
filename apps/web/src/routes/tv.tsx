import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { TVPosterGrid } from "../components/views/TVPosterGrid";

export const Route = createFileRoute("/tv")({
  component: TVPage,
});

function TVPage() {
  return (
    <TypePageLayout
      contentType="tv"
      title="TV Shows"
      color="var(--color-tv)"
    >
      {(items) => <TVPosterGrid items={items} />}
    </TypePageLayout>
  );
}
