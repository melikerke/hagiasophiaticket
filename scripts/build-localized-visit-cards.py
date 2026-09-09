"""Render the three localized pocket guides from the reviewed website translations."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
import json
ROOT=Path(__file__).resolve().parents[1]
# DejaVu supports the place names and accented characters used throughout the guide.
import os
font_candidates = [Path(os.environ['HAGIA_CARD_FONT_DIR'])] if os.environ.get('HAGIA_CARD_FONT_DIR') else [
 Path('/usr/share/fonts/truetype/dejavu'),
 Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype'
]
fontdir=next((p for p in font_candidates if (p/'DejaVuSans.ttf').exists() and (p/'DejaVuSans-Bold.ttf').exists()),None)
if fontdir is None:raise RuntimeError('Set HAGIA_CARD_FONT_DIR to a directory containing DejaVuSans.ttf and DejaVuSans-Bold.ttf')
pdfmetrics.registerFont(TTFont('Card',str(fontdir/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('CardBold',str(fontdir/'DejaVuSans-Bold.ttf')))
rows={int(p[0]):p[1:] for line in (ROOT/'scripts/locales/ui.tsv').read_text().splitlines() if line and not line.startswith('#') for p in [line.split('║')]}
routes=json.loads((ROOT/'scripts/locales/pages.json').read_text())['routes']['/plan-your-visit/']
for j,l in enumerate(['de','fr','es']):
 def t(i):return rows[i][j].replace('–','-').replace('—','-').replace('↑','')
 out=ROOT/f'output/pdf/hagia-sophia-visit-card-{l}.pdf';out.parent.mkdir(parents=True,exist_ok=True)
 c=canvas.Canvas(str(out),pagesize=(420,800),invariant=1);c.setTitle(t(350));c.setAuthor('HagiaSophiaTicket');c.setSubject(t(3));c.setCreator('HagiaSophiaTicket')
 c._doc.Catalog.Lang=l
 c.setFillColor(HexColor('#f6f5ec'));c.rect(0,0,420,800,fill=1,stroke=0)
 c.setFillColor(HexColor('#566133'));c.rect(0,678,420,122,fill=1,stroke=0)
 def text(value,y,size=10.5,bold=False,color='#303726',x=28,width=364):
  p=Paragraph(value,ParagraphStyle('card',fontName='CardBold' if bold else 'Card',fontSize=size,leading=size*1.42,textColor=HexColor(color)))
  _,h=p.wrap(width,1000);p.drawOn(c,x,y-h);return y-h
 text(t(348)+' / ISTANBUL',773,10,True,'#ffffff');text(t(350),746,24,True,'#ffffff');text(t(3),700,10,False,'#ffffff')
 y=655
 for number,heading,body in [('1',353,t(354)),('2',355,t(356)),('3',357,t(358)),('4',326,t(328)+' '+t(329)+' '+t(330))]:
  y=text(number+' / '+t(heading),y,13,True)-6;y=text(body,y)-20
 assert y>130,(l,y)
 c.setStrokeColor(HexColor('#d4dac1'));c.line(28,122,392,122)
 url='https://hagiasophiaticket.com'+routes[j]
 qr=QrCodeWidget(url);b=qr.getBounds();d=Drawing(74,74,transform=[74/(b[2]-b[0]),0,0,74/(b[3]-b[1]),0,0]);d.add(qr);renderPDF.draw(d,c,25,34)
 text('<link href="'+url+'" color="#566133">'+t(10)+'</link>',108,11,True,x=110,width=282)
 text(t(360),85,8,x=110,width=282)
 text('IWC · DEM Museums · Sultanahmet Camii · Millî Saraylar · Kültür İstanbul',48,7.5,x=110,width=282)
 c.showPage();c.save();print(out)
