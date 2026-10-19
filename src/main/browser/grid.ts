import { screen } from 'electron';

export interface GridConfig {
  columns?: number;
  rows?: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates window position and size according to NxM screen tiling grid.
 *
 * @param windowIndex 0-based index of the window slot
 * @param config Grid column and row count (defaults to 3x2)
 * @param fallbackBounds Optional fallback bounds if screen API is not ready
 */
export function calculateWindowBounds(
  windowIndex: number,
  config?: GridConfig,
  fallbackBounds?: WindowBounds
): WindowBounds {
  const columns = Math.max(1, config?.columns ?? 3);
  const rows = Math.max(1, config?.rows ?? 2);

  let workArea: WindowBounds;
  try {
    if (screen && typeof screen.getPrimaryDisplay === 'function') {
      const primaryDisplay = screen.getPrimaryDisplay();
      workArea = primaryDisplay.workArea;
    } else {
      workArea = fallbackBounds ?? { x: 0, y: 0, width: 1920, height: 1040 };
    }
  } catch (err) {
    workArea = fallbackBounds ?? { x: 0, y: 0, width: 1920, height: 1040 };
  }

  const width = Math.floor(workArea.width / columns);
  const height = Math.floor(workArea.height / rows);

  const colIndex = windowIndex % columns;
  const rowIndex = Math.floor(windowIndex / columns) % rows;

  const x = workArea.x + colIndex * width;
  const y = workArea.y + rowIndex * height;

  return {
    x,
    y,
    width,
    height,
  };
}
