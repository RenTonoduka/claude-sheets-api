// Google Sheets API エンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { SheetsClient } from '@/lib/sheets-client';

const sheetsClient = new SheetsClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const spreadsheetId = searchParams.get('spreadsheetId');
    const sheetName = searchParams.get('sheetName') || undefined;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'spreadsheetId is required' },
        { status: 400 }
      );
    }

    const data = await sheetsClient.getSheetData(spreadsheetId, sheetName);

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        spreadsheetId,
        sheetName: sheetName || 'default',
      },
    });
  } catch (error) {
    console.error('Sheets GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, spreadsheetId, sheetName, data, rows } = body;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'spreadsheetId is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'update':
        if (!sheetName || !data) {
          return NextResponse.json(
            { error: 'sheetName and data are required for update' },
            { status: 400 }
          );
        }
        await sheetsClient.updateSheetData(spreadsheetId, sheetName, data);
        result = { message: 'Sheet updated successfully' };
        break;

      case 'append':
        if (!sheetName || !rows) {
          return NextResponse.json(
            { error: 'sheetName and rows are required for append' },
            { status: 400 }
          );
        }
        await sheetsClient.appendRows(spreadsheetId, sheetName, rows);
        result = { message: `${rows.length} rows appended successfully` };
        break;

      case 'create':
        if (!sheetName) {
          return NextResponse.json(
            { error: 'sheetName is required for create' },
            { status: 400 }
          );
        }
        await sheetsClient.createSheet(spreadsheetId, sheetName);
        result = { message: `Sheet '${sheetName}' created successfully` };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        action,
        spreadsheetId,
        sheetName,
      },
    });
  } catch (error) {
    console.error('Sheets POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}