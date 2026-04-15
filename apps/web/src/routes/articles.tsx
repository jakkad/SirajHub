import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { ArticleList } from "../components/views/ArticleList";

export const Route = createFileRoute("/articles")({
  component: ArticlesPage,
});

function ArticlesPage() {
  return (
    <TypePageLayout
      contentType="article"
      title="Articles"
      color="var(--color-article)"
      icon="📄"
    >
      {(items) => <ArticleList items={items} />}
    </TypePageLayout>
  );
}
