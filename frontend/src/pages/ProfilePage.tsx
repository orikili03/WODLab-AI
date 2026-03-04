import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";

interface Profile {
    id: string;
    email: string;
    fitnessLevel: "beginner" | "rx";
}

export function ProfilePage() {
    const queryClient = useQueryClient();
    const profileQuery = useQuery<Profile>({
        queryKey: ["me"],
        queryFn: async () => {
            const res = await apiClient.get("/users/me");
            return res.data.data;
        },
    });

    const mutation = useMutation({
        mutationFn: async (update: Partial<Profile>) => {
            const res = await apiClient.put("/users/me", update);
            return res.data.data as Profile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["me"] });
        },
    });

    const { register, handleSubmit } = useForm<{
        fitnessLevel: "beginner" | "rx";
    }>({
        values: profileQuery.data
            ? { fitnessLevel: profileQuery.data.fitnessLevel }
            : undefined,
    });

    const onSubmit = (values: { fitnessLevel: "beginner" | "rx" }) => {
        mutation.mutate({ fitnessLevel: values.fitnessLevel });
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold text-amber-400">Profile</h1>
                <p className="text-sm text-ds-text-muted">
                    Update your capabilities and constraints. Equipment is managed in its own dedicated tab.
                </p>
            </div>
            <Card>
                {profileQuery.isLoading && <p className="text-sm text-ds-text-muted">Loading...</p>}
                {profileQuery.data && (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
                        <div>
                            <label className="block mb-1 text-ds-text">Email</label>
                            <input
                                disabled
                                className="w-full rounded-md bg-ds-surface-subtle border border-ds-border px-3 py-2 text-xs text-ds-text-muted transition-colors opacity-60"
                                value={profileQuery.data.email}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-ds-text">Fitness level</label>
                            <select
                                className="w-full rounded-md bg-ds-surface-subtle border border-ds-border text-ds-text px-3 py-2 focus:border-amber-400 focus:outline-none transition-colors"
                                {...register("fitnessLevel")}
                            >
                                <option value="beginner">Beginner</option>
                                <option value="rx">RX</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-ds-text">Equipment</label>
                            <div className="text-xs text-ds-text-muted">
                                Manage equipment in the{" "}
                                <Link to="/equipment" className="text-amber-400 hover:text-amber-300 transition-colors">
                                    Equipment tab
                                </Link>
                                .
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? "Saving..." : "Save changes"}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}

