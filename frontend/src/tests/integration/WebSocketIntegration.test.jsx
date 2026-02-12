import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";

import KanbanBoard from "../../components/KanbanBoard";

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

test("WebSocket receives task update", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();

  const task = {
    id: "task-10",
    title: "Initial",
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
    expect(screen.getByDisplayValue("Initial")).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Priority Initial"), {
    target: { value: "High" },
  });

  expect(mockSocket.emit).toHaveBeenCalledWith(
    "task:update",
    expect.objectContaining({ id: "task-10", priority: "High" })
  );
});

test("sync:tasks hydrates columns", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks([
    {
      id: "task-a",
      title: "Backlog",
      description: "",
      priority: "Low",
      category: "Feature",
      column: "todo",
      attachments: [],
    },
    {
      id: "task-b",
      title: "Active",
      description: "",
      priority: "High",
      category: "Bug",
      column: "in-progress",
      attachments: [],
    },
    {
      id: "task-c",
      title: "Done",
      description: "",
      priority: "Medium",
      category: "Enhancement",
      column: "done",
      attachments: [],
    },
  ]);

  expect(screen.getByDisplayValue("Backlog")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Active")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Done")).toBeInTheDocument();
});

test("task delete event removes card", async () => {
  render(<KanbanBoard />);
  await waitForSocketHandlers();
  await syncTasks();

  const task = {
    id: "task-z",
    title: "Delete me",
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
    expect(screen.getByDisplayValue("Delete me")).toBeInTheDocument();
  });

  await act(async () => {
    handlers["task:delete"]?.("task-z");
  });

  await waitFor(() => {
    expect(screen.queryByDisplayValue("Delete me")).toBeNull();
  });
});
