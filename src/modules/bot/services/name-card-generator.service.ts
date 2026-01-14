import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, registerFont, CanvasRenderingContext2D } from 'canvas';
import * as path from 'path';

@Injectable()
export class NameCardGeneratorService {
    private readonly logger = new Logger(NameCardGeneratorService.name);
    private readonly WIDTH = 700;
    private readonly HEIGHT = 700;

    constructor() {
        this.registerFonts();
    }

    private registerFonts(): void {
        try {
            const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
            const boldFont = path.join(fontsDir, 'Roboto-Bold.ttf');
            const regularFont = path.join(fontsDir, 'Roboto-Regular.ttf');
            const fs = require('fs');
            if (fs.existsSync(boldFont) && fs.existsSync(regularFont)) {
                try {
                    registerFont(boldFont, { family: 'Roboto', weight: 'bold' });
                    registerFont(regularFont, { family: 'Roboto', weight: 'normal' });
                    this.logger.log('Fonts registered');
                } catch (err) {
                    this.logger.warn('Using system fonts');
                }
            }
        } catch (error) {
            this.logger.warn('Font registration failed');
        }
    }

    async generateNameCard(name: string, meaning: string, gender?: 'boy' | 'girl'): Promise<Buffer> {
        const canvas = createCanvas(this.WIDTH, this.HEIGHT);
        const ctx = canvas.getContext('2d');

        // Gradient background - binafsha
        this.drawGradientBackground(ctx);

        // ISM box - yuqorida
        this.drawNameBox(ctx, name);

        // Ma'nosi box - pastda
        this.drawMeaningBox(ctx, meaning);

        // Bot username - eng pastda
        this.drawBotUsername(ctx);

        return canvas.toBuffer('image/png');
    }

    private drawGradientBackground(ctx: CanvasRenderingContext2D): void {
        // Yuqorida kumush gradient - skromniy va elegant
        const gradientHeight = this.HEIGHT * 0.50; // 50% yuqori qism
        const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight);
        gradient.addColorStop(0, '#E5E7EB');    // Ochroq kumush
        gradient.addColorStop(0.5, '#D1D5DB');  // O'rtacha kumush
        gradient.addColorStop(1, '#9CA3AF');    // To'q kumush

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.WIDTH, gradientHeight);

        // Islomiy geometrik naqshlar
        this.drawIslamicPattern(ctx, gradientHeight);

        ctx.globalAlpha = 1.0;

        // Pastda oq background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, gradientHeight, this.WIDTH, this.HEIGHT - gradientHeight);

        // Rounded corners - butun rasm
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = '#000000';
        this.roundRect(ctx, 0, 0, this.WIDTH, this.HEIGHT, 25);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    private drawNameBox(ctx: CanvasRenderingContext2D, name: string): void {
        const centerX = this.WIDTH / 2;
        const centerY = 160; // Binafsha qismda

        // ISM box - rasmga mos
        ctx.font = 'bold 70px Arial, sans-serif';
        const nameMetrics = ctx.measureText(name);
        const nameWidth = nameMetrics.width;
        const boxPadding = 50;
        const boxWidth = Math.min(nameWidth + boxPadding * 2, this.WIDTH - 60);
        const boxHeight = 100;
        const boxX = centerX - boxWidth / 2;
        const boxY = centerY - boxHeight / 2;

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = '#FFFFFF';
        this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Ism matni - to'q kulrang (kumush uchun)
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, centerX, centerY);
    }

    private drawBotUsername(ctx: CanvasRenderingContext2D): void {
        const centerX = this.WIDTH / 2;
        const y = this.HEIGHT - 50;

        // Username - kulrang
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '20px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('@ismlarimizmanolari_bot', centerX, y);
    }

    private drawMeaningBox(ctx: CanvasRenderingContext2D, meaning: string): void {
        const centerX = this.WIDTH / 2;
        const startY = 480; // Oq qismda (50% dan keyin)

        // "Ma'nosi:" label - emoji o'chirildi server uchun
        ctx.fillStyle = '#4B5563';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Ma'nosi:", centerX, startY);

        // Ma'no matni
        ctx.font = '24px Arial, sans-serif';
        const maxWidth = this.WIDTH - 100;
        const lines = this.wrapText(ctx, meaning, maxWidth);
        const lineHeight = 35;

        // Matnni ko'rsatish
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'center';

        lines.forEach((line, index) => {
            const textY = startY + 45 + (index * lineHeight);
            ctx.fillText(line, centerX, textY);
        });
    }



    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    }

    private drawIslamicPattern(ctx: CanvasRenderingContext2D, height: number): void {
        ctx.globalAlpha = 0.15;

        // Markazda bitta katta islomiy naqsh
        const centerX = this.WIDTH / 2;
        const centerY = height / 2;
        const size = 200; // Katta naqsh

        ctx.save();
        ctx.translate(centerX, centerY);

        // Kumush ranglar - fonga mos
        const primaryColor = '#D1A87C'; // Oltin-kumush
        const secondaryColor = '#9CA3AF'; // Kulrang

        // Asosiy 8 burchakli shakl
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;

        // Tashqi oktagon
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // 8 ta katta petal (gul barglari)
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;

            ctx.save();
            ctx.rotate(angle);

            // Katta petal - tashqi qism
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.3);
            ctx.quadraticCurveTo(size * 0.4, -size * 0.6, size * 0.3, -size);
            ctx.quadraticCurveTo(0, -size * 0.8, -size * 0.3, -size);
            ctx.quadraticCurveTo(-size * 0.4, -size * 0.6, 0, -size * 0.3);
            ctx.closePath();
            ctx.stroke();

            // Ichki naqshlar - arabcha yozuv kabi
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-size * 0.15, -size * 0.5);
            ctx.lineTo(size * 0.15, -size * 0.7);
            ctx.moveTo(size * 0.15, -size * 0.5);
            ctx.lineTo(-size * 0.15, -size * 0.7);
            ctx.stroke();

            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 3;

            ctx.restore();
        }

        // Markaziy yulduz
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = i % 2 === 0 ? 40 : 20;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Markaziy doira
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }
}
