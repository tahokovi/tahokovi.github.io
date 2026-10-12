"""Build a compact print CV using the verified facts in cv.html.

Requires Python 3 and a TeX installation with pdflatex. Run from any directory:
    python3 CV/build_pdf.py
The HTML supplies shared facts. Print-specific selection, order, and layout live here.
Expanded abstracts and course descriptions remain on the website.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = ET.Element('document')
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        element = ET.SubElement(self.stack[-1], tag, dict(attrs))
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                       'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(element)

    def handle_endtag(self, tag):
        assert self.stack[-1].tag == tag, (tag, self.stack[-1].tag)
        self.stack.pop()

    def handle_data(self, data):
        node = self.stack[-1]
        if len(node):
            node[-1].tail = (node[-1].tail or '') + data
        else:
            node.text = (node.text or '') + data


def has(node, name):
    return name in node.get('class', '').split()


def tex(text):
    text = re.sub(r'\s+', ' ', text or '')
    replacements = {'\\': r'\textbackslash{}', '&': r'\&', '%': r'\%',
                    '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}',
                    '~': r'\textasciitilde{}', '^': r'\textasciicircum{}',
                    '–': '--', '—': '---', '‘': '`', '’': "'", 'ʻ': '`',
                    '“': '``', '”': "''", 'ā': r'\={a}', 'Ā': r'\={A}'}
    return ''.join(replacements.get(c, c) for c in text)


def inline(node):
    if has(node, 'sr-only'):
        return ''
    body = tex(node.text)
    for child in node:
        value = inline(child)
        if child.tag == 'strong':
            value = r'\textbf{' + value + '}'
        elif child.tag in {'em', 'i'}:
            value = r'\emph{' + value + '}'
        elif child.tag == 'a':
            # These hrefs are ordinary local assets, mailto links, or HTTPS URLs.
            url = child.get('href', '')
            if not url.startswith(('https://', 'http://', 'mailto:')):
                url = 'https://tahokovi.github.io/' + url.lstrip('./')
            url = url.replace('%', r'\%').replace('#', r'\#').replace('&', r'\&')
            value = r'\href{' + url + '}{' + value + '}'
        elif child.tag == 'br':
            value = r'\newline{}'
        body += value + tex(child.tail)
    return body.strip()



def plain(node):
    """Preserve wording while removing web emphasis and navigation."""
    if node is None or has(node, 'sr-only'):
        return ''
    return (node.text or '') + ''.join(plain(c) + (c.tail or '') for c in node)


def child(node, name):
    return next((c for c in node if has(c, name)), None)


def text(node):
    return tex(plain(node).strip())


def link(url, label):
    url = url.replace('%', r'\%').replace('#', r'\#').replace('&', r'\&')
    return r'\href{' + url + '}{' + label + '}'


def section(title):
    return '\n\\section*{' + title + '}\n'


def subheading(title):
    return '\n\\subsection*{' + title + '}\n'


def entry(title, date):
    return r'\needspace{6\baselineskip}\begin{tabularx}{\linewidth}{@{}X r@{}}\textbf{' + title + r'} & {\small ' + date + r'}\\\end{tabularx}' + '\n'


def experience(node):
    role = child(node, 'cv-role')
    meta = child(node, 'cv-meta')
    date = child(meta, 'cv-date')
    place = child(meta, 'cv-place')
    org = child(node, 'cv-org')
    affiliations = [text(c) for c in org if c.tag == 'span'] or [text(org)]
    result = entry(text(role), text(date))
    result += r'\emph{' + r'\newline{}'.join(affiliations) + r'}\hfill {\small\color{muted}' + text(place) + '}\\par\n'
    supervisor = child(node, 'cv-supervisors')
    if supervisor is not None:
        result += text(supervisor) + '\\par\n'
    duties = child(node, 'cv-duties')
    result += '\\begin{itemize}\n' + ''.join('\\item '+text(c)+'\n' for c in duties) + '\\end{itemize}\n\\vspace{4pt}\n'
    return result


def education(node):
    result = section('Education')
    for i, item in enumerate(node.find('ul')):
        meta = child(item, 'cv-meta')
        result += entry(text(child(item, 'cv-org')), text(child(meta, 'cv-date')))
        result += text(child(item, 'cv-role')) + '. '
        desc = child(item, 'cv-desc')
        if desc is not None:
            result += text(desc).removeprefix('With a ')
        result += '\\par\n'
        courses = item.findall('.//dt')
        if courses:
            # Graduate coursework and the quantitative foundation are enough in print.
            selected = courses if i == 0 else [courses[j] for j in [0,1,2,3,4,5,6,7,12]]
            result += r'{\small Selected coursework: ' + '; '.join(text(c) for c in selected) + '.}\\par\n'
        result += '\\vspace{4pt}\n'
    return result


def skills(node):
    result = section('Technical skills and languages')
    for row in node.find('dl'):
        label, value = text(row.find('dt')), text(row.find('dd'))
        # Short tool-focused phrasing; no changes to claimed capabilities.
        if label == 'Data visualization':
            value = 'ggplot2, Matplotlib, ArcGIS; statistical and geospatial visualization'
        if label == 'Development and computing':
            label = 'Computing'
        result += r'\textbf{' + label + ':} ' + value + '.\\par\n'
    return result


def research(node):
    result = '\\begingroup\\setlength{\\parskip}{0.5pt}\n' + section('Research')
    for group in node:
        if group.tag == 'h3':
            result += subheading(text(group))
            if text(group) == 'Research assistance':
                result += r'{\small Research assistant on the following papers; authors listed below.}\par'+'\n'
        elif group.tag == 'ul':
            for item in group:
                title = text(child(item, 'cv-paper'))
                links = child(item, 'cv-links')
                anchors = list(links) if links is not None else []
                result += r'\needspace{5\baselineskip}\textbf{' + title + '}\\par\n'
                result += text(child(item, 'cv-byline')).rstrip('.') + '. '
                meta = child(item, 'cv-meta')
                if meta is not None:
                    values = [text(c) for c in meta if not has(c,'sr-only') and plain(c).strip() != 'Research assistant']
                    result += r'{\small ' + '; '.join(values).rstrip('.') + '.} '
                # The conference section supplies presentation details separately.
                available = child(item, 'cv-avail')
                if available is not None:
                    result += r'{\small ' + text(available) + '} '
                if anchors:
                    version_links = []
                    for anchor in anchors:
                        url = anchor.get('href')
                        if url.startswith('https://www.nber.org/papers/'):
                            label = 'Link to NBER working paper version'
                        elif url.startswith('https://www.aei.org/'):
                            label = 'Link to AEI working paper version'
                        elif url.startswith('https://uhero.hawaii.edu/'):
                            label = 'Link to published brief'
                        else:
                            label = 'Link to published version'
                        version_links.append(link(url, '[' + label + ']'))
                    result += r'\par{\small ' + r'\quad '.join(version_links) + '} '
                result += r'\par\vspace{2pt}' + '\n'
    return result + '\\endgroup\n'


def conferences(node):
    result = section('Conference presentations and invitations')
    for talk in node.findall('div'):
        result += r'\needspace{6\baselineskip}\textbf{' + text(talk.find('h3')) + '}\\par\n'
        for venue in talk.find('ul'):
            meta = child(venue,'cv-meta')
            parts = [text(c) for c in meta if not has(c,'sr-only')]
            result += text(child(venue,'cv-venue')) + r' \hfill {\small ' + ', '.join(parts) + '}\\par\n'
    return result


def honors(node):
    result = section('Honors and affiliations')
    for c in node:
        if c.tag == 'h3':
            result += r'\needspace{3\baselineskip}\textbf{' + text(c) + ':} '
        elif c.tag == 'ul':
            result += '; '.join(text(item) for item in c) + '.\\par\n'
    return result


PREAMBLE = r'''% Print CV generated by CV/build_pdf.py using shared facts from cv.html.
\documentclass[10pt,letterpaper]{article}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{ebgaramond}
\usepackage[top=0.6in,bottom=0.6in,left=0.7in,right=0.7in]{geometry}
\usepackage{xcolor,enumitem,needspace,titlesec,fancyhdr,tabularx}
\definecolor{cardinal}{HTML}{8C1515}
\definecolor{muted}{HTML}{625D56}
\usepackage[colorlinks=true,urlcolor=cardinal]{hyperref}
\hypersetup{pdftitle={Curriculum vitae - T. M. Jensen Ahokovi},pdfauthor={T. M. Jensen Ahokovi}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{2pt}
\setlength{\emergencystretch}{2em}
\setlist[itemize]{leftmargin=1.15em,itemsep=1pt,topsep=3pt,parsep=0pt}
\titleformat{\section}{\large\scshape\color{cardinal}}{}{0pt}{}[\vspace{1pt}\titlerule]
\titlespacing*{\section}{0pt}{10pt}{6pt}
\titleformat{\subsection}{\normalsize\bfseries}{}{0pt}{}
\titlespacing*{\subsection}{0pt}{7pt}{3pt}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\small\color{muted}T. M. Jensen Ahokovi}
\fancyfoot[R]{\small\color{muted}\thepage}
\widowpenalty=10000
\clubpenalty=10000
\raggedbottom
\begin{document}
'''


def main():
    parser = Document()
    parser.feed((ROOT / 'cv.html').read_text())
    main_node = parser.root.find('.//main')
    sections = {n.get('id'): n for n in main_node.findall('section')}
    name = main_node.find('.//span[@class="cv-title-name"]')
    updated = main_node.find('.//span[@class="cv-pdf-label"]')
    header = '{\\LARGE\\bfseries '+inline(name)+'}\\hfill {\\small '+inline(updated)+'}\\par\n'
    header += r'\href{mailto:tahokovi@stanford.edu}{tahokovi@stanford.edu} \enspace\textbar\enspace \href{https://tahokovi.github.io}{tahokovi.github.io}'+'\\par\n'
    roles = sections['experience'].find('ul')
    others = sections['experience'].find('div/ul')
    body = education(sections['education'])
    body += section('Research experience') + ''.join(experience(n) for n in list(roles)[:3])
    body += '\\newpage\n' + section('Research experience (continued)') + ''.join(experience(n) for n in list(roles)[3:])
    body += section('Other experience') + ''.join(experience(n) for n in others)
    body += skills(sections['skills'])
    body += '\\newpage\n' + research(sections['research'])
    body += conferences(sections['conferences']) + honors(sections['honors'])
    body += '\\vspace{5pt}\n{\\small References available upon request.}\\par\n'
    source = ROOT / 'CV' / 'CV_121525.tex'
    source.write_text(PREAMBLE + header + body + '\n\\end{document}\n')
    with tempfile.TemporaryDirectory(prefix='ahokovi-cv-') as directory:
        result = subprocess.run(['pdflatex', '-interaction=nonstopmode', '-halt-on-error',
                                 '-output-directory=' + directory, str(source)],
                                capture_output=True, text=True)
        log = (Path(directory) / 'CV_121525.log').read_text(errors='replace')
        (ROOT / 'CV' / 'CV_121525.log').write_text(log)
        if result.returncode:
            raise RuntimeError(result.stdout[-5000:])
        warnings = [line for line in log.splitlines() if 'Overfull' in line or 'Missing character' in line]
        if warnings:
            raise RuntimeError('\n'.join(warnings))
        shutil.copyfile(Path(directory) / 'CV_121525.pdf', ROOT / 'Ahokovi_CV.pdf')
    print('Updated the print CV at Ahokovi_CV.pdf.')


if __name__ == '__main__':
    main()
