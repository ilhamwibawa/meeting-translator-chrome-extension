/// <reference types="chrome"/>
import { logger } from "./logger";

export interface PermissionStatus {
  granted: boolean;
  permission: string;
  error?: string;
}

export interface PermissionRequest {
  permissions: string[];
  origins?: string[];
}

class PermissionManager {
  private static instance: PermissionManager;
  private permissionCache: Map<string, PermissionStatus> = new Map();
  private readonly REQUIRED_PERMISSIONS = [
    "activeTab",
    "storage",
    "tabCapture",
    "scripting",
  ];

  private readonly REQUIRED_ORIGINS = [
    "https://meet.google.com/*",
    "https://zoom.us/*",
    "https://*.zoom.us/*",
    "https://teams.microsoft.com/*",
    "https://*.teams.microsoft.com/*",
  ];

  private constructor() {}

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  public async checkPermission(permission: string): Promise<PermissionStatus> {
    try {
      // Check cache first
      const cached = this.permissionCache.get(permission);
      if (cached) {
        return cached;
      }

      const result = await chrome.permissions.contains({
        permissions: [permission],
      });
      const status: PermissionStatus = {
        granted: result,
        permission,
      };

      this.permissionCache.set(permission, status);
      logger.debug("PermissionManager", `Permission ${permission} status:`, {
        granted: result,
      });

      return status;
    } catch (error) {
      const status: PermissionStatus = {
        granted: false,
        permission,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      logger.error(
        "PermissionManager",
        `Failed to check permission ${permission}`,
        error as Error
      );
      return status;
    }
  }

  public async checkOriginPermission(
    origin: string
  ): Promise<PermissionStatus> {
    try {
      const cached = this.permissionCache.get(`origin:${origin}`);
      if (cached) {
        return cached;
      }

      const result = await chrome.permissions.contains({ origins: [origin] });
      const status: PermissionStatus = {
        granted: result,
        permission: `origin:${origin}`,
      };

      this.permissionCache.set(`origin:${origin}`, status);
      logger.debug("PermissionManager", `Origin permission ${origin} status:`, {
        granted: result,
      });

      return status;
    } catch (error) {
      const status: PermissionStatus = {
        granted: false,
        permission: `origin:${origin}`,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      logger.error(
        "PermissionManager",
        `Failed to check origin permission ${origin}`,
        error as Error
      );
      return status;
    }
  }

  public async requestPermission(
    permission: string
  ): Promise<PermissionStatus> {
    try {
      logger.info("PermissionManager", `Requesting permission: ${permission}`);

      const result = await chrome.permissions.request({
        permissions: [permission],
      });
      const status: PermissionStatus = {
        granted: result,
        permission,
      };

      // Update cache
      this.permissionCache.set(permission, status);

      if (result) {
        logger.info("PermissionManager", `Permission granted: ${permission}`);
      } else {
        logger.warn("PermissionManager", `Permission denied: ${permission}`);
      }

      return status;
    } catch (error) {
      const status: PermissionStatus = {
        granted: false,
        permission,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      logger.error(
        "PermissionManager",
        `Failed to request permission ${permission}`,
        error as Error
      );
      return status;
    }
  }

  public async requestOriginPermission(
    origin: string
  ): Promise<PermissionStatus> {
    try {
      logger.info(
        "PermissionManager",
        `Requesting origin permission: ${origin}`
      );

      const result = await chrome.permissions.request({ origins: [origin] });
      const status: PermissionStatus = {
        granted: result,
        permission: `origin:${origin}`,
      };

      // Update cache
      this.permissionCache.set(`origin:${origin}`, status);

      if (result) {
        logger.info(
          "PermissionManager",
          `Origin permission granted: ${origin}`
        );
      } else {
        logger.warn("PermissionManager", `Origin permission denied: ${origin}`);
      }

      return status;
    } catch (error) {
      const status: PermissionStatus = {
        granted: false,
        permission: `origin:${origin}`,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      logger.error(
        "PermissionManager",
        `Failed to request origin permission ${origin}`,
        error as Error
      );
      return status;
    }
  }

  public async checkAllRequiredPermissions(): Promise<{
    allGranted: boolean;
    results: PermissionStatus[];
  }> {
    logger.info("PermissionManager", "Checking all required permissions");

    const permissionChecks = this.REQUIRED_PERMISSIONS.map((permission) =>
      this.checkPermission(permission)
    );

    const originChecks = this.REQUIRED_ORIGINS.map((origin) =>
      this.checkOriginPermission(origin)
    );

    const results = await Promise.all([...permissionChecks, ...originChecks]);
    const allGranted = results.every((result) => result.granted);

    logger.info("PermissionManager", "Permission check complete", {
      allGranted,
      total: results.length,
      granted: results.filter((r) => r.granted).length,
    });

    return { allGranted, results };
  }

  public async requestAllRequiredPermissions(): Promise<{
    allGranted: boolean;
    results: PermissionStatus[];
  }> {
    logger.info("PermissionManager", "Requesting all required permissions");

    try {
      // Request all permissions and origins in one call for better UX
      const result = await chrome.permissions.request({
        permissions: this.REQUIRED_PERMISSIONS,
        origins: this.REQUIRED_ORIGINS,
      });

      if (result) {
        // If granted, update cache for all permissions
        const results: PermissionStatus[] = [];

        for (const permission of this.REQUIRED_PERMISSIONS) {
          const status: PermissionStatus = { granted: true, permission };
          this.permissionCache.set(permission, status);
          results.push(status);
        }

        for (const origin of this.REQUIRED_ORIGINS) {
          const status: PermissionStatus = {
            granted: true,
            permission: `origin:${origin}`,
          };
          this.permissionCache.set(`origin:${origin}`, status);
          results.push(status);
        }

        logger.info("PermissionManager", "All permissions granted");
        return { allGranted: true, results };
      } else {
        // If denied, check each one individually to see what's missing
        return await this.checkAllRequiredPermissions();
      }
    } catch (error) {
      logger.error(
        "PermissionManager",
        "Failed to request permissions",
        error as Error
      );
      return await this.checkAllRequiredPermissions();
    }
  }

  public async hasTabCapturePermission(): Promise<boolean> {
    const status = await this.checkPermission("tabCapture");
    return status.granted;
  }

  public async hasStoragePermission(): Promise<boolean> {
    const status = await this.checkPermission("storage");
    return status.granted;
  }

  public async hasScriptingPermission(): Promise<boolean> {
    const status = await this.checkPermission("scripting");
    return status.granted;
  }

  public async hasMicrophonePermission(): Promise<boolean> {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        return result.state === "granted";
      }
      return false;
    } catch (error) {
      logger.warn(
        "PermissionManager",
        "Failed to check microphone permission",
        undefined,
        error as Error
      );
      return false;
    }
  }

  public clearCache(): void {
    this.permissionCache.clear();
    logger.debug("PermissionManager", "Permission cache cleared");
  }

  public getRequiredPermissions(): string[] {
    return [...this.REQUIRED_PERMISSIONS];
  }

  public getRequiredOrigins(): string[] {
    return [...this.REQUIRED_ORIGINS];
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance();
