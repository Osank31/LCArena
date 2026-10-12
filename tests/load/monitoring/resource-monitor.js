import { execSync } from 'node:child_process';

export class ResourceMonitor {
    constructor(intervalMs = 1000) {
        this.intervalMs = intervalMs;
        this.timer = null;
        this.samples = [];
        this.isRunning = false;
    }

    start() {
        this.samples = [];
        this.isRunning = true;
        this.poll();
        this.timer = setInterval(() => this.poll(), this.intervalMs);
    }

    poll() {
        if (!this.isRunning) return;
        try {
            // Sample docker stats for all containers in the lcarena project
            const output = execSync(
                'docker stats --no-stream --format "{{.Name}}||{{.CPUPerc}}||{{.MemUsage}}||{{.NetIO}}"',
                { encoding: 'utf-8', timeout: 5000 }
            );

            const timestamp = Date.now();
            const lines = output.trim().split('\n').filter(Boolean);

            const containerStats = {};
            for (const line of lines) {
                const [name, cpuStr, memStr, netStr] = line.split('||');
                if (!name) continue;

                // Parse CPU %
                const cpu = parseFloat(cpuStr ? cpuStr.replace('%', '').trim() : '0') || 0;

                // Parse Mem Usage (e.g. "94.58MiB / 3.664GiB")
                let memMb = 0;
                if (memStr) {
                    const usedPart = memStr.split('/')[0].trim();
                    if (usedPart.includes('GiB')) {
                        memMb = parseFloat(usedPart.replace('GiB', '').trim()) * 1024;
                    } else if (usedPart.includes('MiB')) {
                        memMb = parseFloat(usedPart.replace('MiB', '').trim());
                    } else if (usedPart.includes('KiB') || usedPart.includes('kB')) {
                        memMb = parseFloat(usedPart.replace(/KiB|kB/i, '').trim()) / 1024;
                    }
                }

                containerStats[name] = {
                    cpu,
                    memMb: Math.round(memMb * 100) / 100,
                    net: netStr ? netStr.trim() : '',
                };
            }

            this.samples.push({ timestamp, containers: containerStats });
        } catch {
            // Docker command may timeout during severe stress; continue
        }
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        return this.summarize();
    }

    summarize() {
        if (this.samples.length === 0) {
            return { error: 'No samples collected' };
        }

        const summary = {};
        const containerNames = new Set();
        for (const sample of this.samples) {
            for (const name of Object.keys(sample.containers)) {
                containerNames.add(name);
            }
        }

        for (const name of containerNames) {
            const cpuVals = [];
            const memVals = [];

            for (const sample of this.samples) {
                if (sample.containers[name]) {
                    cpuVals.push(sample.containers[name].cpu);
                    memVals.push(sample.containers[name].memMb);
                }
            }

            if (cpuVals.length > 0) {
                const avgCpu = cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length;
                const maxCpu = Math.max(...cpuVals);
                const minMem = Math.min(...memVals);
                const maxMem = Math.max(...memVals);
                const avgMem = memVals.reduce((a, b) => a + b, 0) / memVals.length;
                const memDelta = Math.round((maxMem - minMem) * 100) / 100;

                summary[name] = {
                    avgCpuPercent: Math.round(avgCpu * 100) / 100,
                    peakCpuPercent: Math.round(maxCpu * 100) / 100,
                    avgMemMb: Math.round(avgMem * 100) / 100,
                    peakMemMb: Math.round(maxMem * 100) / 100,
                    memGrowthMb: memDelta,
                };
            }
        }

        return {
            sampleCount: this.samples.length,
            durationSeconds: Math.round((this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp) / 1000),
            containers: summary,
        };
    }
}
