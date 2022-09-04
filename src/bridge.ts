import * as vscode from 'vscode';
import { spawnSync } from 'child_process';

type RawWorkInfo = {
    path: string,
    goVer: string,
    used: string[],
    total: string[]
};

type WorkInfo = {
    _raw: RawWorkInfo,
    path: string,
    goVer: string,
    mods: {
        path: string,
        used: boolean,
    }[],
};

export class Bridge {
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

    public check(): boolean {
        const ret = spawnSync(this.binName, ['-n'], this.binOpt);
        const stdOut = ret.stdout.toString();
        const res = JSON.parse(stdOut === "" ? ret.stderr.toString() : stdOut);
        return res.ok;
    }

    public getInfo(): WorkInfo {
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

    public toggle(name: string): string | undefined {
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

    public reload(): RawWorkInfo | null {
        const ret = spawnSync(this.binName, this.argList, this.binOpt);
        const stdOut = ret.stdout.toString();
        const res = JSON.parse(stdOut === "" ? ret.stderr.toString() : stdOut);

        if (!res.ok) {
            vscode.window.showErrorMessage(`${res.msg} -- ${res.err}`);
            return null;
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

    public update(to: string[]): boolean {
        console.log(`update(${JSON.stringify(to)})`);

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


        console.log(`update: add(${JSON.stringify(add)}) drop(${JSON.stringify(drop)})`);
        const ret = spawnSync(this.binName, ["-n", "-u", JSON.stringify({
            add: add,
            drop: drop,
        })], this.binOpt);
        const stdOut = ret.stdout.toString();
        const res = JSON.parse(stdOut === "" ? ret.stderr.toString() : stdOut);

        this.reload();
        return res.ok;
    }
}
