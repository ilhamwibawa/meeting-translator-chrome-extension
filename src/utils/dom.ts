/**
 * DOM manipulation utilities for the Meeting Translator extension
 */

import { createComponentLogger } from "./logger";

const logger = createComponentLogger("DOMUtils");

/**
 * Inject CSS styles from a URL into the document
 */
export async function injectStyles(stylesUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if styles are already injected
    const existingLink = document.querySelector(`link[href="${stylesUrl}"]`);
    if (existingLink) {
      logger.info("Styles already injected");
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = stylesUrl;

    link.onload = () => {
      logger.info("Styles loaded successfully from:", stylesUrl);
      resolve();
    };

    link.onerror = (_error) => {
      logger.error(
        "Failed to load styles from:",
        new Error(`Failed to load styles: ${stylesUrl}`)
      );
      reject(new Error(`Failed to load styles: ${stylesUrl}`));
    };

    document.head.appendChild(link);
  });
}

/**
 * Inject CSS text directly into the document
 */
export function injectStylesText(
  cssText: string,
  id?: string
): HTMLStyleElement {
  // Check if styles with this ID already exist
  if (id) {
    const existingStyle = document.getElementById(id);
    if (existingStyle) {
      existingStyle.textContent = cssText;
      return existingStyle as HTMLStyleElement;
    }
  }

  const style = document.createElement("style");
  style.type = "text/css";
  if (id) style.id = id;
  style.textContent = cssText;

  document.head.appendChild(style);
  return style;
}

/**
 * Remove styles by ID or URL
 */
export function removeStyles(identifier: string): boolean {
  // Try to find by ID first
  let element = document.getElementById(identifier);

  // If not found by ID, try to find by href
  if (!element) {
    element = document.querySelector(`link[href="${identifier}"]`);
  }

  if (element) {
    element.remove();
    return true;
  }

  return false;
}

/**
 * Create a draggable element
 */
export function makeDraggable(
  element: HTMLElement,
  handle?: HTMLElement
): void {
  const dragHandle = handle || element;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  dragHandle.style.cursor = "move";

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only handle left mouse button

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = element.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    e.preventDefault();
    e.stopPropagation();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    element.style.userSelect = "none";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const newX = initialX + deltaX;
    const newY = initialY + deltaY;

    // Keep element within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const elementRect = element.getBoundingClientRect();

    const clampedX = Math.max(
      0,
      Math.min(newX, viewportWidth - elementRect.width)
    );
    const clampedY = Math.max(
      0,
      Math.min(newY, viewportHeight - elementRect.height)
    );

    element.style.left = `${clampedX}px`;
    element.style.top = `${clampedY}px`;
    element.style.position = "fixed";
  };

  const handleMouseUp = () => {
    isDragging = false;

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    element.style.userSelect = "";
    document.body.style.userSelect = "";
  };

  dragHandle.addEventListener("mousedown", handleMouseDown);
}

/**
 * Create a resizable element
 */
export function makeResizable(
  element: HTMLElement,
  options: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): void {
  const {
    minWidth = 200,
    minHeight = 100,
    maxWidth = 800,
    maxHeight = 600,
  } = options;

  // Create resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "resize-handle";
  resizeHandle.style.cssText = `
    position: absolute;
    right: 0;
    bottom: 0;
    width: 12px;
    height: 12px;
    cursor: nw-resize;
    background: linear-gradient(-45deg, transparent 0%, transparent 30%, #999 30%, #999 40%, transparent 40%, transparent 70%, #999 70%, #999 80%, transparent 80%);
  `;

  element.style.position = element.style.position || "relative";
  element.appendChild(resizeHandle);

  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;

    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = element.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;

    e.preventDefault();
    e.stopPropagation();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const newWidth = Math.max(
      minWidth,
      Math.min(maxWidth, startWidth + deltaX)
    );
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, startHeight + deltaY)
    );

    element.style.width = `${newWidth}px`;
    element.style.height = `${newHeight}px`;
  };

  const handleMouseUp = () => {
    isResizing = false;

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    document.body.style.userSelect = "";
  };

  resizeHandle.addEventListener("mousedown", handleMouseDown);
}

/**
 * Animate element with CSS transitions
 */
export function animateElement(
  element: HTMLElement,
  properties: Partial<CSSStyleDeclaration>,
  duration = 300
): Promise<void> {
  return new Promise((resolve) => {
    const originalTransition = element.style.transition;

    element.style.transition = `all ${duration}ms ease-in-out`;

    // Apply new properties
    Object.assign(element.style, properties);

    const handleTransitionEnd = () => {
      element.style.transition = originalTransition;
      element.removeEventListener("transitionend", handleTransitionEnd);
      resolve();
    };

    element.addEventListener("transitionend", handleTransitionEnd);

    // Fallback timeout
    setTimeout(() => {
      element.style.transition = originalTransition;
      element.removeEventListener("transitionend", handleTransitionEnd);
      resolve();
    }, duration + 50);
  });
}

/**
 * Find the closest video element in the DOM
 */
export function findVideoElements(): HTMLVideoElement[] {
  return Array.from(document.querySelectorAll("video")).filter((video) => {
    // Filter out hidden or very small videos
    const rect = video.getBoundingClientRect();
    return (
      rect.width > 50 &&
      rect.height > 50 &&
      getComputedStyle(video).display !== "none" &&
      getComputedStyle(video).visibility !== "hidden"
    );
  });
}

/**
 * Check if an element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout = 5000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((_mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Get the optimal position for a floating element
 */
export function getOptimalPosition(
  element: HTMLElement,
  preferredPosition:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left" = "top-right"
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const padding = 20;

  let x: number, y: number;

  switch (preferredPosition) {
    case "top-right":
      x = viewportWidth - rect.width - padding;
      y = padding;
      break;
    case "top-left":
      x = padding;
      y = padding;
      break;
    case "bottom-right":
      x = viewportWidth - rect.width - padding;
      y = viewportHeight - rect.height - padding;
      break;
    case "bottom-left":
      x = padding;
      y = viewportHeight - rect.height - padding;
      break;
    default:
      x = viewportWidth - rect.width - padding;
      y = padding;
  }

  // Ensure element stays within viewport
  x = Math.max(padding, Math.min(x, viewportWidth - rect.width - padding));
  y = Math.max(padding, Math.min(y, viewportHeight - rect.height - padding));

  return { x, y };
}
