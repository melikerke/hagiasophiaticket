"""Build reviewed DE/FR/ES pages as crawlable HTML. Requires beautifulsoup4.
English templates provide homepage/planner structure; locale sources provide copy.
Fails on untranslated template text instead of publishing an English fallback.
"""
from pathlib import Path
from bs4 import BeautifulSoup, Comment, Doctype
import json, re, copy, xml.etree.ElementTree as ET
from urllib.parse import urlsplit, urljoin
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'scripts/locales'
ORIGIN='https://hagiasophiaticket.com'
DATE='2026-09-09'
LANGS=['de','fr','es']
strings=json.loads((DATA/'source-strings.json').read_text())
rows={}
for line in (DATA/'ui.tsv').read_text().splitlines():
 if not line or line.startswith('#'): continue
 cells=line.split('║');assert len(cells)==4,line
 key=int(cells[0]);assert key not in rows,key
 rows[key]=cells[1:]
assert set(rows)==set(range(len(strings))), 'Missing translations'
translations={lang:{key:rows[i][j] for i,key in enumerate(strings)} for j,lang in enumerate(LANGS)}
policy=json.loads((ROOT/'recovery-index-policy.json').read_text())
config=json.loads((DATA/'pages.json').read_text())
groups={group['en']:group for group in policy['hreflangGroups']}
for en,loc in config['routes'].items():groups[en]={'en':en,**dict(zip(LANGS,loc))}
# Utility pages retain their existing index policy; these are navigation mappings only.
utilities={
 '/about/':['/de/ueber-uns/','/fr/a-propos/','/es/sobre-nosotros/'],
 '/editorial-policy/':['/de/redaktionsrichtlinien/','/fr/politique-editoriale/','/es/politica-editorial/'],
 '/affiliate-disclosure/':['/de/affiliate-hinweis/','/fr/divulgation-affiliation/','/es/divulgacion-afiliados/'],
 '/privacy-policy/':['/de/datenschutzerklaerung/','/fr/politique-confidentialite/','/es/politica-privacidad/'],
 '/cookie-policy/':['/de/cookie-richtlinie/','/fr/politique-cookies/','/es/politica-cookies/'],
 '/contact/':['/de/kontakt/','/fr/contact/','/es/contacto/']}
# Existing consolidated translations cover these subtopics. Do not reopen redirects.
related={ '/hagia-sophia-upper-gallery/':'/hagia-sophia-interior-guide/', '/hagia-sophia-mosaics/':'/hagia-sophia-interior-guide/', '/hagia-sophia-photography-guide/':'/hagia-sophia-interior-guide/', '/best-time-to-visit-hagia-sophia/':'/hagia-sophia-opening-hours/' }
routes={l:{en:g[l] for en,g in groups.items()} for l in LANGS}
for l in LANGS:
 for en,loc in utilities.items():routes[l][en]=loc[LANGS.index(l)]
 for en,target in related.items():routes[l][en]=routes[l][target]

def pathfile(path):return ROOT/(path.strip('/')+'/index.html' if path!='/' else 'index.html')
def soupfile(path):return BeautifulSoup(pathfile(path).read_text(),'html.parser')
def parse(html):return BeautifulSoup(html,'html.parser')
def norm(text):return ' '.join(str(text).split())
def tx(i,l):return rows[i][LANGS.index(l)]
def translated(text,l):
 if text in translations[l]:return translations[l][text]
 if norm(text) in translations[l]:return translations[l][norm(text)]
 raise ValueError(f'Untranslated {l}: {text}')
def localurl(url,l):
 u=urlsplit(url)
 if u.netloc and u.netloc!=urlsplit(ORIGIN).netloc:return url
 if not u.path.startswith('/'):return url
 target=routes[l].get(u.path,u.path)
 return (ORIGIN if u.netloc else '')+target+('?' + u.query if u.query else '')+('#'+u.fragment if u.fragment else '')

