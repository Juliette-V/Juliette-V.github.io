import { Chart } from './chart';
import { BAR_WIDTH, CANVAS_PADDING, CHARTS } from './constants';
import { BarData, ChunkData } from './types';
import { displayError, getFullDateString, getLabelFrequency, getTimeString } from './utils';

export class CandlestickChart extends Chart<ChunkData[]> {
  private barWidth: number;
  private tickVolumeDevider: number;

  private offsetX: number = 0;
  private maxOffset: number = 0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private lastOffsetX: number = 0;

  private minPrice: number;
  private maxPrice: number;
  private minPriceInitial: number;
  private maxPriceInitial: number;
  private priceRangeInitial: number;
  private offsetY: number = 0;
  private lastOffsetY: number = 0;
  private isYZooming: boolean = false;
  private dragStartY: number = 0;

  constructor(canvasId: string, private apiUrl: string) {
    super(canvasId, CANVAS_PADDING);
    this.barWidth = BAR_WIDTH;
    this.tickVolumeDevider = 100000000;

    this.initializeEventListeners();
    this.fetchDataAndDraw();
  }

  private initializeEventListeners() {
    this.canvas.addEventListener('mousedown', this.startDragging.bind(this));
    this.canvas.addEventListener('mousemove', this.drag.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDragging.bind(this));
    this.canvas.addEventListener('mouseleave', this.stopDragging.bind(this));
    this.canvas.addEventListener('wheel', this.handleZoom.bind(this));
  }

