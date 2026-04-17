import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { TweetFeed } from "../components/views/TweetFeed";

export const Route = createFileRoute("/tweets")({
  component: TweetsPage,
});

function TweetsPage() {
  return (
    <TypePageLayout
      contentType="tweet"
      title="Tweets"
      color="var(--color-tweet)"
    >
      {(items, selectionProps) => <TweetFeed items={items} selectionProps={selectionProps} />}
    </TypePageLayout>
  );
}