def translate_template(source,l):
 s=parse(str(source));s.html['lang']=l
 for n in list(s.find_all(string=True)):
  if isinstance(n,(Comment,Doctype)) or n.parent.name in ['script','style'] or n.find_parent('nav',class_='footer-languages') or n.find_parent('select',class_='language-switcher'):continue
  t=norm(n)
  if re.fullmatch(r'€[0-9]+(?:\.[0-9]{2})?',t):n.replace_with(t[1:].replace('.',',')+' €');continue
  if t and any(c.isalpha() for c in t):
   value=translated(t,l)
   n.replace_with((' ' if str(n)[:1].isspace() else '')+value+(' ' if str(n)[-1:].isspace() else ''))
 for n in s.find_all(True):
  for a in ['alt','aria-label','placeholder']:
   if n.get(a):n[a]=translated(n[a],l)
  if n.name=='a' and n.get('href') and not n.has_attr('hreflang'):n['href']=localurl(n['href'],l)
 for script in s.select('script[type="application/ld+json"]'):script.decompose()
 return s

def langlinks(s,en,l):
 g=groups[en]
 for n in s.select('link[hreflang]'):n.decompose()
 for lang,target in [*g.items(),('x-default',g['en'])]:s.head.append(s.new_tag('link',rel='alternate',hreflang=lang,href=ORIGIN+target))
 for select in s.select('select.language-switcher'):
  select.clear()
  for lang,label in [('en','🇬🇧 EN'),('de','🇩🇪 DE'),('fr','🇫🇷 FR'),('es','🇪🇸 ES')]:
   opt=s.new_tag('option',value=g[lang]);opt.string=label
   if lang==l:opt['selected']=''
   select.append(opt)
 for nav in s.select('nav.footer-languages'):
  for a in nav.select('a[hreflang]'):a['href']=g[a['hreflang']]

def metadata(s,en,l,title,description,article=False,published=DATE):
 path=groups[en][l];canonical=ORIGIN+path
 s.html['lang']=l;s.title.string=title
 for selector,attr,val in [('link[rel="canonical"]','href',canonical),('meta[name="description"]','content',description),('meta[property="og:title"]','content',title),('meta[name="twitter:title"]','content',title),('meta[property="og:description"]','content',description),('meta[name="twitter:description"]','content',description),('meta[property="og:url"]','content',canonical)]:
  node=s.select_one(selector)
  if node:node[attr]=val
 for n in s.select('meta[name="robots"]'):n.decompose()
 for script in s.select('script[type="application/ld+json"]'):script.decompose()
 obj={'@context':'https://schema.org','@type':'Article' if article else 'WebPage','name':title,'headline':title,'description':description,'url':canonical,'inLanguage':l,'dateModified':DATE}
 if article:
  obj.update(datePublished=published,author={'@type':'Person','@id':ORIGIN+'/about/#melike','name':'Melike','url':ORIGIN+routes[l]['/about/']},publisher={'@type':'Organization','@id':ORIGIN+'/#organization','name':'HagiaSophiaTicket'})
 img=s.select_one('meta[property="og:image"]')
 if img:obj['image']=img['content']
 schemas=[obj]
 faqs=[]
 for details in s.select('.v2-faq-list details, .faq details'):
  q=details.select_one('summary');a=details.select_one('p')
  if q and a:faqs.append({'@type':'Question','name':q.get_text(' ',strip=True),'acceptedAnswer':{'@type':'Answer','text':a.get_text(' ',strip=True)}})
 if faqs:schemas.append({'@context':'https://schema.org','@type':'FAQPage','mainEntity':faqs})
 if article:schemas.append({'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':['Startseite','Accueil','Inicio'][LANGS.index(l)],'item':ORIGIN+routes[l]['/']},{'@type':'ListItem','position':2,'name':title,'item':canonical}]})
 script=s.new_tag('script',type='application/ld+json');script.string=json.dumps(schemas,ensure_ascii=False);s.head.append(script)
 langlinks(s,en,l)
 for script in s.select('script[src]'):
  if script['src'].startswith(('/site-runtime.js','/visit-tools.js')):script['src']=script['src'].split('?')[0]+'?v=20260909-languages'

def write(s,path):
 if path != '/' and path.count('/') > 2:
  for a in s.select('header a[href="#tickets"]'):a['href']='/'+s.html['lang']+'/#tickets'
 if s.select_one('header .v2-brand') and s.html['lang'] in LANGS:
  s.body['class']=list(dict.fromkeys(s.body.get('class',[])+['home-v2']))
  if not s.select_one('link[href="/home-v2.css"]'):s.head.append(s.new_tag('link',rel='stylesheet',href='/home-v2.css'))
 p=pathfile(path);p.parent.mkdir(parents=True,exist_ok=True)
 html=str(s)
 # Preserve SVG attribute casing, which html.parser otherwise folds.
 for a,b in [('viewbox=','viewBox='),('preserveaspectratio=','preserveAspectRatio='),('patternunits=','patternUnits=')]:html=html.replace(a,b)
 if not html.lstrip().lower().startswith('<!doctype'):html='<!DOCTYPE html>\n'+html
 if not p.exists() or p.read_text()!=html:p.write_text(html)