  private async fetchDataAndDraw(): Promise<void> {
    const loadingSpan = document.getElementById(`loader__${this.canvas.getAttribute('id')}`) as HTMLSpanElement;
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) {
        throw new Error(`${response.statusText}`);
      }
      const data: ChunkData[] = await response.json();
      this.data = data;
      this.calculateInitialPriceRange();
      this.maxOffset = this.getMaxOffset();
      this.tickVolumeDevider = this.getTickVolumeDevider();
      loadingSpan.style.display = 'none';
      this.draw();
    } catch (error) {
      console.log(error);
      loadingSpan.style.display = 'none';
      displayError(error, this.canvas.getAttribute('id'));
    }
  }

  override draw(): void {
    super.clear();
    this.drawTimeLabels();
    this.drawPriceLabels();
    this.drawCandlesticks();
    super.drawAxes();
  }

  private calculateInitialPriceRange() {
    const prices = this.data.flatMap((chart) => [
      ...chart.Bars.flatMap((bar) => bar.High),
      ...chart.Bars.flatMap((bar) => bar.Low),
    ]);
    this.minPriceInitial = Math.min(...prices);
    this.maxPriceInitial = Math.max(...prices);
    this.minPrice = this.minPriceInitial;
    this.maxPrice = this.maxPriceInitial;
    this.priceRangeInitial = this.maxPrice - this.minPrice;
  }

  private getTickVolumeDevider(): number {
    const maxTickVolume = Math.max(...this.data.flatMap((item) => item.Bars.flatMap((bar) => bar.TickVolume)));
    return (maxTickVolume / this.chartHeight) * 5;
  }

  private getMaxOffset(): number {
    const totalBars = this.data.reduce((sum, chunk) => sum + chunk.Bars.length, 0);
    const maxOffset = Math.max(0, totalBars * this.barWidth * 2 - this.chartWidth);
    return maxOffset;
  }

  private drawCandlesticks(): void {
    const priceScale = this.chartHeight / (this.maxPrice - this.minPrice);

    let x = this.chartAreaStartX - this.offsetX;

    for (const chunk of this.data) {
      for (const bar of chunk.Bars) {
        if (x > this.chartAreaEndX) break;
        if (x + this.barWidth >= this.chartAreaStartX) {
          const rectWidth = this.getCandlestickWidth(x);

          this.drawTickVolume(x, rectWidth, bar.TickVolume);
          this.drawCandlestick(x, bar, this.minPrice, priceScale, rectWidth);
        }
        x += this.barWidth * 2;
      }
    }
  }

  private getCandlestickWidth(x: number): number {
    if (x < this.chartAreaStartX) {
      return this.barWidth - (this.chartAreaStartX - x);
    } else if (x > this.chartAreaEndX - this.barWidth) {
      return this.chartAreaEndX - x;
    } else return this.barWidth;
  }

  private drawCandlestick(x: number, bar: BarData, minPrice: number, priceScale: number, rectWidth: number): void {
    const openY = this.getPriceY(bar.Open, minPrice, priceScale) + this.offsetY;
    const closeY = this.getPriceY(bar.Close, minPrice, priceScale) + this.offsetY;
    const highY = this.getPriceY(bar.High, minPrice, priceScale) + this.offsetY;
    const lowY = this.getPriceY(bar.Low, minPrice, priceScale) + this.offsetY;

    const color = bar.Open > bar.Close ? 'red' : 'green';

    if (x < this.chartAreaEndX - this.barWidth / 2 && x > this.chartAreaStartX - this.barWidth / 2) {
      this.context.fillStyle = color;
      this.canvasHandler.drawLine(...this.getCandlestickLineCoordinates(x, highY, lowY), [], color);
    }

    const y = Math.min(openY, closeY);
    if (y > this.chartAreaEndY) return;

    let rectY = y;
    let rectHeight = Math.abs(openY - closeY);
    if (y < this.chartAreaStartY) {
      rectY = this.chartAreaStartY;
      rectHeight = y + rectHeight < this.chartAreaStartY ? 0 : rectHeight - (this.chartAreaStartY - y);
    }
    if (y + rectHeight > this.chartAreaEndY) {
      rectHeight = this.chartAreaEndY - y;
    }

    const rectX = x < this.chartAreaStartY ? this.chartAreaStartY : x;
    this.canvasHandler.drawRect(rectX, rectY, rectWidth, rectHeight, color);
  }

  private drawTickVolume(x: number, rectWidth: number, tickVolume: number): void {
    const reactHeight = tickVolume / this.tickVolumeDevider;
    const rectX = x < this.chartAreaStartX ? this.chartAreaStartX : x;
    const rectY = this.chartAreaEndY - tickVolume / this.tickVolumeDevider;

    this.canvasHandler.drawRect(rectX, rectY, rectWidth, reactHeight, '#ccc');
  }

  private getCandlestickLineCoordinates(x: number, highY: number, lowY: number): [number, number, number, number] {
    let y1 = highY;
    let y2 = lowY;
    if (y1 < this.chartAreaStartY) {
      if (y2 <= this.chartAreaStartY) {
        y1 = 0;
        y2 = 0;
      } else {
        y1 = this.chartAreaStartY;
      }
    }
    if (y2 > this.chartAreaEndY) {
      if (y1 > this.chartAreaEndY) {
        y1 = 0;
        y2 = 0;
      } else {
        y2 = this.chartAreaEndY;
      }
    }

    return [x + this.barWidth / 2, y1, x + this.barWidth / 2, y2];
  }

  private getPriceY(price: number, minPrice: number, priceScale: number): number {
    return this.chartAreaEndY - (price - minPrice) * priceScale;
  }

  private drawTimeLabels(): void {
    const labelFrequency = getLabelFrequency(this.barWidth);
    let x = this.chartAreaStartX - this.offsetX + this.barWidth / 2;

    let index = 0;

    for (const chunk of this.data) {
      for (const [i, bar] of chunk.Bars.entries()) {
        if (x > this.chartAreaEndX) break;
        if (x + this.barWidth >= this.chartAreaStartX && x >= this.chartAreaStartX) {
          const barDate = new Date(chunk.ChunkStart * 1000 + bar.Time * 1000);

          if (index % labelFrequency === 0) {
            const label = this.formatDate(barDate, labelFrequency, i === 0);
            this.canvasHandler.drawText(label, x, this.chartAreaEndY + 15, '#000', '10px Arial', 'center');

            if (index !== 0) {
              this.canvasHandler.drawLine(x, this.chartAreaStartX, x, this.chartAreaEndY, [5, 10], '#ccc');
            }
          }
        }

        index++;
        x += this.barWidth * 2;
      }
    }
  }

  private formatDate(date: Date, labelFrequency: number, fullDate?: boolean): string {
    if (fullDate && labelFrequency > 10) {
      return getFullDateString(date);
    } else {
      return getTimeString(date);
    }
  }

  private drawPriceLabels(): void {
    const priceScale = this.chartHeight / (this.maxPrice - this.minPrice);
    const priceRange = this.maxPrice - this.minPrice;
    const priceStep = this.getPriceStep(priceRange);

    for (
      let price = this.offsetY !== 0 ? this.minPriceInitial : this.minPrice;
      price <= (this.offsetY !== 0 ? this.maxPriceInitial : this.maxPrice);
      price += priceStep
    ) {
      const y = this.getPriceY(price, this.minPrice, priceScale) + this.offsetY;
      if (y >= this.chartAreaStartY && y <= this.chartAreaEndY + 2) {
        this.canvasHandler.drawText(price.toFixed(4), this.chartAreaEndX + 5, y + 2);
        this.canvasHandler.drawLine(this.chartAreaStartX, y, this.chartAreaEndX, y, [5, 10], '#ccc');
      }
    }
  }

  private getPriceStep(priceRange: number): number {
    return priceRange / 8;
  }

  private startDragging(event: MouseEvent): void {
    if (event.clientX < this.chartAreaEndX) {
      this.isDragging = true;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.lastOffsetX = this.offsetX;
      this.lastOffsetY = this.offsetY;
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.isYZooming = true;
      this.dragStartY = event.clientY;
      this.canvas.style.cursor = 'ns-resize';
    }
  }

  private drag(event: MouseEvent): void {
    this.isDragging && this.handleDrag(event);
    this.isYZooming && this.handleZoomY(event);
  }

  private stopDragging(): void {
    this.isDragging = false;
    this.isYZooming = false;
    this.canvas.style.cursor = 'default';
  }

  private handleZoomY(event: MouseEvent): void {
    const dy = event.clientY - this.dragStartY;
    const scaleFactor = dy > 0 ? 1.01 : 0.99;
    const priceRange = this.maxPrice - this.minPrice;

    if (scaleFactor < 1 && priceRange < this.priceRangeInitial / 20) return;
    if (scaleFactor > 1 && priceRange >= this.priceRangeInitial) return;

    const newPriceRange = priceRange * scaleFactor;
    const midPrice = (this.maxPrice + this.minPrice) / 2;
    this.maxPrice = midPrice + newPriceRange / 2;
    this.minPrice = midPrice - newPriceRange / 2;

    this.draw();
  }

  private handleDrag(event: MouseEvent): void {
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.offsetX = Math.min(this.maxOffset, Math.max(0, this.lastOffsetX - dx));
    const newOffsetY = this.lastOffsetY + dy;
    const priceScale = (this.maxPrice - this.minPrice) / this.chartHeight;
    const newMinPrice = this.minPrice + newOffsetY * priceScale;
    const newMaxPrice = this.maxPrice + newOffsetY * priceScale;

    if (newMinPrice >= this.minPriceInitial && newMaxPrice <= this.maxPriceInitial) {
      this.offsetY = newOffsetY;
    }
    this.draw();
  }

  private handleZoom(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? -0.5 : 0.5;
    const newBarWidth = this.barWidth + zoomFactor;

    if (newBarWidth >= 1 && newBarWidth <= 60) {
      const zoomScale = newBarWidth / this.barWidth;
      this.barWidth = newBarWidth;
      this.maxOffset = this.getMaxOffset();
      this.offsetX = Math.min(this.offsetX * zoomScale, this.maxOffset);
      this.draw();
    }
  }
}

function initializeCharts() {
  CHARTS.forEach((chart) => new CandlestickChart(chart.canvasId, chart.apiUrl));
}

document.addEventListener('DOMContentLoaded', initializeCharts);
