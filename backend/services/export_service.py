import csv
import io
from fastapi.responses import StreamingResponse
import openpyxl
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from typing import List, Dict, Any

class ExportService:
    @staticmethod
    def export_csv(title: str, headers: List[str], rows: List[Dict[str, Any]]) -> StreamingResponse:
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow([title])
        writer.writerow([])
        writer.writerow(headers)
        
        for row in rows:
            writer.writerow([row.get(h, "") for h in headers])
            
        stream.seek(0)
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = f"attachment; filename={title.replace(' ', '_').lower()}.csv"
        return response

    @staticmethod
    def export_excel(title: str, headers: List[str], rows: List[Dict[str, Any]]) -> StreamingResponse:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Report"
        
        ws.append([title])
        ws.append([])
        ws.append(headers)
        
        for row in rows:
            ws.append([row.get(h, "") for h in headers])
            
        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        
        response = StreamingResponse(iter([stream.getvalue()]), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response.headers["Content-Disposition"] = f"attachment; filename={title.replace(' ', '_').lower()}.xlsx"
        return response

    @staticmethod
    def export_pdf(title: str, headers: List[str], rows: List[Dict[str, Any]]) -> StreamingResponse:
        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=landscape(letter))
        elements = []
        
        styles = getSampleStyleSheet()
        elements.append(Paragraph(title, styles['Title']))
        elements.append(Spacer(1, 20))
        
        # Prepare data for table
        data = [headers]
        for row in rows:
            data.append([str(row.get(h, "")) for h in headers])
            
        # Create table
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(t)
        doc.build(elements)
        
        stream.seek(0)
        response = StreamingResponse(iter([stream.getvalue()]), media_type="application/pdf")
        response.headers["Content-Disposition"] = f"attachment; filename={title.replace(' ', '_').lower()}.pdf"
        return response
        
    @classmethod
    def dispatch_export(cls, export_format: str, title: str, headers: List[str], rows: List[Dict[str, Any]]) -> StreamingResponse:
        fmt = export_format.lower()
        if fmt == "csv":
            return cls.export_csv(title, headers, rows)
        elif fmt == "excel" or fmt == "xlsx":
            return cls.export_excel(title, headers, rows)
        elif fmt == "pdf":
            return cls.export_pdf(title, headers, rows)
        else:
            raise ValueError(f"Unsupported export format: {export_format}")