home_source=soupfile('/');planner_source=soupfile('/plan-your-visit/')
homes={};planners={};built=[]
for l in LANGS:
 home=translate_template(home_source,l);metadata(home,'/',l,tx(1,l),tx(17,l));homes[l]=home
 planner=translate_template(planner_source,l);metadata(planner,'/plan-your-visit/',l,tx(226,l),tx(230,l))
 planner.select_one('a[download]')['href']=f'/output/pdf/hagia-sophia-visit-card-{l}.pdf'
 planners[l]=planner
 for en,s in [('/',home),('/plan-your-visit/',planner)]:write(s,groups[en][l]);built.append(groups[en][l])

# Shared static article shell, aligned with the newer English article design.
def article_shell(en,l,title,intro):
 s=soupfile('/topkapi-palace-ticket/')
 s.header.replace_with(copy.deepcopy(homes[l].header));s.footer.replace_with(copy.deepcopy(homes[l].footer))
 s.select_one('.skip-link').string=tx(2,l)
 hero=s.select_one('.cg-hero');hero.clear();hero.append(parse('<div class="container"><div class="cg-hero-layout"><div class="localized-intro"></div><figure></figure></div><nav class="cg-jumps"></nav></div>'))
 lead=hero.select_one('.localized-intro')
 for tag,text in [('p',tx(11,l)),('h1',title),('p',intro),('p','Melike · '+tx(74,l))]:
  n=s.new_tag(tag);n.string=text
  if tag=='p' and text.startswith('Melike'):n['class']='cg-review'
  lead.append(n)
 original=soupfile(en);originalimg=original.select_one('main img')
 for attr in ['og:image','twitter:image']:
  image_meta=original.select_one(f'meta[property="{attr}"],meta[name="{attr}"]')
  dest=s.select_one(f'meta[property="{attr}"],meta[name="{attr}"]')
  if image_meta and dest:dest['content']=urljoin(ORIGIN+en,image_meta['content'])
 figure=hero.select_one('figure')
 if originalimg:
  img=copy.deepcopy(originalimg);img.attrs.pop('class',None);img.attrs.pop('style',None);img['alt']=title;img['loading']='eager';img['fetchpriority']='high';
  for attr in ['src','srcset']:
   if img.get(attr):img[attr]=re.sub(r'(?<![\w/])\.\./', '/', img[attr])
  figure.append(img)
 else:figure.decompose()
 # Known palace photographs show the Gate of Salutation, not the Imperial Gate.
 if en=='/topkapi-palace-ticket/':
  figure.img['alt']=tx(223,l);cap=s.new_tag('figcaption');cap.string=tx(223,l);figure.append(cap)
 hero.select_one('nav')['aria-label']=tx(221,l)
 body=s.select_one('article');body.clear()
 for n in s.select('main .buybar'):n.decompose()
 description=intro
 metadata(s,en,l,title,description,True)
 return s,body

def addtext(s,body,tag,text):
 node=s.new_tag(tag);node.string=text;body.append(node);return node

def offercard(s,body,l,offer='hagia-sophia-email-qr'):
 template=planners[l].select_one('#offer-'+offer)
 if template:card=copy.deepcopy(template.select_one('article'));card['class']='cg-ticket';body.append(card)
 else:
  registry=json.loads((ROOT/'offers.json').read_text())['offers']
  entry=next(x for x in registry if x['id']==offer) if isinstance(registry,list) else registry[offer]
  n=s.new_tag('a',href=entry['destinationUrl'],target='_blank',rel='noopener sponsored');n['class']='btn';n['data-offer-id']=offer;n['data-button-position']='article_inline';n.string=tx(12,l)+' ↗';body.append(n)

