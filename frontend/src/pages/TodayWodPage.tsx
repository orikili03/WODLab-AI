import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Pencil, Play, RotateCw, Sparkles } from "lucide-react";
import { useWorkoutHistory, useGenerateWorkout } from "../domains/workouts/hooks";
import type { WorkoutResponse } from "../domains/workouts/api";
import { useEquipmentState } from "../domains/equipment/hooks";
import { TimerOverlay } from "../components/timer/TimerOverlay";
import { WodDetailCard } from "../components/wod/WodDetailCard";
import { Card } from "../components/ui";
import { BUILTIN_PRESETS, EQUIPMENT_CATALOG } from "../domains/equipment/catalog";

function isWorkoutFromToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
}

function getTodayWod(history: WorkoutResponse[] | undefined): WorkoutResponse | null {
    const latest = history?.[0];
    return latest && isWorkoutFromToday(latest.date) ? latest : null;
}

const DURATION_OPTIONS = [
    { id: "sprint" as const, label: "Short", note: "Short (Sprint) effort (< 7m)" },
    { id: "metcon" as const, label: "Medium", note: "Medium (Quick Metcon) (7-20m)" },
    { id: "long" as const, label: "Long", note: "Long (Aerobic Endurance) (20m+)" },
] as const;


interface FormValues {
    duration: "sprint" | "metcon" | "long";
    presetId: string;
}

