import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { ipcMain } from 'electron';
import { InBoundMode, SingBoxStatus } from './data';
import { getConfigPath, SetConfigMode } from './config';
import { checkAdminRights } from './utils';
import { triggerAutoProxy, triggerManualProxy } from '@mihomo-party/sysproxy';


export class SingBoxManager {
    private process: ChildProcess | null = null;
    private logCallback: ((data: string) => void) | null = null;
    private statusCallback: ((status: SingBoxStatus) => void) | null = null;
    private mode: InBoundMode = InBoundMode.PROXY;

    constructor(private singBoxPath: string) { }

    async start(config:string) {
        if (this.process) {
            throw new Error('Sing-box is already running');
        }
        this.statusCallback?.("starting")

        const configPath = getConfigPath(config);
        this.mode = await checkAdminRights() ? InBoundMode.TUN : InBoundMode.PROXY;
        await SetConfigMode(config,this.mode)

        if(this.mode === InBoundMode.PROXY && process.platform === 'win32')
        {
            triggerManualProxy(true,"localhost",1080,"")
        }
        
        this.process = spawn(this.singBoxPath, ["run","-c",configPath], {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        this.process.stdout?.on('data', (data) => {
            this.statusCallback?.("active")
            this.logCallback?.(`${data.toString()}`);
        });

        this.process.stderr?.on('data', (data) => {
            this.statusCallback?.("active")
            this.logCallback?.(`${data.toString()}`);
        });

        this.process.on('close', (code) => {
            this.logCallback?.(`Process exited with code ${code}`);
            this.statusCallback?.("stopped")
            this.process = null;
            this.stop()
        });

        this.process.on('error', (err) => {
            this.logCallback?.(`Process error: ${err.message}`);
            this.statusCallback?.("stopped")
            this.process = null;
            this.stop()
        });
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.statusCallback?.("stopped")
        }

        if(this.mode === InBoundMode.PROXY && process.platform === 'win32')
        {
            triggerManualProxy(false,"",1080,"")
        }
    }

    isRunning(): boolean {
        return this.process !== null;
    }

    onLog(callback: (data: string) => void) {
        this.logCallback = callback;
    }

    onStatus(callback: (data: SingBoxStatus) => void) {
        this.statusCallback = callback;
    }
}