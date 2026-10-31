"""Convert a captured HTML fragment into JSX (used once to port the reference prototype's markup).

Usage: python3 scripts/html2tsx.py <file.html> <css-selector-ish: tag#id | tag.class | tag> [--inner]
Prints JSX for the first matching element. Internal <a href="/..."> become <Link>.
"""
import re, sys
from html.parser import HTMLParser

VOID = {"area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"}
SVG_TAGS = {t.lower(): t for t in ["radialGradient","linearGradient","clipPath","feGaussianBlur","feOffset","feBlend","feColorMatrix","feMerge","feMergeNode","foreignObject","textPath","animateTransform"]}
ATTR = {"class":"className","for":"htmlFor","tabindex":"tabIndex","viewbox":"viewBox","readonly":"readOnly","maxlength":"maxLength","minlength":"minLength","autocomplete":"autoComplete","autoplay":"autoPlay","playsinline":"playsInline","crossorigin":"crossOrigin","srcset":"srcSet","colspan":"colSpan","rowspan":"rowSpan","gradientunits":"gradientUnits","gradienttransform":"gradientTransform","preserveaspectratio":"preserveAspectRatio","xlink:href":"xlinkHref","xmlns:xlink":"xmlnsXlink","fetchpriority":"fetchPriority","enterkeyhint":"enterKeyHint","inputmode":"inputMode","novalidate":"noValidate","datetime":"dateTime","allowfullscreen":"allowFullScreen","frameborder":"frameBorder","pathlength":"pathLength"}
BOOL = {"hidden","disabled","checked","required","selected","multiple","autoplay","muted","loop","playsinline","controls","novalidate","readonly","allowfullscreen"}
SELF_SVG = {"path","circle","rect","line","polyline","polygon","stop","use","ellipse","fegaussianblur","feoffset","feblend","fecolormatrix","femergenode"}

def camel(n):
    if n.startswith(("aria-","data-")): return n
    if n in ATTR: return ATTR[n]
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), n)

def style_obj(s):
    parts=[]
    for decl in filter(None,[d.strip() for d in s.split(";")]):
        k,_,v=decl.partition(":"); k=k.strip(); v=v.strip()
        key = f'"{k}"' if k.startswith("--") else re.sub(r"-([a-z])", lambda m: m.group(1).upper(), k)
        parts.append(f'{key}: {v!r}'.replace("'",'"') if not k.startswith("--") else f'{key}: {v!r}'.replace("'",'"'))
    return "{{" + ", ".join(parts) + "}}"

def esc_text(t):
    return t.replace("{","{'{'}").replace("}","{'}'}").replace("'","&apos;").replace('"',"&quot;").replace(">","&gt;").replace("<","&lt;")

class Conv(HTMLParser):
    def __init__(self, sel, inner):
        super().__init__(convert_charrefs=True)
        tag, _, rest = re.match(r"([a-z0-9]+)([#.]?)(.*)", sel).groups()
        self.sel=(tag, _, rest); self.inner=inner
        self.depth=0; self.cap=None; self.out=[]; self.stack=[]; self.done=False
    def match(self,t,a):
        tag,kind,val=self.sel
        if t!=tag: return False
        if kind=="#": return a.get("id")==val
        if kind==".": return val in (a.get("class") or "").split()
        return True
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if self.done: return
        if self.cap is None and self.match(t,a):
            self.cap=self.depth
            if self.inner:
                if t not in VOID: self.depth+=1
                return
        if self.cap is not None:
            name=SVG_TAGS.get(t,t)
            if t=="a" and (a.get("href") or "").startswith("/") and not a["href"].startswith("//"): name="Link"
            props=[]
            for k,v in attrs:
                if k=="style": props.append(f"style={style_obj(v or '')}"); continue
                if k in BOOL and (v is None or v=="" or v==k): props.append(camel(k)); continue
                if v is None: props.append(camel(k)); continue
                props.append(f'{camel(k)}="{v}"' if '"' not in v else f"{camel(k)}={{{v!r}}}")
            selfclose = t in VOID or t in SELF_SVG
            self.out.append(f"<{name}{(' '+' '.join(props)) if props else ''}{' />' if selfclose else '>'}")
            if not selfclose: self.stack.append(name)
        if t not in VOID and t not in SELF_SVG: self.depth+=1
    def handle_startendtag(self,t,attrs):
        self.handle_starttag(t,attrs)
        if t not in VOID and t not in SELF_SVG:
            self.handle_endtag(t)
    def handle_endtag(self,t):
        if self.done: return
        if t in VOID or t in SELF_SVG: return
        self.depth-=1
        if self.cap is not None:
            if self.depth==self.cap:
                if not self.inner: self.out.append(f"</{self.stack.pop()}>")
                self.done=True; return
            if self.stack: self.out.append(f"</{self.stack.pop()}>")
    def handle_data(self,d):
        if self.cap is None or self.done: return
        if not d.strip():
            if d and "\n" not in d: self.out.append('{" "}')  # significant inline space
            return
        t=esc_text(re.sub(r"\s+"," ",d).strip())
        lead='{" "}' if d[0].isspace() else ""; trail='{" "}' if d[-1].isspace() else ""
        self.out.append(lead+t+trail)

html=open(sys.argv[1]).read()
html=re.sub(r"<script.*?</script>","",html,flags=re.S); html=re.sub(r"<!--.*?-->","",html,flags=re.S)
c=Conv(sys.argv[2], "--inner" in sys.argv); c.feed(html)
print("\n".join(c.out))
