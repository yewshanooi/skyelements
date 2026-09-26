"use client";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SaleItem } from '@/sales/types';
import type { FilterState } from '@/sales/lib/filterUtils';
import { formatDateDisplay } from '@/sales/lib/dateUtils';
import {
  computeKpiStats,
  computeTrendData,
  computeStoreComparison,
  computeCategoryMatrix,
  computeTopCustomers,
  computeDayOfWeekData,
  computeFulfillmentData,
  computeTopProducts,
  type TrendDataPoint,
  type StoreComparisonPoint,
  type CategoryMatrixPoint,
  type DayOfWeekPoint,
} from '@/sales/lib/chartUtils';

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

export const formatCurrency = (val: number | null | undefined): string => {
  const num = Number(val || 0);
  return num.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCurrencyCompact = (val: number | null | undefined): string => {
  const num = Number(val || 0);
  if (Math.abs(num) >= 1000000) return `RM ${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `RM ${(num / 1000).toFixed(1)}k`;
  return `RM ${num.toFixed(0)}`;
};

const getFilterSummaryString = (filters?: FilterState): string => {
  if (!filters) return '';

  const parts: string[] = [];
  if (filters.stores && filters.stores.length > 0) {
    parts.push(`Store: ${filters.stores.join(', ')}`);
  }
  if (filters.categories && filters.categories.length > 0) {
    parts.push(`Categories: ${filters.categories.join(', ')}`);
  }
  if (filters.orderStatuses && filters.orderStatuses.length > 0) {
    parts.push(`Order: ${filters.orderStatuses.join(', ')}`);
  }
  if (filters.paymentStatuses && filters.paymentStatuses.length > 0) {
    parts.push(`Payment: ${filters.paymentStatuses.join(', ')}`);
  }
  if (filters.search && filters.search.trim()) {
    parts.push(`Query: "${filters.search.trim()}"`);
  }
  if (filters.dateRange && filters.dateRange !== 'all') {
    parts.push(`Range: ${filters.dateRange}`);
  }

  return parts.join(' | ');
};

// ============================================================================
// HIGH-RESOLUTION CANVAS CHART DRAWING
// ============================================================================

/**
 * Renders Revenue & Net Profit Trend Chart onto an offscreen canvas
 */
function drawTrendChartCanvas(data: TrendDataPoint[]): string | null {
  if (typeof document === 'undefined' || !data || data.length === 0) return null;

  const width = 825;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Card outline
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillText('Revenue & Net Profit Trends', 24, 32);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Helvetica, Arial, sans-serif';
  ctx.fillText('Monthly timeline comparison between gross sales and net realized profit', 24, 48);

  // Legend
  const legendY = 32;
  // Revenue legend
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(width - 250, legendY - 8, 12, 10);
  ctx.fillStyle = '#334155';
  ctx.font = '10.5px Helvetica, Arial, sans-serif';
  ctx.fillText('Revenue', width - 232, legendY);

  // Profit legend
  ctx.fillStyle = '#10b981';
  ctx.fillRect(width - 150, legendY - 8, 12, 10);
  ctx.fillStyle = '#334155';
  ctx.fillText('Net Profit', width - 132, legendY);

  // Chart plotting boundaries
  const padLeft = 70;
  const padRight = 30;
  const padTop = 82;
  const padBottom = 55;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Maximum value for scaling
  const maxVal = Math.max(...data.map((d) => Math.max(d.subtotal, d.profit, 100)), 500);
  // Round up to nearest clean ceiling
  const step = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const yCeil = Math.ceil(maxVal / step) * step;

  // Y-axis gridlines & labels
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = (yCeil / gridSteps) * i;
    const yPos = padTop + plotH - (yVal / yCeil) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, yPos);
    ctx.lineTo(width - padRight, yPos);
    ctx.stroke();

    ctx.fillText(formatCurrencyCompact(yVal), padLeft - 8, yPos);
  }

  // Draw Bars
  const items = data.slice(-12); // Last 12 intervals
  const n = items.length;
  const slotW = plotW / n;
  const barW = Math.min(slotW * 0.35, 24);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let i = 0; i < n; i++) {
    const d = items[i];
    const centerX = padLeft + i * slotW + slotW / 2;

    const revH = Math.max((d.subtotal / yCeil) * plotH, 2);
    const profitH = Math.max((d.profit / yCeil) * plotH, 2);

    const revX = centerX - barW - 1.5;
    const revY = padTop + plotH - revH;

    const profitX = centerX + 1.5;
    const profitY = padTop + plotH - profitH;

    // Draw Revenue Bar
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(revX, revY, barW, revH, [3, 3, 0, 0]);
    ctx.fill();

    // Draw Profit Bar
    ctx.fillStyle = d.profit >= 0 ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(profitX, profitY, barW, profitH, [3, 3, 0, 0]);
    ctx.fill();

    // X-axis label
    ctx.fillStyle = '#475569';
    ctx.font = '10px Helvetica, Arial, sans-serif';
    ctx.fillText(d.label, centerX, padTop + plotH + 12);

    // Value above profit bar if enough room
    if (barW >= 14 && d.profit > 0) {
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 8.5px Helvetica, Arial, sans-serif';
      ctx.fillText(formatCurrencyCompact(d.profit), profitX + barW / 2, profitY - 10);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Renders Store Comparison & Donut Share onto an offscreen canvas
 */
function drawStoreChartCanvas(stores: StoreComparisonPoint[], totalRevenue: number): string | null {
  if (typeof document === 'undefined' || !stores || stores.length === 0) return null;

  const width = 825;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Card outline
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillText('Multichannel Store Comparison', 24, 32);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px Helvetica, Arial, sans-serif';
  ctx.fillText('Revenue share and profit margins across Shopee, Carousell, and direct sales', 24, 48);

  // Color mapping
  const storeColors: Record<string, string> = {
    Shopee: '#ee4d2d',
    Carousell: '#008f79',
    Other: '#64748b',
  };

  // Left Donut Chart
  const donutCenterX = 145;
  const donutCenterY = 250;
  const outerR = 100;
  const innerR = 62;

  let startAngle = -Math.PI / 2;
  const totalRev = totalRevenue || stores.reduce((sum, s) => sum + s.revenue, 0) || 1;

  stores.forEach((st) => {
    const sliceAngle = (st.revenue / totalRev) * (Math.PI * 2);
    const color = storeColors[st.name] || '#3b82f6';

    ctx.beginPath();
    ctx.arc(donutCenterX, donutCenterY, outerR, startAngle, startAngle + sliceAngle);
    ctx.arc(donutCenterX, donutCenterY, innerR, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    startAngle += sliceAngle;
  });

  // Center cutout text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('REVENUE', donutCenterX, donutCenterY - 8);
  ctx.font = 'bold 10.5px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('SHARE', donutCenterX, donutCenterY + 11);

  // Right Side Store Detail Cards
  const cardX = 295;
  const cardW = width - cardX - 24;
  const availableH = height - 74 - 20;
  const cardGap = stores.length > 2 ? 10 : 16;
  const cardH = Math.min(172, Math.floor((availableH - (stores.length - 1) * cardGap) / stores.length));
  let cardY = 74;

  stores.forEach((st) => {
    const color = storeColors[st.name] || '#3b82f6';
    const revShare = totalRev > 0 ? ((st.revenue / totalRev) * 100).toFixed(1) : '0';

    // Store card background
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Store color bar on left
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, 6, cardH, [8, 0, 0, 8]);
    ctx.fill();

    // Store Title (left)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
    ctx.fillText(st.name, cardX + 22, cardY + 18);

    // Share Badge (pill shape on top-right, avoids collision)
    const badgeW = 135;
    const badgeH = 24;
    const badgeX = cardX + cardW - badgeW - 18;
    const badgeY = cardY + 14;

    ctx.fillStyle = color + '15';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
    ctx.fillText(`${revShare}% Volume Share`, badgeX + badgeW / 2, badgeY + badgeH / 2);

    // Metrics Row - 4 equal columns
    const innerW = cardW - 44;
    const colW = innerW / 4;
    const col1X = cardX + 22;
    const col2X = cardX + 22 + colW;
    const col3X = cardX + 22 + colW * 2;
    const col4X = cardX + 22 + colW * 3;

    // Row 1: Labels
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9.5px Helvetica, Arial, sans-serif';
    ctx.fillText('GROSS REVENUE', col1X, cardY + 54);
    ctx.fillText('NET PROFIT', col2X, cardY + 54);
    ctx.fillText('MARGIN', col3X, cardY + 54);
    ctx.fillText('ORDERS / AOV', col4X, cardY + 54);

    // Row 2: Values
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13.5px Helvetica, Arial, sans-serif';
    ctx.fillText(`RM ${formatCurrency(st.revenue)}`, col1X, cardY + 72);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`RM ${formatCurrency(st.profit)}`, col2X, cardY + 72);

    ctx.fillStyle = '#2563eb';
    ctx.fillText(`${st.margin.toFixed(1)}%`, col3X, cardY + 72);

    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${st.orders} • RM ${st.aov.toFixed(0)}`, col4X, cardY + 72);

    // Margin progress bar
    const barTrackW = cardW - 44;
    const barFillW = Math.max(Math.min((st.margin / 100) * barTrackW, barTrackW), 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(cardX + 22, cardY + 114, barTrackW, 10, 5);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cardX + 22, cardY + 114, barFillW, 10, 5);
    ctx.fill();

    // Subtext below progress bar
    ctx.font = '9.5px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(`Realized Margin: ${st.margin.toFixed(1)}%`, cardX + 22, cardY + 134);
    ctx.textAlign = 'right';
    ctx.fillText(`Revenue Contribution: RM ${formatCurrency(st.revenue)}`, cardX + cardW - 22, cardY + 134);

    cardY += cardH + cardGap;
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renders Category Profitability Horizontal Bars onto an offscreen canvas
 */
function drawCategoryChartCanvas(categories: CategoryMatrixPoint[]): string | null {
  if (typeof document === 'undefined' || !categories || categories.length === 0) return null;

  const width = 825;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillText('Category Profitability Breakdown', 24, 32);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px Helvetica, Arial, sans-serif';
  ctx.fillText('Top product categories ranked by revenue contribution & profit margins', 24, 48);

  const topCats = categories.slice(0, 6);
  const maxRevenue = Math.max(...topCats.map((c) => c.revenue), 100);

  const startY = 80;
  const rowHeight = 56;
  const labelW = 150;
  const barMaxW = width - labelW - 165;

  topCats.forEach((cat, idx) => {
    const y = startY + idx * rowHeight;

    // Category Label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
    ctx.fillText(cat.category, 24, y + 10);

    // Orders Subtext
    ctx.fillStyle = '#64748b';
    ctx.font = '9.5px Helvetica, Arial, sans-serif';
    ctx.fillText(`${cat.orders} orders • ${cat.quantity} units`, 24, y + 27);

    // Dual Bars (Revenue & Profit)
    const revBarW = Math.max((cat.revenue / maxRevenue) * barMaxW, 6);
    const profitBarW = Math.max((cat.profit / maxRevenue) * barMaxW, 4);

    // Revenue Bar (Light Blue)
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.roundRect(labelW, y + 4, revBarW, 13, 3);
    ctx.fill();

    // Profit Bar (Emerald)
    ctx.fillStyle = cat.profit >= 0 ? '#10b981' : '#f43f5e';
    ctx.beginPath();
    ctx.roundRect(labelW, y + 21, profitBarW, 13, 3);
    ctx.fill();

    // Financial Values & Margin Pill on right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
    ctx.fillText(`RM ${formatCurrency(cat.revenue)}`, width - 24, y + 10);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
    ctx.fillText(`+RM ${formatCurrency(cat.profit)} (${cat.margin.toFixed(0)}%)`, width - 24, y + 27);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renders Day of Week Velocity Chart onto an offscreen canvas
 */
function drawDayOfWeekChartCanvas(days: DayOfWeekPoint[]): string | null {
  if (typeof document === 'undefined' || !days || days.length === 0) return null;

  const width = 825;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillText('Sales Velocity by Day of Week', 24, 32);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px Helvetica, Arial, sans-serif';
  ctx.fillText('Order volume and realized profit distribution across days of the week', 24, 48);

  const maxProfit = Math.max(...days.map((d) => d.profit), 100);
  const padLeft = 45;
  const padRight = 35;
  const padTop = 82;
  const padBottom = 55;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const slotW = plotW / days.length;
  const barW = Math.min(slotW * 0.46, 38);

  // Find peak day
  let peakIdx = 0;
  let maxP = -Infinity;
  days.forEach((d, idx) => {
    if (d.profit > maxP) {
      maxP = d.profit;
      peakIdx = idx;
    }
  });

  days.forEach((d, idx) => {
    const centerX = padLeft + idx * slotW + slotW / 2;
    const barH = Math.max((d.profit / maxProfit) * plotH, 4);
    const barX = centerX - barW / 2;
    const barY = padTop + plotH - barH;

    const isPeak = idx === peakIdx && d.profit > 0;

    // Bar Fill
    ctx.fillStyle = isPeak ? '#2563eb' : '#60a5fa';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Day Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isPeak ? '#0f172a' : '#64748b';
    ctx.font = isPeak ? 'bold 11px Helvetica, Arial, sans-serif' : '10.5px Helvetica, Arial, sans-serif';
    ctx.fillText(d.day, centerX, padTop + plotH + 12);

    // Value above bar
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = isPeak ? '#1d4ed8' : '#334155';
    ctx.font = isPeak ? 'bold 9.5px Helvetica, Arial, sans-serif' : '9px Helvetica, Arial, sans-serif';
    ctx.fillText(`RM ${formatCurrency(d.profit)}`, centerX, barY - 8);

    // Orders count label inside or above
    ctx.fillStyle = '#64748b';
    ctx.font = '8.5px Helvetica, Arial, sans-serif';
    ctx.fillText(`${d.orders} orders`, centerX, barY - 22);
  });

  return canvas.toDataURL('image/png');
}

// ============================================================================
// MAIN PDF GENERATION EXPORT SERVICE
// ============================================================================

export interface ExportPdfOptions {
  filename?: string;
  reportTitle?: string;
}

/**
 * Generates an executive Sales Dashboard PDF report containing:
 * Section 1: Sales Line Items Ledger (Table Page)
 * Section 2: Sales & Financial Analytics (Chart Page)
 */
export async function generateSalesPdfReport(
  sales: SaleItem[],
  filters?: FilterState,
  options?: ExportPdfOptions
): Promise<void> {
  if (!sales || sales.length === 0) {
    throw new Error('No sales records to export.');
  }

  // 1. Compute all analytics & KPIs
  const kpi = computeKpiStats(sales);
  const trendData = computeTrendData(sales, 'monthly');
  const storeData = computeStoreComparison(sales, kpi.totalSubtotal, kpi.totalSales);
  const categoryMatrix = computeCategoryMatrix(sales, 'revenue');
  const topCustomers = computeTopCustomers(sales);
  const topProducts = computeTopProducts(sales, kpi.totalSales);
  const dayOfWeekData = computeDayOfWeekData(sales);
  const fulfillment = computeFulfillmentData(sales);

  // 2. Initialize Landscape A4 PDF (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  const dateNowStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeNowStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ==========================================================================
  // SECTION 1: COVER HEADER & SALES LINE ITEMS (Table Page)
  // ==========================================================================

  // Corporate Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginX, 12, pageWidth - marginX * 2, 14, 'F');

  // Title on the left
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SALES DASHBOARD', marginX + 8, 20.8);

  // Filter summary on the right (only if active filters exist)
  const filterSummary = getFilterSummaryString(filters);
  if (filterSummary) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(filterSummary, pageWidth - marginX - 8, 20.8, { align: 'right' });
  }

  // Quick KPI Highlights Strip
  const stripY = 30;
  const stripH = 14;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginX, stripY, pageWidth - marginX * 2, stripH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, stripY, pageWidth - marginX * 2, stripH, 2, 2, 'S');

  // 4 KPI Pill Segments
  const colStep = (pageWidth - marginX * 2) / 4;
  const kpiItems = [
    { label: 'TOTAL ORDERS', val: `${kpi.totalOrders} orders (${kpi.totalUnits} units)` },
    { label: 'GROSS REVENUE', val: `RM ${formatCurrency(kpi.totalSubtotal)}` },
    { label: 'TOTAL COSTS', val: `RM ${formatCurrency(kpi.totalCost)}` },
    { label: 'NET PROFIT', val: `RM ${formatCurrency(kpi.totalSales)} (${kpi.profitMargin}%)` },
  ];

  kpiItems.forEach((item, idx) => {
    const x = marginX + idx * colStep + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x, stripY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    if (idx === 3) {
      doc.setTextColor(5, 150, 105); // emerald-600
    } else {
      doc.setTextColor(15, 23, 42); // slate-900
    }
    doc.text(item.val, x, stripY + 10.5);
  });

  // Line items table columns:
  // # | Date | Order Item | Category | Store | Customer | Qty | Subtotal (RM) | Cost (RM) | Profit (RM) | Order Status | Payment Status
  const lineItemRows = sales.map((s, index) => [
    (index + 1).toString(),
    formatDateDisplay(s.date) || '-',
    s.item || 'Untitled',
    s.category || 'General',
    s.marketplace || 'Direct',
    s.customer || 'Anonymous',
    s.quantity.toString(),
    formatCurrency(s.subtotal),
    formatCurrency(s.cost),
    formatCurrency(s.sales),
    s.order_status || 'Delivered',
    s.payment_status || 'Paid',
  ]);

  // Section 1 Table (starts directly beneath KPI strip)
  autoTable(doc, {
    startY: 48,
    margin: { left: marginX, right: marginX, bottom: 15, top: 14 },
    showHead: 'firstPage',
    head: [[
      '#',
      'Date',
      'Order / Item',
      'Category',
      'Store',
      'Customer',
      'Qty',
      'Subtotal (RM)',
      'Cost (RM)',
      'Profit (RM)',
      'Order Status',
      'Payment Status',
    ]],
    body: lineItemRows,
    showFoot: 'lastPage',
    foot: [[
      {
        content: 'Total',
        colSpan: 6,
        styles: { halign: 'left', fontStyle: 'bold' },
      },
      {
        content: kpi.totalUnits.toString(),
        styles: { halign: 'right', fontStyle: 'bold' },
      },
      {
        content: formatCurrency(kpi.totalSubtotal),
        styles: { halign: 'right', fontStyle: 'bold' },
      },
      {
        content: formatCurrency(kpi.totalCost),
        styles: { halign: 'right', fontStyle: 'bold' },
      },
      {
        content: formatCurrency(kpi.totalSales),
        styles: { halign: 'right', fontStyle: 'bold' },
      },
      '',
      '',
    ]],
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      overflow: 'linebreak',
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      font: 'helvetica',
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 7.5,
      font: 'helvetica',
      fontStyle: 'bold',
      lineWidth: 0.2,
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 19, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 25, halign: 'left' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 25, halign: 'left' },
      6: { cellWidth: 10, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' },
      9: { cellWidth: 24, halign: 'right' },
      10: { cellWidth: 23, halign: 'center' },
      11: { cellWidth: 23, halign: 'center' },
    },
    didParseCell: (data) => {
      // Ensure numeric cells in the total footer line are right aligned
      if (data.section === 'foot' && data.column.index >= 6 && data.column.index <= 9) {
        data.cell.styles.halign = 'right';
      }

      // Highlight Net Profit in emerald or red
      if (data.section === 'body' && data.column.index === 9) {
        const rowData = sales[data.row.index];
        if (rowData && rowData.sales < 0) {
          data.cell.styles.textColor = [220, 38, 38]; // red
        } else {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Status pill formatting
      if (data.section === 'body' && data.column.index === 10) {
        const val = data.cell.raw as string;
        if (val === 'Delivered') {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (val === 'Shipped') {
          data.cell.styles.textColor = [37, 99, 235];
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
  });

  // ==========================================================================
  // ANALYTICS (Chart Page - Page 1)
  // ==========================================================================

  // Always start Analytics on a clean new page
  doc.addPage('a4', 'landscape');

  // Analytics Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginX, 10, pageWidth - marginX * 2, 13, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ANALYTICS', marginX + 8, 18.5);

  // 8 Executive KPI Cards (2 rows of 4 cards)
  const cardGridY = 25;
  const cardW = (pageWidth - marginX * 2 - 3 * 4) / 4; // 4 cards with 4mm gap
  const cardH = 16.5;

  const kpiCards = [
    { title: 'NET PROFIT', val: `RM ${formatCurrency(kpi.totalSales)}`, sub: `Margin: ${kpi.profitMargin}%`, highlight: true },
    { title: 'GROSS REVENUE', val: `RM ${formatCurrency(kpi.totalSubtotal)}`, sub: `AOV: RM ${kpi.avgOrderValue.toFixed(2)}`, highlight: false },
    { title: 'TOTAL COSTS', val: `RM ${formatCurrency(kpi.totalCost)}`, sub: `ROI: ${kpi.roiPercentage}%`, highlight: false },
    { title: 'TOTAL ORDERS', val: `${kpi.totalOrders} Orders`, sub: `${kpi.uniqueCustomersCount} Customers`, highlight: false },
    { title: 'UNITS SOLD', val: `${kpi.totalUnits} Units`, sub: `Avg ${kpi.itemsPerOrder.toFixed(1)} / order`, highlight: false },
    { title: 'AVG PROFIT / ORDER', val: `RM ${kpi.avgProfitPerOrder.toFixed(2)}`, sub: `Per Item: RM ${kpi.avgPricePerItem.toFixed(2)}`, highlight: false },
    { title: 'AVG PROFIT / UNIT', val: `RM ${kpi.avgProfitPerUnit}`, sub: 'Net contribution / unit', highlight: false },
    { title: 'FULFILLMENT RATE', val: `${fulfillment.completionRate}%`, sub: `Pending: RM ${formatCurrency(fulfillment.pendingRevenue)}`, highlight: false },
  ];

  kpiCards.forEach((c, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const cx = marginX + col * (cardW + 4);
    const cy = cardGridY + row * (cardH + 2.5);

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');

    // Accent line on left
    if (c.highlight) {
      doc.setFillColor(16, 185, 129); // emerald
      doc.roundedRect(cx, cy, 1.0, cardH, 0.6, 0.6, 'F');
    }

    // Card Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, cx + 4.5, cy + 4.5);

    // Card Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (c.highlight) {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(c.val, cx + 4.5, cy + 10);

    // Card Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.sub, cx + 4.5, cy + 14);
  });

  // Visual Charts Row (Side by side)
  const chartRowY = cardGridY + cardH * 2 + 5 + 2;
  const chartW = (pageWidth - marginX * 2 - 5) / 2; // 2 equal columns
  const chartH = 72;

  try {
    // 1. Revenue & Profit Trend Canvas Chart
    const trendImg = drawTrendChartCanvas(trendData);
    if (trendImg) {
      doc.addImage(trendImg, 'PNG', marginX, chartRowY, chartW, chartH);
    }

    // 2. Multichannel Store Comparison Canvas Chart
    const storeImg = drawStoreChartCanvas(storeData, kpi.totalSubtotal);
    if (storeImg) {
      doc.addImage(storeImg, 'PNG', marginX + chartW + 5, chartRowY, chartW, chartH);
    }
  } catch (err) {
    console.error('Error drawing section 2 charts:', err);
  }

  // Summary Category Matrix Table below charts on this page
  const catTableY = chartRowY + chartH + 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Key Category Matrix & Channel Distribution', marginX, catTableY + 3.5);

  const topCats = categoryMatrix.slice(0, 5);
  autoTable(doc, {
    startY: catTableY + 5,
    margin: { left: marginX, right: marginX, bottom: 12 },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    head: [[
      'Category',
      'Orders',
      'Units Sold',
      'Gross Revenue (RM)',
      'Cost (RM)',
      'Net Profit (RM)',
      'Profit Margin',
    ]],
    body: topCats.map((c) => [
      c.category,
      c.orders.toString(),
      c.quantity.toString(),
      formatCurrency(c.revenue),
      formatCurrency(c.cost),
      formatCurrency(c.profit),
      `${c.margin.toFixed(1)}%`,
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.4,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 22, halign: 'right' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 42, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
      5: { cellWidth: 42, halign: 'right' },
      6: { cellWidth: 38, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ==========================================================================
  // ANALYTICS (Chart Page - Page 2: Additional Charts & Leaderboards)
  // ==========================================================================

  doc.addPage('a4', 'landscape');

  // 2 Canvas Charts side by side
  const page2ChartY = 14;
  const page2ChartH = 72;

  try {
    // 3. Category Profitability Canvas Chart
    const catImg = drawCategoryChartCanvas(categoryMatrix);
    if (catImg) {
      doc.addImage(catImg, 'PNG', marginX, page2ChartY, chartW, page2ChartH);
    }

    // 4. Day of Week Velocity Canvas Chart
    const dayImg = drawDayOfWeekChartCanvas(dayOfWeekData);
    if (dayImg) {
      doc.addImage(dayImg, 'PNG', marginX + chartW + 5, page2ChartY, chartW, page2ChartH);
    }
  } catch (err) {
    console.error('Error drawing analytics continued charts:', err);
  }

  // Parallel Breakdown Tables
  const tableSplitY = page2ChartY + page2ChartH + 5;
  const tableSplitW = (pageWidth - marginX * 2 - 6) / 2;

  // Left Table: Top Customers Leaderboard
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Customer Leaderboard (Top 5 Buyers by Net Profit)', marginX, tableSplitY + 3.5);

  const topCustRows = topCustomers.slice(0, 5).map((c, idx) => [
    (idx + 1).toString(),
    c.customer,
    c.orders.toString(),
    formatCurrency(c.totalRevenue),
    formatCurrency(c.totalProfit),
    `${c.margin.toFixed(0)}%`,
  ]);

  autoTable(doc, {
    startY: tableSplitY + 5,
    margin: { left: marginX, bottom: 12 },
    tableWidth: tableSplitW,
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    head: [['#', 'Customer', 'Orders', 'Spend (RM)', 'Profit (RM)', 'Margin']],
    body: topCustRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.4,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 14, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Right Table: Top Performing Products
  const rightTableX = marginX + tableSplitW + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Top Performing Products (by Net Profit)', rightTableX, tableSplitY + 3.5);

  const topProdRows = topProducts.slice(0, 5).map((p, idx) => [
    (idx + 1).toString(),
    p.item.length > 25 ? `${p.item.slice(0, 24)}...` : p.item,
    p.units.toString(),
    formatCurrency(p.revenue),
    formatCurrency(p.profit),
    `${p.margin.toFixed(0)}%`,
  ]);

  autoTable(doc, {
    startY: tableSplitY + 5,
    margin: { left: rightTableX, bottom: 12 },
    tableWidth: tableSplitW,
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    head: [['#', 'Product', 'Units', 'Revenue (RM)', 'Profit (RM)', 'Margin']],
    body: topProdRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.4,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 14, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ==========================================================================
  // FOOTER & RUNNING PAGE NUMBERS ACROSS ALL PAGES
  // ==========================================================================

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom rule line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    // Left running footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Sales Dashboard', marginX, pageHeight - 6.5);

    // Center timestamp
    doc.text(`Generated on ${dateNowStr} ${timeNowStr}`, pageWidth / 2, pageHeight - 6.5, { align: 'center' });

    // Right page numbers
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, { align: 'right' });
  }

  // 3. Save & trigger download
  const defaultFilename = `Sales_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`;
  const filename = options?.filename || defaultFilename;
  doc.save(filename);
}
