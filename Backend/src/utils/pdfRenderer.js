import fs from 'fs';
import puppeteer from 'puppeteer';
import {
  buildDocumentBodyHtml,
  buildHeaderTemplate,
  buildFooterTemplate,
  buildFullHtmlPage,
  amountInWords,
  formatCurrency,
  formatDisplayDate,
  escapeHtml,
  getLogoDataUri
} from '../templates/quotationTemplate.js';

export {
  buildDocumentBodyHtml,
  buildHeaderTemplate,
  buildFooterTemplate,
  buildFullHtmlPage,
  amountInWords,
  formatCurrency,
  formatDisplayDate,
  escapeHtml,
  getLogoDataUri
};

// Helper to resolve executable browser path for Puppeteer
export async function getBrowserExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const chromeWindows = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (fs.existsSync(chromeWindows)) return chromeWindows;

  const edgeWindows = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(edgeWindows)) return edgeWindows;

  // Linux common paths (Ubuntu, Debian, Docker, Render)
  const linuxPaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }

  // Attempt resolving from Puppeteer
  try {
    if (typeof puppeteer.executablePath === 'function') {
      const resolved = await puppeteer.executablePath();
      if (resolved && fs.existsSync(resolved)) return resolved;
    }
  } catch (e) {
    // Puppeteer will use its internal default
  }

  return undefined;
}

let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  const browserExecutablePath = await getBrowserExecutablePath();
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--font-render-hinting=medium'
    ]
  };
  if (browserExecutablePath) {
    launchOptions.executablePath = browserExecutablePath;
  }

  browserInstance = await puppeteer.launch(launchOptions);
  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });
  return browserInstance;
}

// Generates a PDF buffer from a quotation and company record using Puppeteer
export async function renderQuotationToPdf(quotation, company, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Set viewport matching standard A4 at 96 DPI
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    const headerHtml = buildHeaderTemplate(quotation, company);
    const footerHtml = buildFooterTemplate(quotation, company);

    let navigatedToFrontend = false;
    const qId = quotation.quotationNo || quotation._id;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (qId && options.preferFrontendUrl === true) {
      try {
        const printUrl = `${frontendBase}/#/print/quotation/${encodeURIComponent(qId)}?puppeteer=true${options.token ? `&token=${encodeURIComponent(options.token)}` : ''}`;
        const response = await page.goto(printUrl, { waitUntil: 'load', timeout: 5000 });
        if (response && response.ok()) {
          await page.waitForSelector('[data-ready="true"]', { timeout: 5000 });
          navigatedToFrontend = true;
        }
      } catch (err) {
        // Fall back gracefully to direct HTML engine
      }
    }

    if (!navigatedToFrontend) {
      const htmlContent = buildDocumentBodyHtml(quotation, company);
      await page.setContent(htmlContent, {
        waitUntil: 'load',
        timeout: 15000
      });
    }

    // Ensure all web fonts and images are completed
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // Ensure spacer is cleanly 0 so table and closeout block flow without artificial overflow
      const spacer = document.getElementById('quotation-closeout-spacer');
      if (spacer) {
        spacer.style.height = '0px';
      }
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerHtml,
      footerTemplate: footerHtml,
      margin: {
        top: '36mm',
        bottom: '14mm',
        left: '10mm',
        right: '10mm'
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close().catch(() => {});
  }
}
