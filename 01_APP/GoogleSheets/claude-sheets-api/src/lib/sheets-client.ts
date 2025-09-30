// Google Sheets クライアント (google-spreadsheet使用)

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export interface SheetData {
  range: string;
  values: string[][];
}

export class SheetsClient {
  private jwt: JWT | null = null;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (serviceAccountEmail && privateKey) {
      this.jwt = new JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });
    } else {
      console.warn('Google Sheets credentials not configured');
    }
  }

  async getSheetData(spreadsheetId: string, sheetName?: string): Promise<SheetData> {
    if (!this.jwt) {
      throw new Error('Google Sheets not configured');
    }

    const doc = new GoogleSpreadsheet(spreadsheetId, this.jwt);
    await doc.loadInfo();

    const sheet = sheetName
      ? doc.sheetsByTitle[sheetName]
      : doc.sheetsByIndex[0];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || 'index 0'}`);
    }

    const rows = await sheet.getRows();
    const headers = sheet.headerValues;

    const values = [
      headers,
      ...rows.map(row => headers.map(header => row.get(header) || ''))
    ];

    return {
      range: `${sheet.title}!A1:${String.fromCharCode(65 + headers.length - 1)}${rows.length + 1}`,
      values,
    };
  }

  async updateSheetData(
    spreadsheetId: string,
    sheetName: string,
    data: string[][],
  ): Promise<void> {
    if (!this.jwt) {
      throw new Error('Google Sheets not configured');
    }

    const doc = new GoogleSpreadsheet(spreadsheetId, this.jwt);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    await sheet.clear();
    await sheet.setHeaderRow(data[0]);

    if (data.length > 1) {
      await sheet.addRows(
        data.slice(1).map(row =>
          Object.fromEntries(data[0].map((header, i) => [header, row[i] || '']))
        )
      );
    }
  }

  async appendRows(
    spreadsheetId: string,
    sheetName: string,
    rows: Record<string, string>[],
  ): Promise<void> {
    if (!this.jwt) {
      throw new Error('Google Sheets not configured');
    }

    const doc = new GoogleSpreadsheet(spreadsheetId, this.jwt);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    await sheet.addRows(rows);
  }

  async createSheet(spreadsheetId: string, title: string): Promise<void> {
    if (!this.jwt) {
      throw new Error('Google Sheets not configured');
    }

    const doc = new GoogleSpreadsheet(spreadsheetId, this.jwt);
    await doc.loadInfo();
    await doc.addSheet({ title });
  }
}