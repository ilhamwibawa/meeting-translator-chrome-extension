import { logger } from "./logger";

export interface DOMElementInfo {
  element: HTMLElement;
  selector: string;
  rect: DOMRect;
  isVisible: boolean;
  computedStyle: CSSStyleDeclaration;
}

export class DOMUtils {
  private static mutationObserver: MutationObserver | null = null;
  private static observerCallbacks: Set<(mutations: MutationRecord[]) => void> =
    new Set();

  /**
   * Find elements using multiple selectors with priority
   */
  public static findElements(
    selectors: string[],
    context: Document | Element = document
  ): HTMLElement[] {
    const results: HTMLElement[] = [];

    for (const selector of selectors) {
      try {
        const elements = Array.from(
          context.querySelectorAll(selector)
        ) as HTMLElement[];
        results.push(...elements);
      } catch (error) {
        logger.warn(
          "DOMUtils",
          `Invalid selector: ${selector}`,
          undefined,
          error as Error
        );
      }
    }

    // Remove duplicates
    return Array.from(new Set(results));
  }

  /**
   * Find the first element matching any of the selectors
   */
  public static findFirstElement(
    selectors: string[],
    context: Document | Element = document
  ): HTMLElement | null {
    for (const selector of selectors) {
      try {
        const element = context.querySelector(selector) as HTMLElement;
        if (element) {
          return element;
        }
      } catch (error) {
        logger.warn(
          "DOMUtils",
          `Invalid selector: ${selector}`,
          undefined,
          error as Error
        );
      }
    }
    return null;
  }

  /**
   * Check if an element is visible in the viewport
   */
  public static isElementVisible(element: HTMLElement): boolean {
    if (!element || !element.offsetParent) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      style.opacity !== "0" &&
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

  /**
   * Get detailed element information
   */
  public static getElementInfo(element: HTMLElement): DOMElementInfo {
    return {
      element,
      selector: this.generateSelector(element),
      rect: element.getBoundingClientRect(),
      isVisible: this.isElementVisible(element),
      computedStyle: window.getComputedStyle(element),
    };
  }

  /**
   * Generate a unique CSS selector for an element
   */
  public static generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className
        .split(/\s+/)
        .filter((cls) => cls.length > 0);
      if (classes.length > 0) {
        return `.${classes.join(".")}`;
      }
    }

    // Use tag name with position
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;

    if (!parent) {
      return tagName;
    }

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName.toLowerCase() === tagName
    );

    if (siblings.length === 1) {
      return `${this.generateSelector(parent)} > ${tagName}`;
    }

    const index = siblings.indexOf(element) + 1;
    return `${this.generateSelector(parent)} > ${tagName}:nth-child(${index})`;
  }

  /**
   * Wait for an element to appear in the DOM
   */
  public static waitForElement(
    selectors: string[],
    timeout = 10000,
    context: Document | Element = document
  ): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Element not found within ${timeout}ms: ${selectors.join(", ")}`
          )
        );
      }, timeout);

      const checkElement = (): void => {
        const element = this.findFirstElement(selectors, context);
        if (element) {
          clearTimeout(timeoutId);
          resolve(element);
          return;
        }

        // Use MutationObserver for efficiency
        this.observeDOM((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === "childList") {
              const element = this.findFirstElement(selectors, context);
              if (element) {
                clearTimeout(timeoutId);
                resolve(element);
                return;
              }
            }
          }
        });
      };

      checkElement();
    });
  }

  /**
   * Wait for an element to become visible
   */
  public static waitForElementVisible(
    element: HTMLElement,
    timeout = 5000
  ): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      if (this.isElementVisible(element)) {
        resolve(element);
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Element did not become visible within ${timeout}ms`));
      }, timeout);

      const checkVisibility = (): void => {
        if (this.isElementVisible(element)) {
          clearTimeout(timeoutId);
          resolve(element);
          return;
        }

        requestAnimationFrame(checkVisibility);
      };

      checkVisibility();
    });
  }

  /**
   * Create a DOM element with attributes and children
   */
  public static createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes: Record<string, string> = {},
    children: (HTMLElement | string)[] = []
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "innerHTML") {
        element.innerHTML = value;
      } else if (key === "textContent") {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    children.forEach((child) => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });

    return element;
  }

  /**
   * Safely remove an element from the DOM
   */
  public static removeElement(element: HTMLElement): void {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      logger.warn(
        "DOMUtils",
        "Failed to remove element",
        undefined,
        error as Error
      );
    }
  }

  /**
   * Observe DOM changes
   */
  public static observeDOM(
    callback: (mutations: MutationRecord[]) => void
  ): void {
    this.observerCallbacks.add(callback);

    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver((mutations) => {
        this.observerCallbacks.forEach((cb) => {
          try {
            cb(mutations);
          } catch (error) {
            logger.error(
              "DOMUtils",
              "Error in mutation observer callback",
              error as Error
            );
          }
        });
      });

      this.mutationObserver.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
      });
    }
  }

  /**
   * Stop observing DOM changes
   */
  public static stopObservingDOM(
    callback?: (mutations: MutationRecord[]) => void
  ): void {
    if (callback) {
      this.observerCallbacks.delete(callback);
    } else {
      this.observerCallbacks.clear();
    }

    if (this.observerCallbacks.size === 0 && this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  /**
   * Get element's position relative to viewport
   */
  public static getElementPosition(element: HTMLElement): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Check if element has specific attributes or data attributes
   */
  public static hasAttributes(
    element: HTMLElement,
    attributes: string[]
  ): boolean {
    return attributes.some((attr) => {
      if (attr.startsWith("data-")) {
        return element.dataset[attr.substring(5)] !== undefined;
      }
      return element.hasAttribute(attr);
    });
  }

  /**
   * Find parent element matching selector
   */
  public static findParent(
    element: HTMLElement,
    selector: string
  ): HTMLElement | null {
    let parent = element.parentElement;

    while (parent) {
      try {
        if (parent.matches(selector)) {
          return parent;
        }
      } catch (error) {
        logger.warn(
          "DOMUtils",
          `Invalid parent selector: ${selector}`,
          undefined,
          error as Error
        );
        break;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * Debounce function for DOM operations
   */
  public static debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for DOM operations
   */
  public static throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}
