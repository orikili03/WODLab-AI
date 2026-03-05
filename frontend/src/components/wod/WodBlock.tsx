import { ProtocolTooltip } from "./ProtocolTooltip";
import { expandForDisplay } from "../../lib/abbreviations";
import { formatProtocol } from "../../lib/formatters";
import type { MovementItemSpec } from "../../domains/workouts/api";

/** Time-capped protocols: show duration (e.g. EMOM 24, AMRAP 20). For Time / 21-15-9 have no fixed duration. */
const TIME_CAPPED_PROTOCOLS = ["AMRAP", "EMOM", "TABATA", "DEATH BY"];

function getProtocolHeading(
    type: string,
    durationMinutes: number,
    rounds?: number,
    intervalWorkSec?: number,
    intervalRestSec?: number
): string {
    const formatted = formatProtocol(type);

    if (type.toUpperCase() === "INTERVAL" && intervalWorkSec && intervalRestSec) {
        const formatSecs = (sec: number) => {
            if (sec >= 60) {
                const m = Math.floor(sec / 60);
                const s = sec % 60;
                return s === 0 ? `${m} min` : `${m} min ${s} sec`;
            }
            return `${sec} sec`;
        };
        const workStr = formatSecs(intervalWorkSec);
        const restStr = formatSecs(intervalRestSec);
        return `${formatted}: ${workStr} ON / ${restStr} OFF x ${durationMinutes} min`;
    }

    if (rounds != null && rounds > 0) {
        if (rounds === 1) {
            return "For time";
        }
        return `${rounds} Rounds for time`;
    }
    const showDuration = TIME_CAPPED_PROTOCOLS.some((p) =>
        type.toUpperCase().startsWith(p) || formatted.toUpperCase().startsWith(p)
    );
    if (showDuration && durationMinutes > 0) return `${formatted} ${durationMinutes}`;
    return formatted;
}

function formatMovementName(name: string): string {
    return expandForDisplay(name);
}

/**
 * Formats a quantity object into a human-readable string.
 * Examples:
 *   { value: 15, unit: "reps" } → "15"
 *   { value: 400, unit: "m" } → "400 m"
 *   { value: 12, unit: "cal" } → "12 cal"
 *   { value: 30, unit: "sec" } → "30 sec"
 */
function formatQuantity(qty: { value: number; unit: string }): string {
    if (qty.unit === "reps") return String(qty.value);
    return `${qty.value} ${qty.unit}`;
}

/**
 * Formats a load value (canonical kg) into a human-readable string.
 * Example: 60 → "60 kg"
 */
function formatLoad(load: number): string {
    return `${load} kg`;
}

export interface WodBlockProps {
    type: string;
    durationMinutes: number;
    /** When set, heading shows "N Rounds for time" (RFT-style). */
    rounds?: number;
    /** Structured movement data. */
    movementItems: MovementItemSpec[];
    intervalWorkSec?: number;
    intervalRestSec?: number;
    className?: string;
}

export function WodBlock({
    type,
    durationMinutes,
    rounds,
    movementItems,
    intervalWorkSec,
    intervalRestSec,
    className = "",
}: WodBlockProps) {
    const heading = getProtocolHeading(type, durationMinutes, rounds, intervalWorkSec, intervalRestSec);

    return (
        <div className={className}>
            <h2 className="text-ds-heading font-semibold text-amber-400 tracking-tight mb-3">
                <ProtocolTooltip protocolLabel={formatProtocol(type)}>{heading}:</ProtocolTooltip>
            </h2>
            <ul className="space-y-1.5">
                {movementItems.map((item, i) => {
                    const mainText = `${formatQuantity(item.quantity)} ${formatMovementName(item.name)}`;
                    return (
                        <li
                            key={`${item.name}-${i}`}
                            className="flex items-baseline gap-2 text-ds-body text-ds-text"
                        >
                            <span className="text-ds-text-muted">•</span>
                            <span className="flex-1">{mainText}</span>
                            {item.load && (
                                <span className="text-ds-body-sm text-ds-text-muted shrink-0">
                                    @ {formatLoad(item.load)}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
