import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas';
import * as path from 'path';

// Gender-based color palettes
interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string[];
    textMain: string;
    textSecondary: string;
    decorative: string;
}

interface DesignTheme {
    palette: ColorPalette;
    pattern: 'modern' | 'elegant' | 'playful';
}

@Injectable()
export class NameCardGeneratorService {
    private readonly logger = new Logger(NameCardGeneratorService.name);
    private readonly WIDTH = 800;
    private readonly HEIGHT = 600; // Increased for text below image
    private readonly PADDING = 50;
    private readonly IMAGE_HEIGHT = 320; // Image area height

    constructor() {
        this.registerFonts();
    }

    /**
     * Font fayllarini ro'yxatdan o'tkazish
     */
    private registerFonts(): void {
        try {
            const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
            const boldFont = path.join(fontsDir, 'Roboto-Bold.ttf');
            const regularFont = path.join(fontsDir, 'Roboto-Regular.ttf');

            // Check if files exist
            const fs = require('fs');
            if (fs.existsSync(boldFont) && fs.existsSync(regularFont)) {
                registerFont(boldFont, {
                    family: 'Roboto',
                    weight: 'bold',
                });
                registerFont(regularFont, {
                    family: 'Roboto',
                    weight: 'normal',
                });
                this.logger.log('✅ Custom fonts registered successfully');
            } else {
                this.logger.warn('⚠️ Font files not found, using system fonts');
            }
        } catch (error) {
            this.logger.warn('⚠️ Font registration failed, using system fonts:', error.message);
        }
    }

    /**
     * Gender-based dizayn temalari - kreativ va jozibali ranglar
     */
    private getDesignTheme(gender?: 'boy' | 'girl'): DesignTheme {
        const themes = {
            boy: {
                palette: {
                    primary: '#2563eb', // Chuqur ko'k
                    secondary: '#3b82f6',
                    accent: '#1e40af',
                    background: ['#0f172a', '#1e3a8a', '#2563eb', '#60a5fa', '#dbeafe', '#f0f9ff'],
                    textMain: '#0f172a',
                    textSecondary: '#334155',
                    decorative: 'rgba(37, 99, 235, 0.15)',
                },
                pattern: 'modern' as const,
            },
            girl: {
                palette: {
                    primary: '#db2777', // Yorqin pushti
                    secondary: '#ec4899',
                    accent: '#be185d',
                    background: ['#4a044e', '#831843', '#db2777', '#f472b6', '#fbcfe8', '#fdf2f8'],
                    textMain: '#1f0c24',
                    textSecondary: '#4a1d4e',
                    decorative: 'rgba(219, 39, 119, 0.15)',
                },
                pattern: 'elegant' as const,
            },
            neutral: {
                palette: {
                    primary: '#7c3aed', // Quyuq binafsha
                    secondary: '#8b5cf6',
                    accent: '#6d28d9',
                    background: ['#1e1b4b', '#4c1d95', '#7c3aed', '#a78bfa', '#ddd6fe', '#f5f3ff'],
                    textMain: '#1e1b4b',
                    textSecondary: '#4c1d95',
                    decorative: 'rgba(124, 58, 237, 0.15)',
                },
                pattern: 'playful' as const,
            },
        };

        return themes[gender || 'neutral'];
    }

    /**
     * Ism ma'nosi uchun kreativ rasm generatsiya qiladi
     */
    async generateNameCard(
        name: string,
        meaning: string,
        gender?: 'boy' | 'girl',
    ): Promise<Buffer> {
        const canvas = createCanvas(this.WIDTH, this.HEIGHT);
        const ctx = canvas.getContext('2d');
        const theme = this.getDesignTheme(gender);

        // === YUQORI QISM: RASM (0 -> 320px) ===

        // Background gradient (image area only)
        this.drawImageBackground(ctx, theme);

        // Decorative patterns
        this.drawDecorations(ctx, theme);

        // Name (katta va kreativ) - in image area
        this.drawName(ctx, name, theme);

        // Border frame for image
        this.drawImageFrame(ctx, theme);

        // === PASTKI QISM: MATN (320px -> 600px) ===

        // White background for text
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, this.IMAGE_HEIGHT, this.WIDTH, this.HEIGHT - this.IMAGE_HEIGHT);

