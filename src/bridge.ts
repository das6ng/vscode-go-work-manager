import { spawnSync } from 'child_process';
import { lookpath } from 'lookpath';
import { stderr } from 'process';

/**
 * go.work raw info
 */
type RawWorkInfo = {
    path: string,
    goVer: string,
    used: string[],
    total: string[]
};

/**
 * go.work parsed info
 */
type WorkInfo = {
    _raw: RawWorkInfo,
    path: string,
    goVer: string,
    mods: {
        path: string,
        used: boolean,
    }[],
};

/**
 * workman command wrapper
 */
export class Bridge {
    enabled: boolean = false;
    binName: string = "workman";
    binOpt: object = {};
    argList: string[] = ["-n", "-l"];

    info: RawWorkInfo = {
        path: '',
        goVer: '',
        used: [],
        total: []
    };
    flagUsed: { [name: string]: boolean } = {};

    constructor(private cwd: string) {
        this.binOpt = {
            "cwd": this.cwd,
        };
    }

    /**
     * isInGoWork checks if currently in a go.work workspace
     */
    public isInGoWork(): boolean {
        const ret = spawnSync(this.binName, ['-n'], this.binOpt);
        const stdOut = ret.stdout.toString();
        const res = JSON.parse(stdOut === "" ? ret.stderr.toString() : stdOut);
        if (!res.ok) {
            this.enabled = false;
        }
        return res.ok;
    }

    /**
     * getInfo returns the current cached go.work info
     */
    public getInfo(): WorkInfo | undefined {
        if (!this.enabled) {
            return undefined;
        }
        return {
            _raw: this.info,
            path: this.info.path,
            goVer: this.info.goVer,
            mods: this.info.total.map(v => {
                return {
                    path: v,
                    used: this.flagUsed[v],
                };
            }),
        };
    }

    /**
     * toggle use/drop mod from go.work
     */
    public toggle(name: string): string | undefined {
        if (!this.enabled) {
            return undefined;
        }
        if (!name || name === "") {
            return "no mod name provided";
        }
        if (!this.flagUsed[name]) {
            this.update(this.info.used.concat([name]));
        } else {
            this.update(this.info.used.filter((val) => {
                return val !== name;
            }));
        }
        return undefined;
    }

    /**
     * reload go.work info from file
     */
    public reload(): RawWorkInfo | undefined {
        if (!this.enabled) {
            return undefined;
        }
        const ret = spawnSync(this.binName, this.argList, this.binOpt);
        const stdOut = ret.stdout.toString();
        const res = JSON.parse(stdOut === "" ? ret.stderr.toString() : stdOut);

        if (!res.ok) {
            console.error(`${res.msg} -- ${res.err}`);
            return undefined;
        }

        this.info = {
            path: res.path,
            goVer: res.go_ver,
            used: res.used,
            total: res.total
        };
        this.flagUsed = {};
        this.info.used.forEach((v) => this.flagUsed[v] = true);

        return this.info;
    }

    /**
     * update go mod use status
     */
    public update(to: string[]): boolean {
        if (!this.enabled) {
            return false;
        }
        // console.log(`update(${JSON.stringify(to)})`);

        let add: string[] = [];
        let drop: string[] = [];

        let dictTo: { [name: string]: boolean } = {};
        to.forEach((v) => dictTo[v] = true);
        to.forEach((v) => {
            if (!this.flagUsed[v]) {
                add.push(v);
            }
        });
        this.info.used.forEach((v) => {
            if (!dictTo[v]) {
                drop.push(v);
            }
        });

        // console.log(`update: add(${JSON.stringify(add)}) drop(${JSON.stringify(drop)})`);
        const ret = spawnSync(this.binName, ["-n", "-u", JSON.stringify({
            add: add,
            drop: drop,
        })], this.binOpt);
        const stdOut = ret.stdout.toString();
        const res = JSON.parse(stdOut === "" ? ret.stderr.toString() : stdOut);

        this.reload();
        return res.ok;
    }

    /**
     * checkOrInstallTools checks the toolchain, and try to 
     * install missing parts.
     */
    public async checkOrInstallTools(): Promise<boolean> {
        const workman = await lookpath(this.binName);
        if (workman) {
            console.log(`found workman at '${workman}'`);
            this.enabled = true;
            return true;
        }
        const go = await lookpath('go');
        if (!go) {
            console.error(`go command no found in PATH!`);
            this.enabled = false;
            return false;
        }

        console.log('go install github.com/dashengyeah/workman@latest');
        const ret = spawnSync('go', ['install', 'github.com/dashengyeah/workman@latest']);
        if (ret.error) {
            console.error(`error: ${ret.error.name} -- ${ret.error.message}\n${ret.error.stack}`);
            this.enabled = false;
            return false;
        }
        const workmanAgain = await lookpath(this.binName);
        if (!workmanAgain) {
            console.error(`FAILURE!`);
            this.enabled = false;
            return false;
        }

        console.log('SUCCESS!');
        this.enabled = true;
        return true;
    }
}