export function TodayWodPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: history, isLoading } = useWorkoutHistory();
    const todayWod = useMemo(() => getTodayWod(history), [history]);
    const equipmentQuery = useEquipmentState();
    const customPresets = useMemo(() => equipmentQuery.data?.customPresets ?? [], [equipmentQuery.data?.customPresets]);

    const [showGenerateForm, setShowGenerateForm] = useState(location.pathname === "/wod/generate");
    const [timerOpen, setTimerOpen] = useState(false);

    useEffect(() => {
        if (location.pathname === "/wod/generate") setShowGenerateForm(true);
    }, [location.pathname]);

    const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
        defaultValues: {
            duration: "metcon",
            presetId: "none",
        },
    });
    const generateMutation = useGenerateWorkout();
    const selectedPresetId = watch("presetId");
    const selectedDuration = watch("duration");
    const [includedEquipmentIds, setIncludedEquipmentIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const builtin = BUILTIN_PRESETS.find((p) => p.id === selectedPresetId);
        const custom = customPresets.find((p) => p.id === selectedPresetId);
        const selected = builtin?.selected ?? custom?.selected ?? [];
        setIncludedEquipmentIds(new Set(selected.map((s) => s.id)));
    }, [selectedPresetId, customPresets]);

    const displayWod = todayWod?.wod;

    const toggleEquipment = useCallback((id: string) => {
        setIncludedEquipmentIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const getPresetName = useCallback(
        (presetId: string): string | undefined => {
            const builtin = BUILTIN_PRESETS.find((p) => p.id === presetId);
            if (builtin) return builtin.name;
            const custom = customPresets.find((p) => p.id === presetId);
            return custom?.name;
        },
        [customPresets]
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            generateMutation.mutate(
                {
                    category: values.duration,
                    equipment: Array.from(includedEquipmentIds),
                    presetName: getPresetName(values.presetId),
                },
                {
                    onSuccess: async (data) => {
                        queryClient.setQueryData<WorkoutResponse[]>(["workouts", "history"], (prev) => {
                            if (!data?.id || !prev) return prev;
                            const rest = prev.filter((w) => w.id !== data.id);
                            return [data, ...rest];
                        });
                        await queryClient.refetchQueries({ queryKey: ["workouts", "history"] });
                        setShowGenerateForm(false);
                        if (location.pathname === "/wod/generate") navigate("/", { replace: true });
                    },
                }
            );
        },
        [includedEquipmentIds, getPresetName, queryClient, generateMutation, location.pathname, navigate]
    );

    const currentEquipment = useMemo(() => {
        const builtin = BUILTIN_PRESETS.find((p) => p.id === selectedPresetId);
        const custom = customPresets.find((p) => p.id === selectedPresetId);
        const selected = builtin?.selected ?? custom?.selected ?? [];
        return selected.map((s) => {
            const catalog = EQUIPMENT_CATALOG.find((c) => c.id === s.id);
            return {
                id: s.id,
                label: catalog?.label ?? s.id,
                minWeight: s.minWeight,
                maxWeight: s.maxWeight,
            };
        });
    }, [selectedPresetId, customPresets]);

    const builtinPresets = BUILTIN_PRESETS.filter((p) => p.id !== "custom");
    const toOpt = (p: { id: string; name: string; description: string; selected: unknown[] }) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        count: p.selected.length,
    });
    const equipmentOptions = [
        ...builtinPresets.map(toOpt),
        ...customPresets.map((p) => ({
            id: p.id,
            name: p.name,
            description: `${p.selected.length} items`,
            count: p.selected.length,
        })),
    ];

    const isNoEquipment = selectedPresetId === "none";
    const showAvailableEquipmentBelow = !isNoEquipment && currentEquipment.length > 0;

    const generatedWod = generateMutation.data;
    const generateFormDisplayWod = generatedWod?.wod;

    if (showGenerateForm) {
        return (
            <div className="space-y-ds-3">
                <div>
                    <h1 className="text-ds-title font-semibold text-amber-400">Generate Workout</h1>
                    <p className="text-ds-body-sm text-ds-text-muted mt-1">
                        Choose duration and equipment, then generate a WOD for today.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1.8fr] gap-ds-3">
                    <div className="card min-w-0 overflow-hidden p-ds-3">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-ds-3 text-ds-body-sm">
                            <div>
                                <label className="block text-ds-body-sm font-medium text-ds-text mb-1">Duration</label>
                                <div className="grid grid-cols-3 gap-ds-1">
                                    {DURATION_OPTIONS.map((opt) => {
                                        const selected = selectedDuration === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setValue("duration", opt.id)}
                                                className={[
                                                    "min-w-0 rounded-ds-md border px-2.5 py-2 text-center transition-colors active:scale-[0.99] overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-400/40",
                                                    selected
                                                        ? "border-amber-400/60 bg-ds-surface shadow-[0_0_0_1px_rgba(251,191,36,0.25)]"
                                                        : "border-ds-border bg-ds-surface-subtle hover:border-amber-400",
                                                ].join(" ")}
                                            >
                                                <div className="text-ds-body-sm font-medium text-ds-text truncate">{opt.label}</div>
                                                <div className="text-ds-caption text-ds-text-muted mt-0.5 truncate">{opt.note}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <input type="hidden" {...register("duration")} />
                            </div>
                            <div>
                                <label className="block text-ds-body-sm font-medium text-ds-text mb-1">Equipment</label>
                                <div className="grid grid-cols-2 min-[500px]:grid-cols-3 gap-ds-1">
                                    {equipmentOptions.map((opt) => {
                                        const selected = selectedPresetId === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setValue("presetId", opt.id)}
                                                className={[
                                                    "min-w-0 rounded-ds-md border px-2.5 py-2 text-left transition-colors active:scale-[0.99] overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-400/40",
                                                    selected
                                                        ? "border-amber-400/60 bg-ds-surface shadow-[0_0_0_1px_rgba(251,191,36,0.25)]"
                                                        : "border-ds-border bg-ds-surface-subtle hover:border-amber-400",
                                                ].join(" ")}
                                            >
                                                <div className="text-ds-body-sm font-medium text-ds-text truncate">{opt.name}</div>
                                                <div className="text-ds-caption text-ds-text-muted mt-0.5 line-clamp-2 break-words">
                                                    {opt.description}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <input type="hidden" {...register("presetId")} />
                                {showAvailableEquipmentBelow && (
                                    <div className="mt-ds-2">
                                        <h3 className="text-ds-caption font-semibold text-ds-text-muted mb-1">Available equipment</h3>
                                        <ul className="space-y-ds-1">
                                            {currentEquipment.map((e) => {
                                                const checked = includedEquipmentIds.has(e.id);
                                                const hasWeight = e.minWeight !== undefined || e.maxWeight !== undefined;
                                                return (
                                                    <li key={e.id}>
                                                        <label className="grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-ds-2 rounded-ds-lg border border-ds-border bg-ds-surface-subtle px-ds-3 py-2 text-left hover:border-ds-border-strong transition-colors duration-250">
                                                            <span
                                                                className={`min-w-0 font-medium text-ds-body-sm truncate ${checked ? "text-ds-text" : "text-ds-text-muted"}`}
                                                            >
                                                                {e.label}
                                                            </span>
                                                            {hasWeight ? (
                                                                <span className="shrink-0 text-ds-caption text-ds-text-muted">
                                                                    {e.minWeight ?? "?"}–{e.maxWeight ?? "?"} kg
                                                                </span>
                                                            ) : (
                                                                <span />
                                                            )}
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleEquipment(e.id)}
                                                                className="h-4 w-4 shrink-0 rounded border-ds-border accent-amber-400 focus:ring-amber-400 focus:ring-2 focus:ring-offset-2 focus:ring-offset-ds-bg"
                                                            />
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={generateMutation.isPending}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-ds-md bg-amber-400 px-3 py-2 text-ds-body-sm font-semibold text-stone-950 shadow-ds-sm transition-all duration-250 hover:bg-amber-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg disabled:pointer-events-none disabled:opacity-50 cursor-pointer appearance-none border-0"
                            >
                                {generateMutation.isPending ? "Generating..." : "Generate WOD"}
                            </button>
                            {generateMutation.isError && (
                                <p className="text-ds-caption text-red-400 mt-1">
                                    {(generateMutation.error as Error).message ?? "Unable to generate workout"}
                                </p>
                            )}
                        </form>
                    </div>

                    <div className="min-w-0 overflow-hidden space-y-ds-3">
                        {!generatedWod ? (
                            <div className="card p-ds-3">
                                <p className="text-ds-body-sm text-ds-text-muted break-words">
                                    Choose equipment above, then generate a WOD to see the workout here.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* {generatedWod.warmup && generatedWod.warmup.length > 0 && (
                                    <div className="rounded-ds-lg border border-ds-border bg-ds-surface-subtle p-ds-3">
                                        <p className="text-xs uppercase tracking-wider text-ds-text-muted font-medium mb-1">
                                            Warm-up
                                        </p>
                                        <ul className="space-y-1 text-sm text-ds-text">
                                            {generatedWod.warmup.map((s) => (
                                                <li key={s} className="flex items-baseline gap-2">
                                                    <span className="text-ds-text-muted">·</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )} */}
                                <WodDetailCard
                                    wod={generateFormDisplayWod ?? generatedWod.wod}
                                    equipmentPresetName={generatedWod.equipmentPresetName}
                                >
                                    <div className="space-y-2 text-sm">
                                        {generatedWod.stimulusNote && (
                                            <p className="text-ds-text-muted italic text-sm">{generatedWod.stimulusNote}</p>
                                        )}
                                    </div>
                                </WodDetailCard>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {timerOpen && todayWod && displayWod && (
                <TimerOverlay
                    workout={{ ...todayWod, wod: displayWod }}
                    onClose={() => setTimerOpen(false)}
                />
            )}
            <div className="space-y-ds-3">
                <div>
                    <h1 className="text-ds-title font-semibold text-amber-400">Today&apos;s WOD</h1>
                    <p className="text-ds-body-sm text-ds-text-muted mt-1">
                        Your session for today. Generate a workout if you haven&apos;t yet.
                    </p>
                </div>
                {isLoading && (
                    <Card padding="md">
                        <p className="text-ds-body-sm text-ds-text-muted">Loading...</p>
                    </Card>
                )}
                {!isLoading && !todayWod && (
                    <Card className="text-center py-ds-4" padding="lg">
                        <div className="mx-auto max-w-sm space-y-ds-3">
                            <p className="text-ds-body-sm text-ds-text-muted">
                                No workout for today yet. Generate one to get started.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowGenerateForm(true)}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-ds-md bg-amber-400 px-3 py-2 text-ds-body-sm font-semibold text-stone-950 shadow-ds-sm transition-all duration-250 hover:bg-amber-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg cursor-pointer appearance-none border-0"
                            >
                                <Sparkles className="h-4 w-4" />
                                Generate workout
                            </button>
                        </div>
                    </Card>
                )}
                {!isLoading && todayWod && (
                    <>
                        {todayWod.completed && (
                            <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                <CheckCircle size={26} className="shrink-0" aria-hidden />
                                <span className="font-medium">Done</span>
                            </div>
                        )}
                        {/* {todayWod.warmup && todayWod.warmup.length > 0 && (
                            <div className="rounded-ds-lg border border-ds-border bg-ds-surface-subtle p-ds-3">
                                <p className="text-xs uppercase tracking-wider text-ds-text-muted font-medium mb-1">
                                    Warm-up
                                </p>
                                <ul className="space-y-ds-1 text-ds-body-sm text-ds-text">
                                    {todayWod.warmup.map((s) => (
                                        <li key={s} className="flex items-baseline gap-2">
                                            <span className="text-ds-text-muted">·</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )} */}
                        <WodDetailCard
                            key={`today-wod-${todayWod.id}`}
                            wod={displayWod ?? todayWod.wod}
                            equipmentPresetName={todayWod.equipmentPresetName}
                        >
                            <div className="space-y-ds-2">
                                {todayWod.stimulusNote && (
                                    <p className="text-ds-text-muted italic text-ds-body-sm">{todayWod.stimulusNote}</p>
                                )}
                                <div className="grid grid-cols-2 gap-ds-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setTimerOpen(true)}
                                        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-ds-md bg-amber-400 px-3 py-2 text-ds-body-sm font-semibold text-stone-950 shadow-ds-sm transition-all duration-250 hover:bg-amber-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg disabled:pointer-events-none disabled:opacity-50"
                                    >
                                        <Play size={14} fill="currentColor" />
                                        Start Workout
                                    </button>
                                    <Link
                                        to="/wod/builder"
                                        className="inline-flex items-center justify-center gap-2 w-full rounded-ds-md border border-ds-border-strong bg-ds-surface px-3 py-2 text-ds-body-sm font-medium text-ds-text transition-all duration-250 hover:bg-ds-surface-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-border-strong focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg"
                                    >
                                        <Pencil size={14} className="shrink-0" />
                                        Customize WOD
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setShowGenerateForm(true)}
                                        className="inline-flex items-center justify-center gap-2 w-full rounded-ds-md border border-ds-border-strong bg-ds-surface px-3 py-2 text-ds-body-sm font-medium text-amber-400 transition-all duration-250 hover:bg-ds-surface-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-border-strong focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg"
                                    >
                                        <RotateCw size={14} className="shrink-0" />
                                        Generate new WOD
                                    </button>
                                </div>
                            </div>
                        </WodDetailCard>
                    </>
                )}
            </div>
        </>
    );
}
