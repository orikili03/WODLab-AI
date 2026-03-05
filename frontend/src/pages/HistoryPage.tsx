import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Eye, X, Trash2, Loader2 } from "lucide-react";
import { useWorkoutHistoryInfinite, useClearWorkoutHistory, useDeleteWorkout } from "../domains/workouts/hooks";
import { expandForDisplay } from "../lib/abbreviations";
import { WodBlock } from "../components/wod/WodBlock";
import { formatProtocol } from "../lib/formatters";
import type { WorkoutResponse } from "../domains/workouts/api";

/** Derive a compact score string from session + performed data, protocol-aware.
 *  Does NOT include RX — render the RX badge separately via workout.session?.rx. */
function deriveScoreDisplay(workout: WorkoutResponse): string | undefined {
    if (!workout.completedAt) return undefined;

    const type  = workout.wod.type;
    const s     = workout.session;
    const first = workout.wod.movementItems[0]?.performed;

    if (["FOR_TIME", "21_15_9", "CHIPPER", "INTERVAL"].includes(type)) {
        if (s?.totalSeconds != null) {
            const m   = Math.floor(s.totalSeconds / 60);
            const sec = s.totalSeconds % 60;
            return `${m}:${String(sec).padStart(2, "0")}`;
        }
    } else if (["AMRAP", "EMOM", "DEATH_BY", "LADDER"].includes(type)) {
        const rounds = first?.volume?.repsPerRound?.length;
        if (rounds) return `${rounds} rounds`;
    } else if (type === "TABATA") {
        const rpr = first?.volume?.repsPerRound;
        if (rpr && rpr.length > 0) {
            const avg = Math.round(rpr.reduce((a, b) => a + b, 0) / rpr.length);
            return `${avg} reps avg`;
        }
    } else if (type === "STRENGTH_SINGLE") {
        if (first?.load != null) return `${first.load} kg (1RM)`;
    } else if (type === "STRENGTH_SETS") {
        if (first?.load != null) return `${first.load} kg`;
    }

    return workout.completedAt ? "Complete" : undefined;
}

function filterHistory(
    list: WorkoutResponse[],
    searchQuery: string,
    filterType: string,
    filterDuration: string
): WorkoutResponse[] {
    let out = list;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
        out = out.filter((w) => {
            const type = (w.wod?.type ?? w.type ?? "").toLowerCase();
            const movements = (w.wod?.movementItems ?? []).map((m) => m.name).join(" ").toLowerCase();
            const dateStr = (w.dateString ?? "").toLowerCase();
            const searchable = [type, movements, dateStr].join(" ");
            return searchable.includes(q);
        });
    }

    if (filterType) {
        out = out.filter((w) => (w.wod?.type ?? w.type) === filterType);
    }

    if (filterDuration) {
        out = out.filter((w) => {
            const d = w.durationMinutes ?? w.wod?.duration ?? 0;
            if (filterDuration === "short") return d <= 12;
            if (filterDuration === "medium") return d >= 13 && d <= 22;
            if (filterDuration === "long") return d >= 23;
            return true;
        });
    }

    return out;
}

