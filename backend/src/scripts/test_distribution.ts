import "dotenv/config";
import { wodAssemblyService } from "../services/WodAssemblyService.js";

function testDistribution() {
    const userId = "test-user-id";
    const iterations = 1000;
    const results: Record<string, number> = {};

    console.log("Testing Protocol Distribution for 'metcon' category...");

    for (let i = 0; i < iterations; i++) {
        const salt = `salt-${i}`;
        // selectProtocolAndDuration is private, but we can access it via cast for testing
        const { protocol } = (wodAssemblyService as any).selectProtocolAndDuration("metcon", userId, 15, salt);
        results[protocol] = (results[protocol] || 0) + 1;
    }

    console.log("\nResults (out of 1000):");
    Object.entries(results).forEach(([p, count]) => {
        const percentage = (count / iterations * 100).toFixed(1);
        console.log(`${p}: ${count} (${percentage}%)`);
    });
}

testDistribution();
