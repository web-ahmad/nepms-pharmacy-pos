import os
import io
from fastapi import HTTPException
from escpos.printer import Network, Usb
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

class PrinterService:
    @staticmethod
    def _get_printer(settings):
        # We assume settings is a dictionary or an object with printer config
        interface = settings.get("printer_interface", "USB")
        if interface == "Network_IP":
            ip = settings.get("printer_ip")
            if not ip:
                raise HTTPException(status_code=400, detail="Printer IP is not configured.")
            try:
                printer = Network(ip)
                return printer
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to connect to Network Printer: {str(e)}")
        elif interface == "USB":
            vendor = settings.get("printer_usb_vendor")
            product = settings.get("printer_usb_product")
            if not vendor or not product:
                # Use a dummy or mock if vendor/product not set for development purposes
                # In real prod, this needs actual Hex IDs, e.g. 0x04b8, 0x0202
                raise HTTPException(status_code=400, detail="USB Vendor ID and Product ID not configured.")
            try:
                # Convert hex strings to int
                idVendor = int(vendor, 16)
                idProduct = int(product, 16)
                printer = Usb(idVendor, idProduct)
                return printer
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to connect to USB Printer: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Invalid printer interface.")

    @staticmethod
    def _render_urdu_text(text: str) -> Image:
        """
        Renders Urdu text into a PIL Image so that ESC/POS can print it as an image.
        Uses arial.ttf or fallback default font.
        """
        try:
            reshaped_text = arabic_reshaper.reshape(text)
            bidi_text = get_display(reshaped_text)
            
            # Create a blank white image. Width 384 for 58mm printer usually.
            # We'll calculate height based on text lines.
            width = 384
            
            # Try to load Arial or some font that might support Arabic/Urdu on Windows
            try:
                font = ImageFont.truetype("arial.ttf", 24)
            except IOError:
                font = ImageFont.load_default()
            
            # Simple text wrap logic (can be improved)
            # For now, just render it in one line or let it overflow (Pillow doesn't auto-wrap text on standard draw.text)
            # A better approach is to wrap text, but for the footer it might be short enough.
            img = Image.new('RGB', (width, 100), color=(255, 255, 255))
            d = ImageDraw.Draw(img)
            
            # We draw black text
            d.text((10, 10), bidi_text, font=font, fill=(0, 0, 0))
            
            # Optional: crop the image to the actual bounding box of the text to save paper
            
            return img
        except Exception as e:
            print(f"Error rendering Urdu text: {e}")
            return None

    @staticmethod
    def print_receipt(receipt_data: dict, settings: dict):
        """
        receipt_data: dict containing invoice details (items, totals, etc)
        settings: dict containing invoice_settings
        """
        printer = PrinterService._get_printer(settings)
        
        try:
            printer.set(align='center')
            
            if settings.get("show_logo"):
                # if logo file exists, print it
                # printer.image("logo.png")
                pass
            
            # Basic Header
            printer.text("Pharmacy Receipt\n")
            printer.text("--------------------------------\n")
            
            printer.set(align='left')
            printer.text(f"Invoice: {receipt_data.get('invoice_number', 'N/A')}\n")
            printer.text(f"Date: {receipt_data.get('date', 'N/A')}\n")
            if settings.get("show_cashier_name", True):
                printer.text(f"Cashier: {receipt_data.get('cashier_name', 'OPERATOR')}\n")
            if settings.get("show_customer_name", True) and receipt_data.get("customer_id"):
                printer.text(f"Customer: {receipt_data.get('customer_id')}\n")
            
            printer.text("--------------------------------\n")
            
            # Items
            for item in receipt_data.get("items", []):
                name = item.get("medicine_name", "")[:20]
                qty = item.get("quantity", 0)
                price = item.get("unit_price", 0)
                total = item.get("total", 0)
                printer.text(f"{name:<20} {qty}x{price} = {total}\n")
            
            printer.text("--------------------------------\n")
            printer.set(align='right')
            printer.text(f"Subtotal: {receipt_data.get('subtotal', receipt_data.get('total_amount', 0))}\n")
            
            if settings.get("show_discount", True) and receipt_data.get("discount_amount", 0) > 0:
                printer.text(f"Discount: -{receipt_data.get('discount_amount', 0)}\n")
            
            adj = receipt_data.get("adjustment_amount", 0)
            if settings.get("show_adjustments", True) and adj != 0 and adj is not None:
                printer.text(f"Adjustment: {adj}\n")
                
            if settings.get("show_tax", True) and receipt_data.get("tax_amount", 0) > 0:
                printer.text(f"Tax: {receipt_data.get('tax_amount', 0)}\n")
                
            printer.text(f"Grand Total: {receipt_data.get('total_amount', 0)}\n")
            
            if settings.get("show_received_amount"):
                printer.text(f"Received: {receipt_data.get('amount_paid', 0)}\n")
            if settings.get("show_change_amount"):
                printer.text(f"Change: {receipt_data.get('change_due', 0)}\n")
            
            printer.text("--------------------------------\n")
            
            printer.set(align='center')
            if settings.get("show_footer_text"):
                footer = settings.get("footer_text")
                if footer:
                    printer.text(f"{footer}\n")
            
            urdu_policy = settings.get("urdu_policy_text")
            if urdu_policy:
                img = PrinterService._render_urdu_text(urdu_policy)
                if img:
                    printer.image(img)
            
            # Devjix Branding
            printer.text("\n")
            printer.qr("https://devjix.com", native=True, size=6)
            printer.text("Software by Devjix\n")
            
            # Cut paper
            printer.cut()
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Printing failed: {str(e)}")
        finally:
            printer.close()