export function HistoryPage() {
    const queryClient = useQueryClient();

    // ─── Infinite Query ───────────────────────────────────────────────────
    const {
        data: infiniteData,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useWorkoutHistoryInfinite();

    const clearHistoryMutation = useClearWorkoutHistory();
    const deleteWorkoutMutation = useDeleteWorkout();

    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDuration, setFilterDuration] = useState("");
    const [viewWorkout, setViewWorkout] = useState<WorkoutResponse | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmDeleteWorkout, setConfirmDeleteWorkout] = useState<WorkoutResponse | null>(null);

    // Flatten all pages into a single list
    const allWorkouts = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const totalCount = infiniteData?.pages[0]?.total ?? 0;

    const handleClearHistory = () => {
        clearHistoryMutation.mutate(undefined, {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["workouts"] });
                setViewWorkout(null);
                setConfirmDeleteOpen(false);
            },
        });
    };

    const handleDeleteSingle = () => {
        if (!confirmDeleteWorkout) return;
        deleteWorkoutMutation.mutate(confirmDeleteWorkout.id, {
            onSuccess: () => {
                if (viewWorkout?.id === confirmDeleteWorkout.id) setViewWorkout(null);
                setConfirmDeleteWorkout(null);
            },
        });
    };

    // ─── Client-Side Filtering (applied to all loaded pages) ──────────────
    const filtered = useMemo(
        () => filterHistory(allWorkouts, searchQuery, filterType, filterDuration),
        [allWorkouts, searchQuery, filterType, filterDuration]
    );

    const hasActiveFilters = !!(searchQuery || filterType || filterDuration);

    const wodTypes = useMemo(() => {
        const set = new Set<string>();
        allWorkouts.forEach((w) => {
            const t = w.wod?.type ?? w.type;
            if (t) set.add(t);
        });
        return Array.from(set).sort();
    }, [allWorkouts]);

    // ─── Infinite Scroll Sentinel ─────────────────────────────────────────
    const sentinelRef = useRef<HTMLDivElement>(null);

    const handleIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
        [hasNextPage, isFetchingNextPage, fetchNextPage]
    );

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(handleIntersect, {
            rootMargin: "200px", // trigger 200px before bottom
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [handleIntersect]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-ds-text">History</h1>
                <p className="text-sm text-ds-text-muted mt-1">
                    {totalCount > 0
                        ? `${totalCount} workout${totalCount !== 1 ? "s" : ""} logged. Click the eye to view details.`
                        : "Your past workouts will appear here."}
                </p>
            </div>

            {/* ── Search & Filters ─────────────────────────────────────── */}
            {allWorkouts.length > 0 && (
                <div className="rounded-ds-xl border border-ds-border bg-ds-surface p-ds-3 shadow-ds-sm space-y-3">
                    <div className="relative">
                        <Search
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-muted"
                            aria-hidden
                        />
                        <input
                            type="search"
                            placeholder="Search by type, movements, date, description…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-ds-md border border-ds-border bg-ds-bg py-2.5 pl-4 pr-10 text-ds-body-sm text-ds-text placeholder:text-ds-text-muted focus:border-ds-border-strong focus:outline-none focus:ring-1 focus:ring-ds-border-strong"
                            aria-label="Search workouts"
                        />
                    </div>
                    <div className="flex flex-nowrap items-stretch gap-2">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="min-w-0 flex-1 rounded-ds-md border border-ds-border bg-ds-bg px-3 py-2 text-ds-body-sm text-ds-text focus:border-ds-border-strong focus:outline-none"
                            aria-label="Filter by WOD type"
                        >
                            <option value="">All types</option>
                            {wodTypes.map((t) => (
                                <option key={t} value={t}>{formatProtocol(t)}</option>
                            ))}
                        </select>
                        <select
                            value={filterDuration}
                            onChange={(e) => setFilterDuration(e.target.value)}
                            className="min-w-0 flex-1 rounded-ds-md border border-ds-border bg-ds-bg px-3 py-2 text-ds-body-sm text-ds-text focus:border-ds-border-strong focus:outline-none"
                            aria-label="Filter by duration"
                        >
                            <option value="">Any duration</option>
                            <option value="short">Short (≤12 min)</option>
                            <option value="medium">Medium (13–22 min)</option>
                            <option value="long">Long (23+ min)</option>
                        </select>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterType("");
                                    setFilterDuration("");
                                }}
                                className="min-w-0 flex-1 flex items-center justify-center gap-1.5 rounded-ds-md px-3 py-2 text-ds-body-sm font-medium text-ds-text-muted transition-colors hover:bg-ds-surface-hover hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-border focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <p className="mt-2 text-ds-caption text-ds-text-muted">
                            Showing {filtered.length} of {totalCount} workouts
                            {hasNextPage && " (scroll for more)"}
                        </p>
                    )}
                </div>
            )}

            {/* ── Workout List ─────────────────────────────────────────── */}
            <div className="card">
                {isLoading && <p className="text-sm text-ds-text-muted">Loading...</p>}
                {!isLoading && allWorkouts.length === 0 && (
                    <p className="text-sm text-ds-text-muted">No workout history available.</p>
                )}
                {!isLoading && allWorkouts.length > 0 && filtered.length === 0 && (
                    <p className="text-sm text-ds-text-muted">No workouts match your search or filters.</p>
                )}
                {!isLoading && filtered.length > 0 && (
                    <ul className="divide-y divide-ds-border text-sm">
                        {filtered.map((w) => (
                            <li key={w.id} className="py-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-medium text-ds-text">
                                        {formatProtocol(w.wod.type)}
                                        {(w.wod.duration ?? w.durationMinutes) != null && (w.wod.duration ?? w.durationMinutes) > 0 && (
                                            <> • {(w.wod.duration ?? w.durationMinutes)} min</>
                                        )}
                                        {deriveScoreDisplay(w) && (
                                            <span className="text-ds-text-muted font-normal">
                                                {" · "}{deriveScoreDisplay(w)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-ds-text-muted">
                                        {w.dateString ?? ""} • {w.wod.movementItems.map((m) => expandForDisplay(m.name)).join(" / ")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteWorkout(w)}
                                        className="p-2 rounded-lg text-ds-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                        title="Delete workout"
                                        aria-label="Delete this workout"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewWorkout(w)}
                                        className="p-2 rounded-lg text-ds-text-muted hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                                        title="View workout"
                                        aria-label="View workout details"
                                    >
                                        <Eye className="h-5 w-5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* ── Infinite Scroll Sentinel & Loading Indicator ────── */}
                <div ref={sentinelRef} className="h-1" aria-hidden="true" />
                {isFetchingNextPage && (
                    <div className="flex items-center justify-center gap-2 py-4 text-ds-text-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-ds-body-sm">Loading more workouts…</span>
                    </div>
                )}
                {!isLoading && !hasNextPage && allWorkouts.length > 0 && (
                    <p className="text-center text-ds-caption text-ds-text-muted pt-4 pb-1">
                        You've reached the end — {totalCount} workout{totalCount !== 1 ? "s" : ""} total
                    </p>
                )}

                {/* ── Bulk Delete Button ───────────────────────────────── */}
                {allWorkouts.length > 0 && (
                    <div className="border-t border-ds-border pt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setConfirmDeleteOpen(true)}
                            disabled={clearHistoryMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-ds-md border border-ds-border-strong bg-ds-surface px-3 py-2 text-ds-body-sm font-medium text-ds-text-muted transition-colors hover:bg-ds-surface-hover hover:text-red-400 hover:border-red-400/50 disabled:opacity-50 disabled:pointer-events-none"
                            aria-label="Delete all workout history"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete history
                        </button>
                    </div>
                )}

                {/* ── Bulk Delete Confirmation Modal ───────────────────── */}
                {confirmDeleteOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => !clearHistoryMutation.isPending && setConfirmDeleteOpen(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-delete-title"
                        onKeyDown={(e) => {
                            if (e.key === "Escape" && !clearHistoryMutation.isPending) setConfirmDeleteOpen(false);
                        }}
                    >
                        <div
                            className="w-full max-w-sm rounded-ds-xl border border-ds-border bg-ds-surface p-6 shadow-ds-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                                <Trash2 className="h-6 w-6 text-red-400" />
                            </div>

                            <h2 id="confirm-delete-title" className="text-center text-lg font-semibold text-ds-text mb-2">
                                Delete All History?
                            </h2>
                            <p className="text-center text-ds-body-sm text-ds-text-muted mb-6">
                                This will permanently remove <strong className="text-ds-text">{totalCount} workout{totalCount !== 1 ? "s" : ""}</strong> from your history. This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteOpen(false)}
                                    disabled={clearHistoryMutation.isPending}
                                    className="flex-1 rounded-ds-xl border border-ds-border-strong bg-ds-surface px-4 py-3 text-ds-body-sm font-medium text-ds-text transition-all duration-250 hover:bg-ds-surface-hover active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearHistory}
                                    disabled={clearHistoryMutation.isPending}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-ds-xl bg-red-500/90 px-4 py-3 text-ds-body-sm font-semibold text-white shadow-ds-sm transition-all duration-250 hover:bg-red-500 hover:shadow-ds-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {clearHistoryMutation.isPending ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Deleting…
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4" />
                                            Delete All
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Single Workout Delete Confirmation Modal ──────── */}
                {confirmDeleteWorkout && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => !deleteWorkoutMutation.isPending && setConfirmDeleteWorkout(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-single-delete-title"
                        onKeyDown={(e) => {
                            if (e.key === "Escape" && !deleteWorkoutMutation.isPending) setConfirmDeleteWorkout(null);
                        }}
                    >
                        <div
                            className="w-full max-w-sm rounded-ds-xl border border-ds-border bg-ds-surface p-6 shadow-ds-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                                <Trash2 className="h-6 w-6 text-red-400" />
                            </div>

                            <h2 id="confirm-single-delete-title" className="text-center text-lg font-semibold text-ds-text mb-2">
                                Delete This Workout?
                            </h2>
                            <p className="text-center text-ds-body-sm text-ds-text-muted mb-1">
                                Are you sure you want to delete this workout?
                            </p>
                            <p className="text-center text-ds-body-sm text-ds-text mb-6">
                                <strong>{formatProtocol(confirmDeleteWorkout.wod.type)}</strong>
                                {" · "}
                                {confirmDeleteWorkout.dateString ?? ""}
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteWorkout(null)}
                                    disabled={deleteWorkoutMutation.isPending}
                                    className="flex-1 rounded-ds-xl border border-ds-border-strong bg-ds-surface px-4 py-3 text-ds-body-sm font-medium text-ds-text transition-all duration-250 hover:bg-ds-surface-hover active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteSingle}
                                    disabled={deleteWorkoutMutation.isPending}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-ds-xl bg-red-500/90 px-4 py-3 text-ds-body-sm font-semibold text-white shadow-ds-sm transition-all duration-250 hover:bg-red-500 hover:shadow-ds-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {deleteWorkoutMutation.isPending ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Deleting…
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Workout Detail Modal ─────────────────────────────── */}
                {viewWorkout && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setViewWorkout(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="workout-detail-title"
                    >
                        <div
                            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-ds-xl border border-ds-border bg-ds-surface p-5 shadow-ds-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <h2 id="workout-detail-title" className="text-lg font-semibold text-ds-text">
                                    {formatProtocol(viewWorkout.wod.type)}
                                    {(viewWorkout.wod.duration ?? viewWorkout.durationMinutes) != null && (viewWorkout.wod.duration ?? viewWorkout.durationMinutes) > 0 && (
                                        <> • {(viewWorkout.wod.duration ?? viewWorkout.durationMinutes)} min</>
                                    )}
                                </h2>
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setConfirmDeleteWorkout(viewWorkout);
                                            setViewWorkout(null);
                                        }}
                                        className="p-1.5 rounded-lg text-ds-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                        aria-label="Delete this workout"
                                        title="Delete workout"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <span className="mx-1 h-4 w-px bg-ds-border" aria-hidden="true" />
                                    <button
                                        type="button"
                                        onClick={() => setViewWorkout(null)}
                                        className="p-1.5 rounded-lg text-ds-text-muted hover:text-ds-text hover:bg-ds-surface-hover transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4 text-sm text-ds-text-muted">
                                {viewWorkout.dateString ?? ""}{" "}
                                at {viewWorkout.timeString ?? ""}
                            </div>
                            {viewWorkout.equipmentPresetName && (
                                <p className="mb-4 text-ds-body-sm text-ds-text-muted">
                                    Rig: <span className="font-medium text-ds-text">{viewWorkout.equipmentPresetName}</span>
                                </p>
                            )}

                            <div className="mb-4">
                                <WodBlock
                                    type={viewWorkout.wod.type}
                                    durationMinutes={viewWorkout.wod.duration ?? viewWorkout.durationMinutes ?? 0}
                                    rounds={viewWorkout.wod.rounds}
                                    movementItems={viewWorkout.wod.movementItems}
                                />
                            </div>

                            {viewWorkout.completedAt && (
                                <div className="rounded-ds-lg border border-ds-border bg-ds-surface-subtle p-4 space-y-2">
                                    <p className="text-xs uppercase tracking-wider text-ds-text-muted font-medium">Your result</p>
                                    <div className="flex flex-wrap items-center gap-4 text-ds-text">
                                        {deriveScoreDisplay(viewWorkout) && (
                                            <span><strong>Score</strong> {deriveScoreDisplay(viewWorkout)}</span>
                                        )}
                                        {viewWorkout.rpe != null && (
                                            <span><strong>RPE</strong> {viewWorkout.rpe}/5</span>
                                        )}
                                        {viewWorkout.session?.rx && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-amber-400/15 text-amber-400 border border-amber-400/25">
                                                RX
                                            </span>
                                        )}
                                    </div>
                                    {viewWorkout.session?.notes && (
                                        <p className="text-ds-body-sm text-ds-text-muted pt-1">
                                            {viewWorkout.session.notes}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
