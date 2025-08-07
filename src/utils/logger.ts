export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = "info";
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enableConsoleOutput = true;
  private enableStorage = true;

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private loadSettings(): void {
    try {
      const settings = localStorage.getItem("mvtt-logger-settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        this.logLevel = parsed.logLevel || "info";
        this.enableConsoleOutput = parsed.enableConsoleOutput ?? true;
        this.enableStorage = parsed.enableStorage ?? true;
      }
    } catch (error) {
      console.warn("Failed to load logger settings:", error);
    }
  }

  private saveSettings(): void {
    try {
      const settings = {
        logLevel: this.logLevel,
        enableConsoleOutput: this.enableConsoleOutput,
        enableStorage: this.enableStorage,
      };
      localStorage.setItem("mvtt-logger-settings", JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save logger settings:", error);
    }
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.saveSettings();
  }

  public setConsoleOutput(enabled: boolean): void {
    this.enableConsoleOutput = enabled;
    this.saveSettings();
  }

  public setStorageEnabled(enabled: boolean): void {
    this.enableStorage = enabled;
    this.saveSettings();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(
    component: string,
    message: string,
    data?: any
  ): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${component.toUpperCase()}] ${message}`;

    if (data !== undefined) {
      formatted += ` | Data: ${
        typeof data === "object" ? JSON.stringify(data) : data
      }`;
    }

    return formatted;
  }

  private addLog(
    level: LogLevel,
    component: string,
    message: string,
    data?: any,
    error?: Error
  ): void {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      ...(data !== undefined && { data }),
      ...(error && { error }),
    };

    if (this.enableStorage) {
      this.logs.push(logEntry);

      // Keep only the most recent logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
    }

    if (this.enableConsoleOutput && this.shouldLog(level)) {
      const formattedMessage = this.formatMessage(component, message, data);

      switch (level) {
        case "debug":
          console.debug(formattedMessage, error || "");
          break;
        case "info":
          console.info(formattedMessage, error || "");
          break;
        case "warn":
          console.warn(formattedMessage, error || "");
          break;
        case "error":
          console.error(formattedMessage, error || "");
          break;
      }
    }
  }

  public debug(component: string, message: string, data?: any): void {
    this.addLog("debug", component, message, data);
  }

  public info(component: string, message: string, data?: any): void {
    this.addLog("info", component, message, data);
  }

  public warn(
    component: string,
    message: string,
    data?: any,
    error?: Error
  ): void {
    this.addLog("warn", component, message, data, error);
  }

  public error(
    component: string,
    message: string,
    error?: Error,
    data?: any
  ): void {
    this.addLog("error", component, message, data, error);
  }

  public getLogs(level?: LogLevel, component?: string): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level);
    }

    if (component) {
      filteredLogs = filteredLogs.filter((log) => log.component === component);
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public getLogStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byComponent: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 } as Record<
        LogLevel,
        number
      >,
      byComponent: {} as Record<string, number>,
    };

    this.logs.forEach((log) => {
      stats.byLevel[log.level]++;
      stats.byComponent[log.component] =
        (stats.byComponent[log.component] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Component-specific loggers for convenience
export const createComponentLogger = (componentName: string) => ({
  debug: (message: string, data?: any) =>
    logger.debug(componentName, message, data),
  info: (message: string, data?: any) =>
    logger.info(componentName, message, data),
  warn: (message: string, data?: any, error?: Error) =>
    logger.warn(componentName, message, data, error),
  error: (message: string, error?: Error, data?: any) =>
    logger.error(componentName, message, error, data),
});