def finish_article(s,body,en,l):
 # Keep source links from the reviewed English article, with neutral localized labels.
 h=addtext(s,body,'h2',tx(367,l));h['id']='sources'
 addtext(s,body,'p',tx(360,l))
 ul=s.new_tag('ul');seen=set()
 for a in soupfile(en).select('main a[href]'):
  href=a['href'];u=urlsplit(href)
  if not u.netloc or u.netloc==urlsplit(ORIGIN).netloc or any(host in u.netloc for host in ['getyourguide','istanbulwelcomecard','google.com','maps.google']):continue
  if href in seen:continue
  seen.add(href);li=s.new_tag('li');link=s.new_tag('a',href=href);link.string=u.netloc;li.append(link);ul.append(li)
 if ul.contents:body.append(ul)
 addtext(s,body,'p',tx(200,l))
 addtext(s,body,'h2',tx(222,l))
 nav=s.new_tag('nav');nav['class']='cg-jumps';nav['aria-label']=tx(222,l)
 for target,key in [('/plan-your-visit/',10),('/combo-tickets/',9),('/topkapi-palace-ticket/',157),('/istanbul-in-2-days/',378),('/guides/',192)]:
  if en==target:continue
  a=s.new_tag('a',href=routes[l][target]);a.string=tx(key,l);nav.append(a)
 body.append(nav)
 jumps=s.select_one('.cg-hero nav')
 for i,h in enumerate(body.select('h2')):
  if not h.get('id'):h['id']=f'section-{i+1}'
  if i<8:a=s.new_tag('a',href='#'+h['id']);a.string=h.get_text();jumps.append(a)
 # Remove stale English Article and FAQ after final content is assembled.
 metadata(s,en,l,s.title.get_text(),s.select_one('meta[name="description"]')['content'],True)
 write(s,groups[en][l]);built.append(groups[en][l])

articles={};current=None
for line in (DATA/'articles.tsv').read_text().splitlines():
 if not line or line.startswith('#'):continue
 if line.startswith('@'):current=line[1:];articles[current]=[];continue
 row=line.split('║');assert len(row)==4,line;articles[current].append(row)
for en,blocks in articles.items():
 for j,l in enumerate(LANGS):
  title=blocks[0][j+1];intro=blocks[1][j+1];s,body=article_shell(en,l,title,intro)
  for kind,*values in blocks[2:]:addtext(s,body,'h2' if kind=='H' else 'p',values[j])
  if en=='/topkapi-palace-ticket/':offercard(s,body,l,'iwc-topkapi-audio');offercard(s,body,l,'iwc-old-city-combo')
  elif en=='/istanbul-in-2-days/':offercard(s,body,l,'iwc-saver-combo')
  elif 'basilica' in en:offercard(s,body,l,'iwc-basilica-email-qr')
  else:offercard(s,body,l)
  # Preserve a useful evening deep link used by the homepage.
  if en=='/basilica-cistern-opening-hours/':body.select('h2')[1]['id']='night-shift'
  finish_article(s,body,en,l)

# Refresh old entry and price articles with the same current comparison and map.
for l in LANGS:
 for en,title_key,intro_key in [('/hagia-sophia-ticket-price/',79,81),('/hagia-sophia-entrance-visitor-route/',188,277)]:
  s,body=article_shell(en,l,tx(title_key,l),tx(intro_key,l))
  if 'ticket-price' in en:
   block=copy.deepcopy(homes[l].select_one('.v2-price-content'))
   for a in block.select('.v2-price-copy a'):a.decompose()
   body.append(block)
   body.append(copy.deepcopy(homes[l].select_one('.v2-faq-list')))
   addtext(s,body,'h2',['Kinder und Museumspass','Enfants et pass musées','Niños y pases de museos'][LANGS.index(l)])
   addtext(s,body,'p',[
    'Kinder unter 8 Jahren erhalten mit Altersnachweis freien Galerieeintritt. Der Museum Pass Istanbul deckt das reguläre ausländische Galerieticket nicht ab. Prüfe Kinderoptionen direkt beim Anbieter; unser Rechner verwendet Erwachsene.',
    'Les moins de 8 ans entrent gratuitement dans la galerie avec justificatif d’âge. Le Museum Pass Istanbul ne couvre pas le billet étranger standard. Vérifiez les options enfants auprès du prestataire ; notre calculateur utilise les tarifs adultes.',
    'Los menores de 8 años entran gratis a la galería con prueba de edad. Museum Pass Istanbul no cubre la entrada extranjera estándar. Comprueba opciones infantiles con el proveedor; el calculador usa tarifas adultas.'
   ][LANGS.index(l)])
   s.head.append(s.new_tag('link',rel='stylesheet',href='/home-v2.css'))
  else:
   # Link to the full interactive photo map; reproduce exact entry and pickup notes here.
   for key in [276,294,296,298,300,301]:addtext(s,body,'h2' if key in [276,296,300] else 'p',tx(key,l))
   link=s.new_tag('a',href=routes[l]['/plan-your-visit/']+'#entrance-map');link['class']='btn';link.string=tx(359,l);body.append(link)
  offercard(s,body,l);finish_article(s,body,en,l)

