import { CanvasHandler } from './canvasHandler';

export abstract class Chart<T = any> {
  public canvas: HTMLCanvasElement;
  protected context: CanvasRenderingContext2D;
  protected canvasHandler: CanvasHandler;
  protected data: T;
  protected chartWidth: number;
  protected chartHeight: number;
  protected padding: number;
  protected chartAreaStartX: number;
  protected chartAreaStartY: number;
  protected chartAreaEndX: number;
  protected chartAreaEndY: number;

  constructor(canvasId: string, padding: number) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.context = this.canvas.getContext('2d');
    this.canvasHandler = new CanvasHandler(this.canvas, this.context);
    this.padding = padding;

    this.initializeChartDimensions();
  }

  private initializeChartDimensions() {
    this.chartWidth = this.canvas.width - 2 * this.padding;
    this.chartHeight = this.canvas.height - 2 * this.padding;
    this.chartAreaStartX = this.padding;
    this.chartAreaEndX = this.canvas.width - this.padding;
    this.chartAreaStartY = this.padding;
    this.chartAreaEndY = this.canvas.height - this.padding;
  }

  abstract draw(): void;

  protected clear(): void {
    this.canvasHandler.clear();
  }

  protected drawAxes(): void {
    this.canvasHandler.drawLine(this.chartAreaStartX, this.chartAreaStartY, this.chartAreaStartX, this.chartAreaEndY);
    this.canvasHandler.drawLine(this.chartAreaStartX, this.chartAreaEndY, this.chartAreaEndX, this.chartAreaEndY);
    this.canvasHandler.drawLine(this.chartAreaStartX, this.chartAreaStartY, this.chartAreaEndX, this.chartAreaStartY);
    this.canvasHandler.drawLine(this.chartAreaEndX, this.chartAreaStartY, this.chartAreaEndX, this.chartAreaEndY);
  }
}
