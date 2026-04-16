import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { VideoGrid } from "../components/views/VideoGrid";

export const Route = createFileRoute("/videos")({
  component: VideosPage,
});

function VideosPage() {
  return (
    <TypePageLayout
      contentType="youtube"
      title="Videos"
      color="var(--color-youtube)"
    >
      {(items) => <VideoGrid items={items} />}
    </TypePageLayout>
  );
}
