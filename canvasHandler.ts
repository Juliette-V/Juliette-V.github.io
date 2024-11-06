export class CanvasHandler {
  constructor(private canvas: HTMLCanvasElement, private context: CanvasRenderingContext2D) {}

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, linaDash: number[] = [], color: string = '#000') {
    this.context.strokeStyle = color;
    this.context.beginPath();
    this.context.setLineDash(linaDash);
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
  }

  drawRect(x: number, y: number, width: number, height: number, color: string = '#000') {
    this.context.fillStyle = color;
    this.context.fillRect(x, y, width, height);
  }

  drawText(text: string, x: number, y: number, color: string = '#000', font?: string, textAlign?: CanvasTextAlign) {
    this.context.fillStyle = color;
    this.context.font = font || 'initial';
    this.context.textAlign = textAlign || 'left';
    this.context.fillText(text, x, y);
  }
}