        // Meaning text (ko'p qatorli) - below image
        this.drawMeaning(ctx, meaning, theme);

        // Bot username at the bottom
        this.drawBotUsername(ctx);

        return canvas.toBuffer('image/png');
    }

    /**
     * Gradient background for image area only - radial gradient for more depth
     */
    private drawImageBackground(ctx: CanvasRenderingContext2D, theme: DesignTheme): void {
        const { background } = theme.palette;

        // Base solid color
        ctx.fillStyle = background[0];
        ctx.fillRect(0, 0, this.WIDTH, this.IMAGE_HEIGHT);

        // Radial gradient from center for depth
        const centerX = this.WIDTH / 2;
        const centerY = this.IMAGE_HEIGHT / 2;
        const radius = Math.max(this.WIDTH, this.IMAGE_HEIGHT);

        const radialGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        radialGradient.addColorStop(0, background[4]);
        radialGradient.addColorStop(0.3, background[3]);
        radialGradient.addColorStop(0.6, background[2]);
        radialGradient.addColorStop(0.8, background[1]);
        radialGradient.addColorStop(1, background[0]);

        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, this.WIDTH, this.IMAGE_HEIGHT);

        // Diagonal overlay gradient for dynamic look
        const diagonalGradient = ctx.createLinearGradient(0, 0, this.WIDTH, this.IMAGE_HEIGHT);
        diagonalGradient.addColorStop(0, background[1] + '40');
        diagonalGradient.addColorStop(0.5, 'transparent');
        diagonalGradient.addColorStop(1, background[2] + '40');

        ctx.fillStyle = diagonalGradient;
        ctx.fillRect(0, 0, this.WIDTH, this.IMAGE_HEIGHT);
    }

    /**
     * Pattern-based decorations
     */
    private drawDecorations(ctx: CanvasRenderingContext2D, theme: DesignTheme): void {
        const { decorative, accent } = theme.palette;

        if (theme.pattern === 'modern') {
            this.drawModernPattern(ctx, decorative);
        } else if (theme.pattern === 'elegant') {
            this.drawElegantPattern(ctx, decorative);
        } else {
            this.drawPlayfulPattern(ctx, decorative);
        }

        // Accent circles in corners
        this.drawCornerAccents(ctx, accent);
    }

    private drawModernPattern(ctx: CanvasRenderingContext2D, color: string): void {
        // Diagonal parallel lines (o'g'il bola uchun)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        for (let i = -200; i < this.WIDTH + 200; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 250, this.IMAGE_HEIGHT);
            ctx.stroke();
        }

        // Geometric shapes - circles
        ctx.fillStyle = color;
        const positions = [
            [100, 60], [700, 80], [150, 250], [650, 280]
        ];
        positions.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.fill();
        });

        // Small dots pattern
        for (let x = 80; x < this.WIDTH; x += 60) {
            for (let y = 40; y < this.IMAGE_HEIGHT - 40; y += 60) {
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private drawElegantPattern(ctx: CanvasRenderingContext2D, color: string): void {
        // Elegant flowing curves (qiz bola uchun)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;

        // Multiple wave layers
        for (let layer = 0; layer < 4; layer++) {
            ctx.beginPath();
            for (let x = 0; x < this.WIDTH; x += 15) {
                const wave1 = Math.sin((x + layer * 100) / 60) * 20;
                const wave2 = Math.cos((x + layer * 150) / 80) * 15;
                const y = 80 + layer * 60 + wave1 + wave2;

                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Flower-like circles
        ctx.fillStyle = color;
        const flowerCenters = [[150, 100], [650, 120], [400, 260]];

        flowerCenters.forEach(([cx, cy]) => {
            // Center circle
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();

            // Petals around
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
                const px = cx + Math.cos(angle) * 25;
                const py = cy + Math.sin(angle) * 25;
                ctx.beginPath();
                ctx.arc(px, py, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    private drawPlayfulPattern(ctx: CanvasRenderingContext2D, color: string): void {
        // Magical sparkles and stars pattern
        ctx.fillStyle = color;
        const random = (seed: number) => (Math.sin(seed) + 1) / 2;

        // Large stars
        for (let i = 0; i < 15; i++) {
            const x = random(i * 123) * this.WIDTH;
            const y = random(i * 456) * (this.IMAGE_HEIGHT - 50);
            const size = random(i * 789) * 6 + 4;
            this.drawStar(ctx, x, y, size);
        }

        // Small sparkles (4-pointed)
        for (let i = 0; i < 25; i++) {
            const x = random(i * 321) * this.WIDTH;
            const y = random(i * 654) * (this.IMAGE_HEIGHT - 50);
            const size = random(i * 987) * 3 + 2;
            this.drawSparkle(ctx, x, y, size);
        }

        // Curved lines connecting some sparkles
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const x1 = random(i * 111) * this.WIDTH;
            const y1 = random(i * 222) * (this.IMAGE_HEIGHT - 50);
            const x2 = random(i * 333) * this.WIDTH;
            const y2 = random(i * 444) * (this.IMAGE_HEIGHT - 50);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(
                (x1 + x2) / 2, y1 - 30,
                (x1 + x2) / 2, y2 + 30,
                x2, y2
            );
            ctx.stroke();
        }
    }

    private drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        // 4-pointed sparkle
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.3, y - size * 0.3);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size * 0.3, y + size * 0.3);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.3, y + size * 0.3);
        ctx.lineTo(x - size, y);
        ctx.lineTo(x - size * 0.3, y - size * 0.3);
        ctx.closePath();
        ctx.fill();
    }

    private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    private drawCornerAccents(ctx: CanvasRenderingContext2D, color: string): void {
        // Top left - layered accent
        const gradient1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
        gradient1.addColorStop(0, color + '40');
        gradient1.addColorStop(0.5, color + '20');
        gradient1.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient1;
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI / 2);
        ctx.lineTo(0, 0);
        ctx.fill();

        // Top right - layered accent
        const gradient2 = ctx.createRadialGradient(this.WIDTH, 0, 0, this.WIDTH, 0, 120);
        gradient2.addColorStop(0, color + '40');
        gradient2.addColorStop(0.5, color + '20');
        gradient2.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.arc(this.WIDTH, 0, 120, Math.PI / 2, Math.PI);
        ctx.lineTo(this.WIDTH, 0);
        ctx.fill();

        // Bottom corners - subtle glow
        const gradient3 = ctx.createRadialGradient(0, this.IMAGE_HEIGHT, 0, 0, this.IMAGE_HEIGHT, 80);
        gradient3.addColorStop(0, color + '25');
        gradient3.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient3;
        ctx.beginPath();
        ctx.arc(0, this.IMAGE_HEIGHT, 80, 0, Math.PI * 2);
        ctx.fill();

        const gradient4 = ctx.createRadialGradient(this.WIDTH, this.IMAGE_HEIGHT, 0, this.WIDTH, this.IMAGE_HEIGHT, 80);
        gradient4.addColorStop(0, color + '25');
        gradient4.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient4;
        ctx.beginPath();
        ctx.arc(this.WIDTH, this.IMAGE_HEIGHT, 80, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Ism (katta va kreativ) - centered in image area
     */
    private drawName(ctx: CanvasRenderingContext2D, name: string, theme: DesignTheme): void {
        const { textMain, accent, primary } = theme.palette;

        // Name background with gradient and rounded corners
        const boxY = this.IMAGE_HEIGHT / 2 - 70;
        const boxHeight = 140;
        const boxPadding = 40;

        // Outer glow
        ctx.shadowColor = accent + '60';
        ctx.shadowBlur = 40;

        // Gradient background
        const bgGradient = ctx.createLinearGradient(0, boxY, 0, boxY + boxHeight);
        bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.92)');
        ctx.fillStyle = bgGradient;

        // Rounded rectangle
        this.drawRoundedRect(ctx, boxPadding, boxY, this.WIDTH - boxPadding * 2, boxHeight, 20);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Decorative border
        ctx.strokeStyle = accent + '40';
        ctx.lineWidth = 3;
        this.drawRoundedRect(ctx, boxPadding, boxY, this.WIDTH - boxPadding * 2, boxHeight, 20);
        ctx.stroke();

        // Name text
        ctx.fillStyle = textMain;
        ctx.font = 'bold 80px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.fillText(name, this.WIDTH / 2, this.IMAGE_HEIGHT / 2);

        // Decorative underline
        ctx.shadowColor = 'transparent';
        const gradient = ctx.createLinearGradient(
            this.WIDTH / 2 - 200,
            165,
            this.WIDTH / 2 + 200,
            165,
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, accent);
        gradient.addColorStop(1, 'transparent');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.WIDTH / 2 - 200, 185);
        ctx.lineTo(this.WIDTH / 2 + 200, 185);
        ctx.stroke();
    }

    /**
     * Ma'no matnini ko'p qatorga bo'lib chiqaradi - text area below image
     */
    private drawMeaning(ctx: CanvasRenderingContext2D, meaning: string, theme: DesignTheme): void {
        ctx.shadowColor = 'transparent';

        // Icon
        ctx.fillStyle = theme.palette.accent;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📖', this.WIDTH / 2, this.IMAGE_HEIGHT + 35);

        // Ma'nosi label
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 18px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ma\'nosi:', this.WIDTH / 2, this.IMAGE_HEIGHT + 70);

        // Meaning text
        ctx.fillStyle = '#1e293b';
        ctx.font = '22px Roboto, sans-serif';
        ctx.textAlign = 'center';

        const maxWidth = this.WIDTH - this.PADDING * 3;
        const lineHeight = 34;
        const lines = this.wrapText(ctx, meaning, maxWidth);

        const startY = this.IMAGE_HEIGHT + 110;
        lines.forEach((line, index) => {
            ctx.fillText(line, this.WIDTH / 2, startY + index * lineHeight);
        });
    }

    /**
     * Matnni qatorlarga bo'lish
     */
    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach((word) => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    /**
     * Image area frame/border
     */
    private drawImageFrame(ctx: CanvasRenderingContext2D, theme: DesignTheme): void {
        const { accent } = theme.palette;

        // Thick bottom border separating image from text
        ctx.strokeStyle = accent;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, this.IMAGE_HEIGHT);
        ctx.lineTo(this.WIDTH, this.IMAGE_HEIGHT);
        ctx.stroke();

        // Decorative gradient overlay
        const gradient = ctx.createLinearGradient(0, this.IMAGE_HEIGHT - 20, 0, this.IMAGE_HEIGHT);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, this.IMAGE_HEIGHT - 20, this.WIDTH, 20);
    }

    /**
     * Bot username at the bottom - in text area
     */
    private drawBotUsername(ctx: CanvasRenderingContext2D): void {
        // Divider line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.PADDING * 4, this.HEIGHT - 60);
        ctx.lineTo(this.WIDTH - this.PADDING * 4, this.HEIGHT - 60);
        ctx.stroke();

        // Username
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 18px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('@ismlarimizmanolari_bot', this.WIDTH / 2, this.HEIGHT - 30);
    }

    /**
     * Helper method to draw rounded rectangle
     */
    private drawRoundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
