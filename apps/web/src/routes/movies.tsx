import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { MoviePosterGrid } from "../components/views/MoviePosterGrid";

export const Route = createFileRoute("/movies")({
  component: MoviesPage,
});

function MoviesPage() {
  return (
    <TypePageLayout
      contentType="movie"
      title="Movies"
      color="var(--color-movie)"
    >
      {(items, selectionProps) => <MoviePosterGrid items={items} selectionProps={selectionProps} />}
    </TypePageLayout>
  );
}