# One-day route is generated from the same tested planning logic as the interactive tool.
plans=json.loads((DATA/'itinerary-snapshot.json').read_text())
for l in LANGS:
 en='/one-day-sultanahmet-itinerary/';old=soupfile(groups[en][l]);title=old.h1.get_text(' ',strip=True)
 s,body=article_shell(en,l,title,tx(435,l))
 for stop in plans['stops']:
  addtext(s,body,'h2',translated(stop['title'],l));addtext(s,body,'p',translated(stop['time'],l));addtext(s,body,'p',translated(stop['text'],l))
 for text in plans['notes']:addtext(s,body,'p',translated(text,l))
 for key in [328,329,443]:addtext(s,body,'p',tx(key,l))
 offercard(s,body,l,'iwc-old-city-combo');finish_article(s,body,en,l)

# Existing prose is retained for unchanged topics; remove obsolete sales bands globally.
for l in LANGS:
 for p in (ROOT/l).rglob('index.html'):
  path='/'+p.relative_to(ROOT).as_posix().removesuffix('index.html')
  if path in built:continue
  source=p.read_text();s=parse(source)
  if s.select_one('meta[http-equiv="refresh"]') or not s.select_one('main'):continue
  changed=False
  for band in list(s.select('.cta-band, .book-rail, .buybar')):
   if band.select_one('a'):
    card=copy.deepcopy(planners[l].select_one('#offer-hagia-sophia-email-qr article'));card['class']='cg-ticket localized-ticket';band.replace_with(card);changed=True
  for a in s.select('a[href]'):
   if a.has_attr('hreflang'):continue
   href=localurl(a['href'],l)
   if href!=a['href']:
    a['href']=href
    for child in a.find_all(string=True):child.replace_with(re.sub(r'\s*\((?:English|Englisch|anglais|inglés)\)','',str(child),flags=re.I))
    changed=True
  # The current authoritative Friday closure replaces the historical 12:00 wording.
  for n in list(s.find_all(string=True)):
   if isinstance(n,(Comment,Doctype)) or n.parent.name in ['script','style']:continue
   value=re.sub(r'12:00(?=\s*[-–]\s*14:30)', '12:30', str(n))
   if value!=str(n):n.replace_with(value);changed=True
  en=next((en for en,g in groups.items() if g[l]==path),None)
  if en and path not in policy['temporaryNoindex']:
   s.header.replace_with(copy.deepcopy(homes[l].header));s.footer.replace_with(copy.deepcopy(homes[l].footer));langlinks(s,en,l);changed=True
   # Update dates only on pages with material booking, entry, or internal-link changes.
   if changed:
    for node in s.select('script[type="application/ld+json"]'):
     node.string=re.sub(r'("dateModified"\s*:\s*")[^"]+',r'\g<1>'+DATE,node.string or '')
    built.append(path)
  if changed:
   if not s.select_one('link[href^="/content-guides.css"]'):s.head.append(s.new_tag('link',rel='stylesheet',href='/content-guides.css?v=20260909-languages'))
   for script in s.select('script[src^="/site-runtime.js"]'):script['src']='/site-runtime.js?v=20260909-languages'
   write(s,path)

