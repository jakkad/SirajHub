import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { BookshelfView } from "../components/views/BookshelfView";

export const Route = createFileRoute("/books")({
  component: BooksPage,
});

function BooksPage() {
  return (
    <TypePageLayout
      contentType="book"
      title="Books"
      color="var(--color-book)"
      icon="📚"
    >
      {(items) => <BookshelfView items={items} />}
    </TypePageLayout>
  );
}
