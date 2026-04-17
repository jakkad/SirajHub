import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { PodcastGrid } from "../components/views/PodcastGrid";

export const Route = createFileRoute("/podcasts")({
  component: PodcastsPage,
});

function PodcastsPage() {
  return (
    <TypePageLayout
      contentType="podcast"
      title="Podcasts"
      color="var(--color-podcast)"
    >
      {(items, selectionProps) => <PodcastGrid items={items} selectionProps={selectionProps} />}
    </TypePageLayout>
  );
}
