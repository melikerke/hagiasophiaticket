"""Rebuild the downloadable reference card with reportlab (Python 3)."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/hagia-sophia-visit-card.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUT), pagesize=(420, 770), invariant=1)
c.setTitle('Hagia Sophia - Pocket Visit Guide')
c.setAuthor('HagiaSophiaTicket - Independent visitor guide')
ink, muted, olive = '#303726', '#616650', '#566133'
c.setFillColor(HexColor('#f6f5ec')); c.rect(0, 0, 420, 770, fill=1, stroke=0)
c.setFillColor(HexColor(olive)); c.rect(0, 646, 420, 124, fill=1, stroke=0)

def text(value, y, size=11, color=ink, bold=False, x=28, width=364, leading=None):
    style = ParagraphStyle('card', fontName='Helvetica-Bold' if bold else 'Helvetica', fontSize=size,
                           leading=leading or size*1.45, textColor=HexColor(color), spaceAfter=0)
    p = Paragraph(value, style)
    _, height = p.wrap(width, 1000)
    p.drawOn(c, x, y-height)
    return y-height

def block(number, heading, body, y):
    c.setFillColor(HexColor('#e3e7d3')); c.roundRect(28, y-24, 25, 25, 12, fill=1, stroke=0)
    text(number, y-3, 10, olive, True, x=35, width=20)
    y = text(heading, y, 13, ink, True, x=65, width=327)
    y = text(body, y-6, 11, ink, x=65, width=327)
    return y-22

text('HAGIA SOPHIA / ISTANBUL', 744, 10, '#ffffff', True)
text('Your pocket visit guide', 716, 25, '#ffffff', True)
text('Save before you leave Wi-Fi.', 673, 11, '#edf0df')
y=622
y=block('1', 'Save your emailed entry QR', 'Our recommended <b>Istanbul Welcome Card</b> ticket emails the entrance QR after booking. Save it and go to Hagia Sophia’s signed visitor-gallery entrance; no museum pickup is needed. If you chose a kiosk-based alternative, collect your ticket first as instructed. Guided tours use their own meeting point.', y)
y=block('2', 'Bring the essentials', 'Cover shoulders and knees; women need a head covering. Bring comfortable shoes, a charged phone and headphones. Save your entry ticket and audio before arrival. Bring proof of age when using a child admission exemption.', y)
y=block('3', 'Know your access', 'The paid cultural route visits the <b>upper gallery</b>. The ground floor is reserved for worship. Mandatory security can add waiting time. Blue Mosque admission is free and visitor entry pauses for prayer.', y)
y=block('4', 'Check your day', '<b>Friday:</b> Hagia Sophia lists a 12:30-14:30 visitor closure; Blue Mosque visitor entry begins at 14:30.<br/><b>Tuesday:</b> Topkapi Palace is closed.<br/>Basilica Cistern day and evening sessions have separate admission arrangements. Recheck hours and your ticket before travel.', y)
assert y > 115, f'Content reaches footer: {y}'
c.setStrokeColor(HexColor('#d4dac1')); c.line(28, 115, 392, 115)
qr=QrCodeWidget('https://hagiasophiaticket.com/plan-your-visit/')
b=qr.getBounds();d=Drawing(68,68,transform=[68/(b[2]-b[0]),0,0,68/(b[3]-b[1]),0,0]);d.add(qr);renderPDF.draw(d,c,26,37)
text('<link href="https://hagiasophiaticket.com/plan-your-visit/" color="#566133"><b>Open the map and route planner</b></link>',100,11,x=106,width=285)
text('hagiasophiaticket.com/plan-your-visit/',79,9,muted,x=106,width=285)
text('Independent guide. Sources reviewed 9 September 2026.<br/>Sources: Istanbul Welcome Card, DEM Museums,<br/>Blue Mosque, National Palaces and Kult\u00fcr Istanbul.<br/>Source links in the planner.<br/>Maps and booking pages need an internet connection.',60,8,muted,x=106,width=285,leading=11)
c.showPage();c.save()
print(OUT)
