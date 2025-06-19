class Logger {
    private logLevel: "debug" | "info" | "warn" | "error" | "success";

    // ANSI color codes
    private colors = {
        reset: "\x1b[0m",
        gray: "\x1b[90m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
    };

    constructor(level: "debug" | "info" | "warn" | "success" | "error" = "info") {
        this.logLevel = level;
    }

    private log(level: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const coloredLevel = this.getColoredLevel(level);
        console.log(
            `${this.colors.gray}[${timestamp}]${this.colors.reset} ${coloredLevel}`,
            ...args
        );
    }

    private getColoredLevel(level: string) {
        switch (level.toLowerCase()) {
            case "success":
                return `${this.colors.green}[${level.toUpperCase()}]${this.colors.reset
                    }`;
            case "debug":
                return `${this.colors.gray}[${level.toUpperCase()}]${this.colors.reset
                    }`;
            case "info":
                return `${this.colors.blue}[${level.toUpperCase()}]${this.colors.reset
                    }`;
            case "warn":
                return `${this.colors.yellow}[${level.toUpperCase()}]${this.colors.reset
                    }`;
            case "error":
                return `${this.colors.red}[${level.toUpperCase()}]${this.colors.reset}`;
            default:
                return `[${level.toUpperCase()}]`;
        }
    }

    private shouldLog(messageLevel: string): boolean {
        const levels = ["debug", "info", "warn", "error", "success"];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(messageLevel);
        return messageLevelIndex >= currentLevelIndex;
    }

    success(...args: any[]) {
        if (this.shouldLog("success")) {
            this.log("success", ...args);
        }
    }

    debug(...args: any[]) {
        if (this.shouldLog("debug")) {
            this.log("debug", ...args);
        }
    }

    info(...args: any[]) {
        if (this.shouldLog("info")) {
            this.log("info", ...args);
        }
    }

    warn(...args: any[]) {
        if (this.shouldLog("warn")) {
            this.log("warn", ...args);
        }
    }

    error(...args: any[]) {
        // Error always logs regardless of level
        this.log("error", ...args);
    }
}

const logger = new Logger(
    process.env.NODE_ENV === "development" ? "debug" : "info"
);

export default logger;