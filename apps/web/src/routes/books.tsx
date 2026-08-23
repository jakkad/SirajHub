import { createFileRoute } from "@tanstack/react-router";
import { TypePageLayout } from "../components/views/TypePageLayout";
import { BookGridView } from "../components/views/BookGridView";

export const Route = createFileRoute("/books")({
  component: BooksPage,
});

function BooksPage() {
  return (
    <TypePageLayout
      contentType="book"
      title="Books"
      color="var(--color-book)"
      defaultStatusFilter="finished"
    >
      {(items, selectionProps) => <BookGridView items={items} selectionProps={selectionProps} />}
    </TypePageLayout>
  );
}
