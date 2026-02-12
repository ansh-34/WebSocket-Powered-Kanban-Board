import React, { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { io } from "socket.io-client";

const COLUMNS = [
    { id: "todo", label: "To Do" },
    { id: "in-progress", label: "In Progress" },
    { id: "done", label: "Done" },
];

const PRIORITIES = ["Low", "Medium", "High"];
const CATEGORIES = ["Bug", "Feature", "Enhancement"];
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
const CHART_COLORS = ["#6366f1", "#22c55e", "#f97316"];
const COMPLETION_COLORS = ["#10b981", "#e2e8f0"];

const createEmptyTask = () => ({
    title: "",
    description: "",
    priority: "Medium",
    category: "Feature",
});

function KanbanBoard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [form, setForm] = useState(createEmptyTask());
    const [error, setError] = useState("");

    useEffect(() => {
        const socketInstance = io("http://localhost:5000", {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 500,
        });

        socketInstance.on("connect", () => {
            setLoading(true);
        });

        socketInstance.on("sync:tasks", (serverTasks) => {
            setTasks(serverTasks);
            setLoading(false);
        });

        socketInstance.on("task:create", (task) => {
            setTasks((prev) => [...prev, task]);
        });

        socketInstance.on("task:update", (task) => {
            setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
        });

        socketInstance.on("task:move", (task) => {
            setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
        });

        socketInstance.on("task:delete", (taskId) => {
            setTasks((prev) => prev.filter((item) => item.id !== taskId));
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const groupedTasks = useMemo(() => {
        return COLUMNS.reduce((acc, column) => {
            acc[column.id] = tasks.filter((task) => task.column === column.id);
            return acc;
        }, {});
    }, [tasks]);

    const totals = useMemo(() => {
        const counts = COLUMNS.reduce((acc, column) => {
            acc[column.id] = groupedTasks[column.id]?.length ?? 0;
            return acc;
        }, {});
        const total = tasks.length;
        const doneCount = counts.done ?? 0;
        const completion = total === 0 ? 0 : Math.round((doneCount / total) * 100);
        return { counts, total, completion };
    }, [groupedTasks, tasks.length]);

    const chartData = useMemo(() => {
        return COLUMNS.map((column) => ({
            name: column.label,
            value: totals.counts[column.id] ?? 0,
        }));
    }, [totals.counts]);

    const completionData = useMemo(() => {
        const doneCount = totals.counts.done ?? 0;
        const remaining = Math.max(totals.total - doneCount, 0);
        return [
            { name: "Done", value: doneCount },
            { name: "Remaining", value: remaining },
        ];
    }, [totals.counts, totals.total]);

    const handleAddTask = (event) => {
        event.preventDefault();
        if (!form.title.trim()) {
            setError("Task title is required.");
            return;
        }
        setError("");

        const newTask = {
            id: crypto.randomUUID(),
            title: form.title.trim(),
            description: form.description.trim(),
            priority: form.priority,
            category: form.category,
            attachments: [],
            column: "todo",
        };

        socket?.emit("task:create", newTask);
        setForm(createEmptyTask());
    };

    const handleUpdateTask = (taskId, updates) => {
        const task = tasks.find((item) => item.id === taskId);
        if (!task) return;
        const updatedTask = { ...task, ...updates };
        socket?.emit("task:update", updatedTask);
    };

    const handleDeleteTask = (taskId) => {
        socket?.emit("task:delete", taskId);
    };

    const handleDragStart = (event, taskId) => {
        event.dataTransfer.setData("text/plain", taskId);
    };

    const handleDrop = (event, columnId) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text/plain");
        const task = tasks.find((item) => item.id === taskId);
        if (!task || task.column === columnId) return;
        socket?.emit("task:move", { ...task, column: columnId });
    };

    const handleFileUpload = (taskId, file) => {
        if (!file) return;
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError("Unsupported file type. Upload images or PDFs only.");
            return;
        }
        setError("");
        const url = URL.createObjectURL(file);
        const attachment = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            url,
        };

        const task = tasks.find((item) => item.id === taskId);
        if (!task) return;
        const updatedTask = { ...task, attachments: [...task.attachments, attachment] };
        socket?.emit("task:update", updatedTask);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-3">
                <h2 className="text-2xl font-semibold text-slate-900">Kanban Board</h2>
                <p className="text-sm text-slate-600">
                    Drag cards between columns or edit fields inline to update tasks in real-time.
                </p>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Task Progress</h3>
                        <p className="text-sm text-slate-500">
                            {totals.total} total tasks · {totals.completion}% complete
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className="h-3 w-64 overflow-hidden rounded-full bg-slate-200"
                            aria-label="progress-bar"
                        >
                            <div
                                className="h-full rounded-full bg-indigo-500 transition-all"
                                style={{ width: `${totals.completion}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                            {totals.completion}%
                        </span>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                    {COLUMNS.map((column) => (
                        <div key={column.id} className="rounded-full bg-slate-100 px-3 py-1">
                            <span className="font-semibold text-slate-800">{column.label}:</span>{" "}
                            {totals.counts[column.id] ?? 0}
                        </div>
                    ))}
                </div>
                <div
                    className="mt-6 grid gap-6 lg:grid-cols-2"
                    data-testid="tasks-chart"
                    aria-label="tasks-chart"
                >
                    <div className="h-64 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-700">Tasks per Column</h4>
                        <div className="mt-4 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" name="Tasks">
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${entry.name}`}
                                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="h-64 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-700">Completion Split</h4>
                        <div className="mt-4 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip />
                                    <Legend />
                                    <Pie
                                        data={completionData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={4}
                                    >
                                        {completionData.map((entry, index) => (
                                            <Cell
                                                key={`slice-${entry.name}`}
                                                fill={COMPLETION_COLORS[index % COMPLETION_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Create Task</h3>
                <form onSubmit={handleAddTask} className="mt-4 grid gap-4 md:max-w-xl">
                    <input
                        aria-label="Task title"
                        placeholder="Task title"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={form.title}
                        onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                    <textarea
                        aria-label="Task description"
                        placeholder="Task description"
                        className="min-h-22.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={form.description}
                        onChange={(event) =>
                            setForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm text-slate-600">
                            Priority
                            <select
                                aria-label="Priority"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.priority}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, priority: event.target.value }))
                                }
                            >
                                {PRIORITIES.map((priority) => (
                                    <option key={priority} value={priority}>
                                        {priority}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-slate-600">
                            Category
                            <select
                                aria-label="Category"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.category}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, category: event.target.value }))
                                }
                            >
                                {CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
                    <button
                        type="submit"
                        className="w-40 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                    >
                        Add Task
                    </button>
                </form>
            </section>

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                    Loading tasks...
                </div>
            ) : (
                <section className="grid gap-6 lg:grid-cols-3">
                    {COLUMNS.map((column) => (
                        <div
                            key={column.id}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleDrop(event, column.id)}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            data-testid={`column-${column.id}`}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="text-base font-semibold text-slate-900">{column.label}</h4>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                                    {groupedTasks[column.id]?.length ?? 0}
                                </span>
                            </div>
                            <div className="grid gap-4">
                                {groupedTasks[column.id]?.map((task) => (
                                    <article
                                        key={task.id}
                                        draggable
                                        onDragStart={(event) => handleDragStart(event, task.id)}
                                        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                        data-testid={`task-${task.id}`}
                                    >
                                        <input
                                            aria-label={`Task title ${task.title}`}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={task.title}
                                            onChange={(event) =>
                                                handleUpdateTask(task.id, { title: event.target.value })
                                            }
                                        />
                                        <textarea
                                            aria-label={`Task description ${task.title}`}
                                            className="min-h-18.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={task.description}
                                            onChange={(event) =>
                                                handleUpdateTask(task.id, { description: event.target.value })
                                            }
                                        />
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
                                                Priority
                                                <select
                                                    aria-label={`Priority ${task.title}`}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    value={task.priority}
                                                    onChange={(event) =>
                                                        handleUpdateTask(task.id, {
                                                            priority: event.target.value,
                                                        })
                                                    }
                                                >
                                                    {PRIORITIES.map((priority) => (
                                                        <option key={priority} value={priority}>
                                                            {priority}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
                                                Category
                                                <select
                                                    aria-label={`Category ${task.title}`}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    value={task.category}
                                                    onChange={(event) =>
                                                        handleUpdateTask(task.id, {
                                                            category: event.target.value,
                                                        })
                                                    }
                                                >
                                                    {CATEGORIES.map((category) => (
                                                        <option key={category} value={category}>
                                                            {category}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>
                                        <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
                                            Attachments
                                            <input
                                                type="file"
                                                aria-label={`Upload ${task.title}`}
                                                className="w-full rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-400"
                                                onChange={(event) =>
                                                    handleFileUpload(task.id, event.target.files?.[0])
                                                }
                                            />
                                        </label>
                                        {task.attachments.length > 0 && (
                                            <div className="grid gap-3 text-xs text-slate-600">
                                                {task.attachments.map((file) => (
                                                    <div key={file.id}>
                                                        {file.type.startsWith("image/") ? (
                                                            <img
                                                                src={file.url}
                                                                alt={file.name}
                                                                className="w-full rounded-lg border border-slate-200"
                                                            />
                                                        ) : (
                                                            <a
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-indigo-600 hover:text-indigo-500"
                                                            >
                                                                {file.name}
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                        >
                                            Delete
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}

export default KanbanBoard;
