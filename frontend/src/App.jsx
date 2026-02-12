import React from "react";
import KanbanBoard from "./components/KanbanBoard";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Real-time Collaboration
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Real-time Kanban Board
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Track tasks, upload attachments, and watch progress updates sync instantly across
            everyone connected.
          </p>
        </header>
        <KanbanBoard />
      </div>
    </div>
  );
}

export default App;
