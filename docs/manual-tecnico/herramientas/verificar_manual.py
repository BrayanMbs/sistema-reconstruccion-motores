"""Validación documental local. No abre servicios ni modifica datos de aplicación."""
from pathlib import Path
import re, zipfile, json
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/manual-tecnico'
errors=[]
files=list(OUT.rglob('*.md'))
for p in files:
    text=p.read_text(encoding='utf-8')
    if len(text.strip())<100:errors.append(f'Contenido insuficiente: {p.name}')
    for dest in re.findall(r'\]\(([^)]+)\)',text):
        if dest.startswith(('https://','http://','#')):continue
        target=(p.parent/dest.split('#')[0])
        if not target.exists():errors.append(f'Enlace ausente: {p.name}: {dest}')
    # Firmas de claves/tokens, no valores de ejemplo ni nombres de variables.
    if re.search(r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|sb_secret_[A-Za-z0-9]+|-----BEGIN .*PRIVATE KEY',text):errors.append(f'Posible secreto en {p.name}')
    if re.search(r'[A-Za-z0-9._%+-]+@(?!example\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}',text):errors.append(f'Correo a revisar: {p.name}')
    # Referencias completas en los inventarios generados, incluida línea de origen.
    if p.name.startswith('anexo-'):
        targets=[cell.strip().strip('`') for row in text.splitlines() if row.startswith('|') for cell in row.strip('|').split('|') if cell.strip().startswith(('backend/','frontend/'))]
        for target in targets:
            raw,_,line=target.partition(':');candidate=ROOT/raw
            if not candidate.exists():errors.append(f'Ruta inexistente: {target}')
            elif line and int(line)>len(candidate.read_text(encoding='utf-8-sig').splitlines()):errors.append(f'Línea inexistente: {target}')
chapters=sorted(OUT.glob('[0-1][0-9]-*.md'))
assert len(chapters)==16, f'Se esperaban 16 capítulos, encontrados {len(chapters)}'
mmd=list((OUT/'diagramas').glob('*.mmd'))
assert len(mmd)==11
for p in mmd:
    txt=p.read_text(encoding='utf-8')
    if not txt.startswith(('flowchart','sequenceDiagram','erDiagram')):errors.append(f'Diagrama sin tipo: {p.name}')
    if txt.count('[')!=txt.count(']'):errors.append(f'Corchetes: {p.name}')
for p in [ROOT/'backend/src/routes'/f for f in ['admin.routes.ts','auth.routes.ts']]:assert p.exists()
doc=OUT/'Manual_Tecnico_Sistema_Reconstruccion_Motores.docx'
with zipfile.ZipFile(doc) as z:
    xml=z.read('word/document.xml').decode('utf-8');tree=ET.fromstring(xml)
    ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    plain=''.join(tree.itertext())
    for field in ['Universidad: [Completar]','Integrantes: [Completar]','Catedrático: [Completar]','Sección: [Completar]']:
        if field not in plain:errors.append(f'Falta campo académico editable: {field}')
    if ET.fromstring(z.read('word/settings.xml')).find('.//w:documentProtection',ns) is not None:errors.append('Word tiene protección de edición')
    core=ET.fromstring(z.read('docProps/core.xml'))
    for node in core.iter():
        if node.tag.rsplit('}',1)[-1] in ['creator','lastModifiedBy'] and (node.text or '').strip():errors.append('Metadatos de autor no vacíos')
    for package_part in ['word/styles.xml','word/document.xml']:
        if ET.fromstring(z.read(package_part)).find('.//w:pBdr',ns) is not None:errors.append(f'Borde de párrafo no previsto en {package_part}')
    if re.search(r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|sb_secret_[A-Za-z0-9]+|-----BEGIN .*PRIVATE KEY',plain):errors.append('Posible secreto en Word')
    for p in chapters:
        title=p.read_text(encoding='utf-8').splitlines()[0].lstrip('# ')
        if title not in plain:errors.append(f'Falta capítulo Word: {title}')
    for s in ['TOC','PAGE']:
        allxml=xml+z.read('word/footer1.xml').decode('utf-8')
        if s not in allxml:errors.append(f'Falta campo {s}')
    media=[n for n in z.namelist() if n.startswith('word/media/')]
    if len(media)!=10:errors.append(f'Figuras Word: {len(media)}')
    size=tree.find('.//w:pgSz',ns)
    if size.get('{'+ns['w']+'}w')!='12240' or size.get('{'+ns['w']+'}h')!='15840':errors.append('Tamaño distinto de carta')
    margins=tree.find('.//w:pgMar',ns)
    for key in ['top','bottom','left','right']:
        if margins.get('{'+ns['w']+'}'+key)!='1440':errors.append(f'Margen {key}')
endpoint=(OUT/'anexo-endpoints.md').read_text(encoding='utf-8')
schema=(OUT/'anexo-esquema.md').read_text(encoding='utf-8')
if 'Definición inicial, complementada' not in schema or '### Modificación posterior de ' not in schema:errors.append('El diccionario debe distinguir definiciones iniciales de modificaciones posteriores')
for route in ['/api/auth/login','/api/admin/reports/export','/api/cashier/sessions/close','/api/inventory/items','/api/part-requests/:id/review']:
    if route not in endpoint:errors.append(f'Falta ruta {route}')
report={'markdown':len(files),'capitulos':len(chapters),'diagramas':len(mmd),'figuras_word':len(media),'errores':errors,'mermaid':'estructura básica; parser completo por separado','revision_visual':'ver registro-validacion.md'}
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
