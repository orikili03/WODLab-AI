import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Layers, ChevronRight } from "lucide-react";
import { useCompleteWorkout } from "../../domains/workouts/hooks";
import { formatTime } from "../../domains/timer/utils";
import type { WorkoutSessionResult } from "../../domains/timer/api";
import type { WorkoutResponse } from "../../domains/workouts/api";
import { Button } from "../ui";
import { cn } from "../../lib/utils";
import { formatProtocol } from "../../lib/formatters";

interface WorkoutSummaryProps {
    workout: WorkoutResponse;
    result: WorkoutSessionResult;
    onClose: () => void;
}

export function WorkoutSummary({ workout, result, onClose }: WorkoutSummaryProps) {
    const [rpe, setRpe] = useState(3);
    const completeMutation = useCompleteWorkout();
    const queryClient = useQueryClient();

    // Build a human-readable score string from the session result
    const buildScoreString = (): string | undefined => {
        if (result.roundsCompleted > 0) {
            return `${result.roundsCompleted} rounds`;
        }
        return undefined;
    };

    // Calculate total reps equivalent for scoreValue
    const buildScoreValue = (): number | undefined => {
        if (result.roundsCompleted > 0) {
            return result.roundsCompleted;
        }
        return Math.round(result.totalElapsed);  // seconds as fallback for FOR_TIME
    };

    const handleSave = () => {
        completeMutation.mutate(
            {
                workoutId: workout.id,
                scoreValue: buildScoreValue(),
                scoreString: buildScoreString(),
                rpe,
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["workouts", "history"] });
                    onClose();
                },
            }
        );
    };

    // Build a display summary from the WOD data
    const movementSummary = workout.wod.movementItems
        .map((item) => item.name)
        .join(" / ");

    return (
        <div
            className="w-full max-w-sm flex flex-col items-center gap-5 px-6"
            style={{ animation: "summaryIn 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
        >
            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                    <CheckCircle className="text-emerald-400" size={26} />
                </div>
                <h2 className="text-2xl font-bold text-amber-400">Workout Complete!</h2>
                <p className="text-sm text-ds-text-muted">
                    {formatProtocol(workout.wod.type)} · {movementSummary}
                </p>
            </div>

            {/* Stats: total time and rounds (only when relevant) */}
            <div className={cn("w-full grid gap-3", result.roundsCompleted > 0 ? "grid-cols-2" : "grid-cols-1")}>
                <StatBox
                    icon={<Clock size={15} className="text-ds-text-muted" />}
                    value={formatTime(Math.round(result.totalElapsed))}
                    label="Total time"
                />
                {result.roundsCompleted > 0 && (
                    <StatBox
                        icon={<Layers size={15} className="text-ds-text-muted" />}
                        value={String(result.roundsCompleted)}
                        label="Rounds"
                    />
                )}
            </div>

            {/* RPE slider (1-5 scale) */}
            <div className="w-full card">
                <h3 className="text-xs uppercase tracking-widest text-ds-text-muted mb-3">
                    How hard was it?
                </h3>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={rpe}
                        onChange={(e) => setRpe(Number(e.target.value))}
                        className="flex-1 h-1.5 rounded-full cursor-pointer"
                        style={{ accentColor: "#f59e0b" }}
                    />
                    <span className="w-8 text-center text-lg font-bold text-ds-text tabular-nums">{rpe}</span>
                    <span className="text-xs text-ds-text-muted">RPE</span>
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-ds-text-faint px-0.5">
                    <span>Easy</span>
                    <span>Max effort</span>
                </div>
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-2">
                <Button
                    variant="primary"
                    fullWidth
                    onClick={handleSave}
                    disabled={completeMutation.isPending}
                >
                    <ChevronRight size={15} />
                    {completeMutation.isPending ? "Saving..." : "Save Workout"}
                </Button>
                <Button variant="ghost" fullWidth onClick={onClose} disabled={completeMutation.isPending}>
                    Discard & Close
                </Button>
            </div>

            {completeMutation.isError && (
                <p className="text-xs text-red-400 text-center">
                    Failed to save. Please try again.
                </p>
            )}
        </div>
    );
}

function StatBox({
    icon,
    value,
    label,
}: {
    icon?: ReactNode;
    value: string;
    label: string;
}) {
    return (
        <div className="card flex flex-col items-center gap-1 py-4">
            {icon}
            <span className="text-2xl font-black text-ds-text tabular-nums leading-tight">{value}</span>
            <span className="text-[10px] uppercase tracking-widest text-ds-text-muted">{label}</span>
        </div>
    );
}
