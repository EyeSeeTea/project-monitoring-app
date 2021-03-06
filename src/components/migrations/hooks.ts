import React from "react";
import { MigrationsRunner } from "../../migrations";
import { D2Api } from "../../types/d2-api";
import { getMigrationTasks } from "../../migrations/tasks";

export type MigrationsState =
    | { type: "checking" }
    | { type: "pending"; runner: MigrationsRunner }
    | { type: "checked" };

export interface UseMigrationsResult {
    state: MigrationsState;
    onFinish: () => void;
}

export function useMigrations(api: D2Api, dataStoreNamespace: string): UseMigrationsResult {
    const [state, setState] = React.useState<MigrationsState>({ type: "checking" });
    const onFinish = React.useCallback(() => setState({ type: "checked" }), [setState]);

    React.useEffect(() => {
        runMigrations(api, dataStoreNamespace).then(setState);
    }, [api, dataStoreNamespace]);

    const result = React.useMemo(() => ({ state, onFinish }), [state, onFinish]);

    return result;
}

async function runMigrations(api: D2Api, dataStoreNamespace: string): Promise<MigrationsState> {
    const runner = await MigrationsRunner.init({
        api,
        debug: console.log,
        migrations: await getMigrationTasks(),
        dataStoreNamespace,
    });

    if (runner.hasPendingMigrations()) {
        return { type: "pending", runner };
    } else {
        return { type: "checked" };
    }
}
