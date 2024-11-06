export function getFullDateString(date: Date): string {
  return `${date.getUTCDate().toString().padStart(2, '0')}.${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')} ${date.getUTCHours()}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

export function getTimeString(date: Date): string {
  return `${date.getUTCHours()}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

export function displayError(error: string, canvasId) {
  const errorSpan = document.getElementById(`error__${canvasId}`) as HTMLSpanElement;
  errorSpan.textContent = `Failed to load data: ${error}`;
}

export function getLabelFrequency(barWidth: number): number {
  if (barWidth > 15) {
    return 1;
  } else if (barWidth > 8) {
    return 5;
  } else if (barWidth > 5) {
    return 10;
  } else if (barWidth > 3) {
    return 15;
  } else {
    return 20;
  }
}