# Local guide directory includes all published counterparts and native search/filter controls.
for j,l in enumerate(LANGS):
 en='/guides/';s,body=article_shell(en,l,tx(192,l),tx(183,l))
 tools=s.new_tag('div');tools['class']='guide-directory-tools';tools['data-guide-tools']=''
 label=s.new_tag('label',attrs={'for':'guide-search'});label.string=['Reiseführer suchen','Rechercher un guide','Buscar una guía'][j];tools.append(label)
 search=s.new_tag('input',id='guide-search',type='search',autocomplete='off');search['data-guide-search']='';search['placeholder']=tx(8,l)+', '+tx(135,l)+', '+tx(27,l)+'…';tools.append(search)
 filters=s.new_tag('div');filters['class']='guide-filter-list'
 for cat,labeltext in [('all',['Alle','Tous','Todas'][j]),('tickets',tx(8,l)),('visit',tx(10,l)),('inside',tx(26,l)),('nearby',tx(189,l))]:
  b=s.new_tag('button',type='button');b['data-guide-filter']=cat;b['aria-pressed']='true' if cat=='all' else 'false';b.string=labeltext;filters.append(b)
 tools.append(filters);status=s.new_tag('p',role='status');status['aria-live']='polite';status['data-guide-count']='';tools.append(status);body.append(tools)
 grid=s.new_tag('div');grid['class']='cluster-grid';grid['data-guide-grid']=''
 for english,g in groups.items():
  if english in ['/','/guides/']:continue
  target=g[l];page=soupfile(target)
  a=s.new_tag('a',href=target);a['class']='cluster-card';a['data-guide-card']='';a['data-guide-category']='tickets' if any(x in english for x in ['ticket','combo']) else 'nearby' if any(x in english for x in ['basilica','topkapi','sultanahmet','istanbul','near-']) else 'inside' if any(x in english for x in ['interior','history']) else 'visit'
  h=s.new_tag('h3');h.string=page.h1.get_text(' ',strip=True);a.append(h)
  desc=page.select_one('meta[name="description"]');p=s.new_tag('p');p.string=desc['content'] if desc else '';a.append(p);grid.append(a)
 body.append(grid);metadata(s,en,l,tx(192,l),tx(183,l));s.select_one('.cg-hero nav').decompose();write(s,groups[en][l]);built.append(groups[en][l])

# Add reciprocal alternates to English pages too, with equivalent-page language switching.
for en,g in groups.items():
 s=soupfile(en);langlinks(s,en,'en');write(s,en)
policy['hreflangGroups']=list(groups.values())
policy['temporaryNoindex']=[p for p in policy['temporaryNoindex'] if p not in {groups['/guides/'][l] for l in LANGS}]
(ROOT/'recovery-index-policy.json').write_text(json.dumps(policy,ensure_ascii=False,indent=2)+'\n')
# Preserve dates for unrelated URLs; only translated/reviewed pages receive the new date.
sm=ET.parse(ROOT/'sitemap.xml');urls={u.find('{*}loc').text:u.find('{*}lastmod').text for u in sm.getroot()}
for p in built:urls[ORIGIN+p]=DATE
xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
xml+=''.join(f'  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n' for u,d in urls.items())+'</urlset>\n'
(ROOT/'sitemap.xml').write_text(xml)
# Browser translation subset contains only planner runtime copy; no network translation needed.
runtimekeys=set(strings[405:]+[strings[i] for i in [149,157,262,293,317,319,321,351]])
data={l:{key:translated(key,l) for key in runtimekeys} for l in LANGS}
module='// Generated by scripts/build-localized-site.py. Human-reviewed translations.\n'
module+='export const plannerCopy = '+json.dumps(data,ensure_ascii=False)+';\n'
module+='export const localizedRoutes = '+json.dumps(routes,ensure_ascii=False)+';\n'
module+='''export function createTranslator(language = 'en') {
 const dict = plannerCopy[language] || {};
 return value => {
  if (dict[value] !== undefined) return dict[value];
  const prefix = 'No matching live guided tour is listed in our reviewed Istanbul Welcome Card selection. These are self-guided alternatives: ';
  if (value.startsWith(prefix) && dict[prefix]) return dict[prefix] + (dict[value.slice(prefix.length)] || value.slice(prefix.length));
  return value;
 };
}
export function localizePlan(result, language = 'en') {
 const t = createTranslator(language);
 if (Array.isArray(result)) return result.map(item => localizePlan(item, language));
 if (result && typeof result === 'object') return Object.fromEntries(Object.entries(result).map(([key,value]) => [key, key === 'href' ? (localizedRoutes[language]?.[value] || value) : localizePlan(value, language)]));
 return typeof result === 'string' ? t(result) : result;
}
'''
(ROOT/'visit-i18n.mjs').write_text(module)
(DATA/'localized-manifest.json').write_text(json.dumps({'groups':list(groups.values()),'updated':sorted(set(built))},ensure_ascii=False,indent=2)+'\n')
print(f'Built/reviewed {len(set(built))} localized pages; {len(groups)} language groups; {len(urls)} sitemap URLs.')
