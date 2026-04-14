import { createFileRoute } from "@tanstack/react-router";
import { BoardView } from "../components/BoardView";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6">
      <BoardView />
    </div>
  );
}
