"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class CandlestickChart {
    constructor(canvasId, apiUrl) {
        this.apiUrl = apiUrl;
        this.barWidth = 1;
        this.padding = 50;
        this.offsetX = 0;
        this.maxOffset = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.lastOffsetX = 0;
        this.tickVolumeDevider = 100000000;
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.data = [];
        this.canvas.style.cursor = 'grab';
        this.canvas.addEventListener('mousedown', this.startDragging.bind(this));
        this.canvas.addEventListener('mousemove', this.drag.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDragging.bind(this));
        this.canvas.addEventListener('mouseleave', this.stopDragging.bind(this));
        this.canvas.addEventListener('wheel', this.handleZoom.bind(this));
        this.fetchDataAndDraw();
    }
    fetchDataAndDraw() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(this.apiUrl);
                if (!response.ok) {
                    throw new Error(`Error fetching data: ${response.statusText}`);
                }
                const data = yield response.json();
                this.data = data;
                const totalBars = data.reduce((sum, chunk) => sum + chunk.Bars.length, 0);
                this.maxOffset = Math.max(0, totalBars * this.barWidth * 2 - (this.width - this.padding * 2));
                const maxTickVolume = Math.max(...data.flatMap((item) => item.Bars.flatMap((bar) => bar.TickVolume)));
                this.tickVolumeDevider = (maxTickVolume / (this.height - this.padding * 2)) * 5;
                console.log(this.tickVolumeDevider);
                this.draw();
            }
            catch (error) {
                console.error('Failed to load data:', error);
            }
        });
    }
    draw() {
        this.clearCanvas();
        this.drawTimeLabels();
        this.drawPriceLabels();
        this.drawCandlesticks();
        this.drawAxes();
    }
    clearCanvas() {
        this.context.clearRect(0, 0, this.width, this.height);
    }
    drawAxes() {
        this.context.strokeStyle = '#000';
        this.context.beginPath();
        this.context.setLineDash([]);
        this.context.moveTo(this.padding, this.padding);
        this.context.lineTo(this.padding, this.height - this.padding);
        this.context.moveTo(this.padding, this.height - this.padding);
        this.context.lineTo(this.width - this.padding, this.height - this.padding);
        this.context.stroke();
    }
    drawCandlesticks() {
        const allBars = this.data.flatMap((chunk) => chunk.Bars);
        const maxPrice = Math.max(...allBars.map((bar) => bar.High));
        const minPrice = Math.min(...allBars.map((bar) => bar.Low));
        const priceScale = (this.height - 2 * this.padding) / (maxPrice - minPrice);
        let x = this.padding - this.offsetX;
        for (const chunk of this.data) {
            for (const bar of chunk.Bars) {
                if (x > this.width - this.padding)
                    break;
                if (x + this.barWidth >= this.padding) {
                    const openY = this.getPriceY(bar.Open, minPrice, priceScale);
                    const closeY = this.getPriceY(bar.Close, minPrice, priceScale);
                    const highY = this.getPriceY(bar.High, minPrice, priceScale);
                    const lowY = this.getPriceY(bar.Low, minPrice, priceScale);
                    const color = bar.Open > bar.Close ? 'red' : 'green';
                    this.context.strokeStyle = color;
                    this.context.fillStyle = color;
                    if (x < this.width - this.padding - this.barWidth / 2 &&
                        x > this.padding - this.barWidth / 2) {
                        this.context.beginPath();
                        this.context.moveTo(x + this.barWidth / 2, highY);
                        this.context.lineTo(x + this.barWidth / 2, lowY);
                        this.context.stroke();
                    }
                    const rectWidth = x < this.padding
                        ? this.barWidth - (this.padding - x)
                        : x > this.width - this.padding - this.barWidth
                            ? this.width - this.padding - x
                            : this.barWidth;
                    this.context.fillRect(x < this.padding ? this.padding : x, Math.min(openY, closeY), rectWidth, Math.abs(openY - closeY));
                    this.context.fillStyle = '#ccc';
                    this.context.fillRect(x < this.padding ? this.padding : x, this.height - this.padding - bar.TickVolume / this.tickVolumeDevider, rectWidth, bar.TickVolume / this.tickVolumeDevider);
                }
                x += this.barWidth * 2;
            }
        }
    }
    getPriceY(price, minPrice, priceScale) {
        return this.height - this.padding - (price - minPrice) * priceScale;
    }
    drawTimeLabels() {
        this.context.font = '10px Arial';
        this.context.fillStyle = '#000';
        this.context.textAlign = 'center';
        const labelFrequency = this.getLabelFrequency();
        let x = this.padding - this.offsetX + this.barWidth / 2;
        let index = 0;
        for (const chunk of this.data) {
            for (const [i, bar] of chunk.Bars.entries()) {
                if (x > this.width - this.padding)
                    break;
                if (x + this.barWidth >= this.padding && x >= this.padding) {
                    const barDate = new Date(chunk.ChunkStart * 1000 + bar.Time * 1000);
                    // Display time label if the time interval passes the labelFrequency threshold
                    if (index % labelFrequency === 0) {
                        const label = this.formatDate(barDate, labelFrequency, i === 0);
                        this.context.fillText(label, x, this.height - this.padding + 15);
                        if (index !== 0) {
                            this.context.beginPath();
                            this.context.strokeStyle = '#ccc';
                            this.context.setLineDash([5, 10]);
                            this.context.moveTo(x, this.padding);
                            this.context.lineTo(x, this.height - this.padding);
                            this.context.stroke();
                        }
                    }
                }
                index++;
                x += this.barWidth * 2;
            }
        }
    }
    getLabelFrequency() {
        if (this.barWidth > 15) {
            return 1;
        }
        else if (this.barWidth > 8) {
            return 5;
        }
        else if (this.barWidth > 5) {
            return 10;
        }
        else if (this.barWidth > 3) {
            return 15;
        }
        else {
            return 20;
        }
    }
    formatDate(date, labelFrequency, fullDate) {
        if (fullDate && labelFrequency > 10) {
            return `${date.getUTCDate().toString().padStart(2, '0')}.${(date.getUTCMonth() + 1)
                .toString()
                .padStart(2, '0')} ${date.getUTCHours()}:${date
                .getUTCMinutes()
                .toString()
                .padStart(2, '0')}`;
        }
        else {
            return `${date.getUTCHours()}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
        }
    }
    drawPriceLabels() {
        const allBars = this.data.flatMap((chunk) => chunk.Bars);
        const maxPrice = Math.max(...allBars.map((bar) => bar.High));
        const minPrice = Math.min(...allBars.map((bar) => bar.Low));
        const priceScale = (this.height - 2 * this.padding) / (maxPrice - minPrice);
        const priceRange = maxPrice - minPrice;
        const priceStep = this.getPriceStep(priceRange);
        for (let price = minPrice; price <= maxPrice; price += priceStep) {
            const y = this.getPriceY(price, minPrice, priceScale);
            this.context.fillText(price.toFixed(4), this.width - this.padding + 22, y + 2);
            this.context.beginPath();
            this.context.strokeStyle = '#ccc';
            this.context.fillStyle = '#000';
            this.context.setLineDash([5, 10]);
            this.context.moveTo(this.padding, y);
            this.context.lineTo(this.width - this.padding, y);
            this.context.stroke();
        }
    }
    getPriceStep(priceRange) {
        return priceRange / 8;
    }
    startDragging(event) {
        this.isDragging = true;
        this.dragStartX = event.clientX;
        this.lastOffsetX = this.offsetX;
        this.canvas.style.cursor = 'grabbing';
    }
    drag(event) {
        if (this.isDragging) {
            const dx = event.clientX - this.dragStartX;
            this.offsetX = Math.min(this.maxOffset, Math.max(0, this.lastOffsetX - dx));
            this.draw();
        }
    }
    stopDragging() {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }
    }
    handleZoom(event) {
        event.preventDefault();
        const zoomAmount = event.deltaY > 0 ? -1 : 1;
        const newBarWidth = this.barWidth + zoomAmount;
        if (newBarWidth >= 1 && newBarWidth <= 60) {
            this.barWidth = newBarWidth;
            const totalBars = this.data.reduce((sum, chunk) => sum + chunk.Bars.length, 0);
            this.maxOffset = Math.max(0, totalBars * this.barWidth * 2 - (this.width - this.padding * 2));
            this.offsetX = Math.min(this.offsetX, this.maxOffset);
            this.draw();
        }
    }
}
function initializeCharts() {
    const charts = [
        {
            canvasId: 'chartCanvas1',
            apiUrl: 'https://beta.forextester.com/data/api/Metadata/bars/chunked?Broker=Advanced&Symbol=EURUSD&Timeframe=1&Start=57674&End=59113&UseMessagePack=false',
        },
        {
            canvasId: 'chartCanvas2',
            apiUrl: 'https://beta.forextester.com/data/api/Metadata/bars/chunked?Broker=Advanced&Symbol=USDJPY&Timeframe=1&Start=57674&End=59113&UseMessagePack=false',
        },
    ];
    charts.forEach((chart) => new CandlestickChart(chart.canvasId, chart.apiUrl));
}
document.addEventListener('DOMContentLoaded', initializeCharts);
