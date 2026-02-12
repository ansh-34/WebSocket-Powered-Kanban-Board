import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";

import KanbanBoard from "../../components/KanbanBoard.jsx";

let handlers = {};
const mockSocket = {
  on: (event, callback) => {
    handlers[event] = callback;
  },
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

beforeEach(() => {
  handlers = {};
  mockSocket.emit.mockClear();
});

const waitForSocketHandlers = async () => {
  await waitFor(() => {
    expect(handlers["sync:tasks"]).toBeDefined();
  });
};

const syncTasks = async (tasks = []) => {
  await act(async () => {
    handlers["sync:tasks"]?.(tasks);
  });
  await waitFor(() => {
    expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
  });
};

test("renders Kanban board title", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();
  expect(screen.getByText("Kanban Board")).toBeInTheDocument();
});

test("creates a task and emits socket event", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();

  fireEvent.change(screen.getByLabelText("Task title"), {
    target: { value: "Ship UI" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add Task" }));

  expect(mockSocket.emit).toHaveBeenCalledWith(
    "task:create",
    expect.objectContaining({ title: "Ship UI", column: "todo" })
  );
});

test("shows error when title is empty", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();

  fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
  expect(screen.getByText("Task title is required.")).toBeInTheDocument();
});

test("updates progress when task moves to done", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();

  const task = {
    id: "task-2",
    title: "Review",
    description: "",
    priority: "Medium",
    category: "Feature",
    column: "todo",
    attachments: [],
  };

  await act(async () => {
    handlers["task:create"]?.(task);
    handlers["task:move"]?.({ ...task, column: "done" });
  });
  await waitFor(() => {
    expect(
      screen.queryAllByText((_, element) => element?.textContent?.includes("100% complete"))
        .length
    ).toBeGreaterThan(0);
  });
});

test("shows error on invalid attachment type", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();

  const task = {
    id: "task-3",
    title: "Docs",
    description: "",
    priority: "Medium",
    category: "Feature",
    column: "todo",
    attachments: [],
  };

  await act(async () => {
    handlers["task:create"]?.(task);
  });
  await waitFor(() => {
    expect(screen.getByLabelText("Upload Docs")).toBeInTheDocument();
  });

  const fileInput = screen.getByLabelText("Upload Docs");
  fireEvent.change(fileInput, {
    target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] },
  });

  expect(
    screen.getByText("Unsupported file type. Upload images or PDFs only.")
  ).toBeInTheDocument();
});

test("deletes a task and emits socket event", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();

  const task = {
    id: "task-1",
    title: "Clean up",
    description: "",
    priority: "Medium",
    category: "Feature",
    column: "todo",
    attachments: [],
  };

  await act(async () => {
    handlers["task:create"]?.(task);
  });
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(mockSocket.emit).toHaveBeenCalledWith("task:delete", "task-1");
});
