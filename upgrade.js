(() => {
  const g = id => document.getElementById(id);
  const num = id => parseFloat(g(id)?.value) || 0;
  const fmt = (x,d=2) => Number(x).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

  const css = document.createElement('style');
  css.textContent = `
    .fields3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .results4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700;background:#e8f0ff;color:#194fb3}
    .status-ok{color:#166534;font-weight:800}.status-bad{color:#b91c1c;font-weight:800}.status-warn{color:#b45309;font-weight:800}
    .danger{border-left-color:#dc2626!important;background:#fef2f2!important}
    .list{margin:0;padding-left:18px;line-height:1.55}
    .mini{font-size:12px;color:#64748b}
    @media(max-width:900px){.fields3,.results4{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  const SOILS = {
    terra_vermelha_compactada:{name:'Terra vermelha compactada',gamma:19.0,phi:28.0,c:0,note:'Hipótese preliminar compatível com solo antigo e relativamente firme. Confirmar por sondagem.'},
    areia_fofa:{name:'Areia fofa',gamma:17.0,phi:28.0,c:0,note:'Mais deformável; atenção a recalques, escavação e presença de água.'},
    areia_compacta:{name:'Areia compacta',gamma:19.0,phi:34.0,c:0,note:'Tende a apresentar menor Ka, mas continua dependente da condição de drenagem.'},
    argila_mole:{name:'Argila mole',gamma:17.0,phi:20.0,c:0,note:'Condição desfavorável para fundações rasas. Não confiar em coesão aparente sem ensaio.'},
    argila_rija:{name:'Argila rija',gamma:18.5,phi:24.0,c:0,note:'Pode apresentar bom comportamento, mas a coesão não deve ser superestimada.'},
    aterro_compacto:{name:'Aterro compactado',gamma:18.0,phi:26.0,c:0,note:'A qualidade da compactação influencia diretamente o comportamento.'},
    aterro_solto:{name:'Aterro solto',gamma:17.5,phi:20.0,c:0,note:'Condição de maior incerteza. Recomenda-se investigação e premissas conservadoras.'}
  };

  const cards = [...document.querySelectorAll('.card')];
  const soilCard = cards.find(c => c.querySelector('h2')?.textContent.includes('2. Solo'));
  const cypeCard = cards.find(c => c.querySelector('h2')?.textContent.includes('4. Cargas'));
  const diagCard = cards.find(c => c.querySelector('h2')?.textContent.includes('5. Diagrama'));
  const memorialCard = cards.find(c => c.querySelector('h2')?.textContent.includes('6. Memorial'));

  if (soilCard) {
    soilCard.querySelector('h2').textContent = '2. Solo e ação lateral';
    const fields = soilCard.querySelector('.fields');
    fields.classList.add('fields3');
    fields.insertAdjacentHTML('afterbegin', `
      <div><label>Tipo de solo / condição</label>
        <select id="soloPreset">
          <option value="custom">Personalizado</option>
          <option value="terra_vermelha_compactada" selected>Terra vermelha compactada (estimativa)</option>
          <option value="areia_fofa">Areia fofa</option><option value="areia_compacta">Areia compacta</option>
          <option value="argila_mole">Argila mole</option><option value="argila_rija">Argila rija</option>
          <option value="aterro_compacto">Aterro compactado</option><option value="aterro_solto">Aterro solto</option>
        </select>
      </div>
    `);
    fields.insertAdjacentHTML('beforeend', `<div><label>Observação do terreno</label><input id="soloObs" type="text" value="Trecho crítico sobre solo antigo, porém sem sondagem."></div>`);
    soilCard.insertAdjacentHTML('beforeend', `<div class="note" id="soloInfo"></div>`);
  }

  if (cypeCard) {
    cypeCard.insertAdjacentHTML('afterend', `
      <section class="card">
        <h2>5. Recomendações sobre o solo</h2>
        <div id="soilRecommendation" class="note"></div>
        <ul class="list">
          <li><b>Solo antigo:</b> é um indício favorável, mas não substitui sondagem.</li>
          <li><b>Coesão:</b> para pré-dimensionamento conservador, mantenha <code>c = 0</code> quando não houver ensaio.</li>
          <li><b>Água:</b> mesmo solo firme pode se tornar crítico sem drenagem adequada.</li>
        </ul>
      </section>

      <section class="card">
        <h2>6. Fundação – parâmetros de triagem</h2>
        <div class="fields3">
          <div><label>Largura da sapata / viga B (m)</label><input id="bfund" type="number" step="0.01" value="0.60"></div>
          <div><label>Espessura da fundação (m)</label><input id="tfund" type="number" step="0.01" value="0.30"></div>
          <div><label>Tensão admissível preliminar (kPa)</label><input id="sigAdm" type="number" step="5" value="100"></div>
          <div><label>Atrito base-solo μ</label><input id="mu" type="number" step="0.01" value="0.45"></div>
          <div><label>γ concreto (kN/m³)</label><input id="gammaConc" type="number" step="0.5" value="25"></div>
          <div><label>γ alvenaria (kN/m³)</label><input id="gammaMasonry" type="number" step="0.5" value="14"></div>
          <div><label>Carga vertical adicional N (kN)</label><input id="Nadd" type="number" step="1" value="0"></div>
          <div><label>Altura d'água Hw desde a base (m)</label><input id="Hw" type="number" step="0.05" value="0"></div>
          <div><label>Diâmetro da broca (m)</label><input id="pileD" type="number" step="0.05" value="0.40"></div>
          <div><label>Distância entre eixos das brocas a (m)</label><input id="pileSpacing" type="number" step="0.05" value="0.60"></div>
          <div><label>Capacidade de compressão por broca (kN)</label><input id="pileCompCap" type="number" step="10" value="0"><small>0 = não verificar</small></div>
          <div><label>Capacidade de arrancamento por broca (kN)</label><input id="pileTensCap" type="number" step="10" value="0"><small>0 = não verificar</small></div>
        </div>
      </section>

      <section class="card full">
        <h2>7. Estabilidade simplificada e reação nas duas brocas</h2>
        <div class="results4">
          <div class="result"><div class="k">Peso vertical estimado V</div><div class="v" id="rV">–</div></div>
          <div class="result"><div class="k">Empuxo total H</div><div class="v" id="rRtot">–</div></div>
          <div class="result"><div class="k">Momento total M</div><div class="v" id="rMtot">–</div></div>
          <div class="result"><div class="k">Água – resultante adicional</div><div class="v" id="rWater">–</div></div>
          <div class="result"><div class="k">FS deslizamento</div><div class="v" id="rFSslide">–</div></div>
          <div class="result"><div class="k">FS tombamento</div><div class="v" id="rFSover">–</div></div>
          <div class="result"><div class="k">Excentricidade e</div><div class="v" id="rEcc">–</div></div>
          <div class="result"><div class="k">σmáx / σmín sob base</div><div class="v" id="rQbaseFound">–</div></div>
          <div class="result"><div class="k">Broca mais comprimida</div><div class="v" id="rPileMax">–</div></div>
          <div class="result"><div class="k">Broca oposta</div><div class="v" id="rPileMin">–</div></div>
          <div class="result"><div class="k">Horizontal por broca</div><div class="v" id="rPileH">–</div></div>
          <div class="result"><div class="k">Braço entre brocas</div><div class="v" id="rPileA">–</div></div>
        </div>
        <div id="foundationStatus" class="note warn"></div>
      </section>

      <section class="card full">
        <h2>8. Desenho conceitual com valores – seção e planta</h2>
        <svg viewBox="0 0 980 620" aria-label="Desenho conceitual do muro e das brocas">
          <defs>
            <marker id="uBlue" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#1f6feb"/></marker>
            <marker id="uBlk" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#111827"/></marker>
          </defs>
          <text x="22" y="30" font-size="19" font-weight="700">Seção transversal</text>
          <polygon points="80,110 350,110 350,340 80,340" fill="#c68642" opacity=".82"/>
          <rect x="350" y="110" width="38" height="230" fill="#d1d5db" stroke="#6b7280"/>
          <rect x="388" y="110" width="38" height="230" fill="#c97a3d" stroke="#8a5528"/>
          <rect x="340" y="206" width="98" height="16" fill="#9ca3af"/>
          <rect x="340" y="102" width="98" height="16" fill="#9ca3af"/>
          <rect x="325" y="340" width="130" height="25" fill="#9ca3af"/>
          <line x1="54" y1="110" x2="54" y2="340" stroke="#111827" marker-start="url(#uBlk)" marker-end="url(#uBlk)"/>
          <text id="uH" x="10" y="230" font-size="15" font-weight="700"></text>
          <text id="uSoil" x="88" y="132" font-size="14" font-weight="700"></text>
          <text id="uSoil2" x="88" y="151" font-size="12"></text>
          <text id="uPilar" x="455" y="130" font-size="13" font-weight="700"></text>
          <text id="uCinta" x="455" y="214" font-size="13" font-weight="700"></text>
          <text id="uBase" x="455" y="355" font-size="13" font-weight="700"></text>
          <line id="uArr1" x1="435" y1="130" x2="485" y2="130" stroke="#1f6feb" stroke-width="3" marker-end="url(#uBlue)"/>
          <line id="uArr2" x1="435" y1="195" x2="525" y2="195" stroke="#1f6feb" stroke-width="3" marker-end="url(#uBlue)"/>
          <line id="uArr3" x1="435" y1="260" x2="560" y2="260" stroke="#1f6feb" stroke-width="3" marker-end="url(#uBlue)"/>
          <line id="uArr4" x1="435" y1="325" x2="600" y2="325" stroke="#1f6feb" stroke-width="3" marker-end="url(#uBlue)"/>
          <text id="uTopLoad" x="610" y="135" font-size="13" fill="#1f6feb"></text>
          <text id="uBaseLoad" x="610" y="330" font-size="13" fill="#1f6feb"></text>

          <text x="22" y="410" font-size="19" font-weight="700">Planta do módulo de fundação</text>
          <rect x="130" y="455" width="700" height="38" fill="#d1d5db" stroke="#6b7280"/>
          <text x="380" y="480" font-size="14" font-weight="700">LINHA DO MURO</text>
          <rect x="455" y="438" width="50" height="72" fill="#c97a3d"/>
          <rect x="465" y="493" width="30" height="100" fill="#9ca3af" opacity=".6"/>
          <circle cx="480" cy="515" r="27" fill="#9fb4c8" stroke="#526a80" stroke-width="2"/>
          <circle cx="480" cy="575" r="27" fill="#9fb4c8" stroke="#526a80" stroke-width="2"/>
          <line x1="420" y1="515" x2="420" y2="575" stroke="#111827" marker-start="url(#uBlk)" marker-end="url(#uBlk)"/>
          <text id="uPileA" x="300" y="550" font-size="13" font-weight="700"></text>
          <text id="uPileD" x="525" y="535" font-size="13"></text>
          <text id="uN1" x="525" y="558" font-size="13" font-weight="700"></text>
          <text id="uN2" x="525" y="582" font-size="13" font-weight="700"></text>
          <line x1="160" y1="430" x2="360" y2="430" stroke="#1f6feb" stroke-width="4" marker-end="url(#uBlue)"/>
          <text id="uForce" x="160" y="422" font-size="13" font-weight="700" fill="#1f6feb"></text>
        </svg>
        <div class="note">Desenho ilustrativo. As reações nas brocas usam a aproximação rígida <b>N = V/2 ± M/a</b>. O dimensionamento das brocas depende da sondagem, comprimento, diâmetro, armadura e interação lateral com o solo.</div>
      </section>
    `);
  }

  if (diagCard) diagCard.querySelector('h2').textContent = '9. Diagrama de empuxo / carga no pilar';
  if (memorialCard) memorialCard.querySelector('h2').textContent = '10. Memorial resumido das equações';

  if (cypeCard) {
    const tb = cypeCard.querySelector('tbody');
    if (tb) tb.insertAdjacentHTML('beforeend', `
      <tr><th>Parcela hidrostática na base</th><td id="cWaterBase">0,00 kN/m</td></tr>
      <tr><th>Resultante total com água</th><td id="cRtot">–</td></tr>
      <tr><th>Momento total com água</th><td id="cMtot">–</td></tr>`);
  }

  const parseSection = txt => {
    const m = String(txt||'').replace(',','.').match(/([0-9.]+)\s*[xX×]\s*([0-9.]+)/);
    return m ? [parseFloat(m[1])/100,parseFloat(m[2])/100] : [0.20,0.30];
  };

  function applyPreset(){
    const p = g('soloPreset')?.value;
    if (!p || p==='custom') { upgradedCalc(); return; }
    const s = SOILS[p];
    g('gamma').value=s.gamma; g('phi').value=s.phi; g('coesao').value=s.c;
    upgradedCalc();
  }

  function upgradedCalc(){
    const H=num('H'), s=num('s'), gamma=num('gamma'), phi=num('phi'), surcharge=num('q'), c=num('coesao');
    const kamode=g('kamode')?.value || 'auto';
    const KaAuto=Math.pow(Math.tan(Math.PI/4-(phi*Math.PI/180)/2),2);
    const Ka=kamode==='manual'?num('kaman'):KaAuto;
    const pTop=Math.max(0,Ka*surcharge-2*c*Math.sqrt(Ka));
    const pBase=Math.max(0,Ka*(surcharge+gamma*H)-2*c*Math.sqrt(Ka));
    const wTop=pTop*s, wBase=pBase*s;
    const R=(wTop+wBase)*H/2;
    const M=(wTop*H)*(H/2)+((wBase-wTop)*H/2)*(H/3);

    const Hw=Math.max(0,Math.min(H,num('Hw'))), gammaW=9.81;
    const pWaterBase=gammaW*Hw;
    const Rw=0.5*pWaterBase*Hw*s;
    const Mw=Rw*(Hw/3);
    const Rtot=R+Rw, Mtot=M+Mw;
    const y=Rtot>0?Mtot/Rtot:0;

    // Atualiza resultados já existentes
    if(g('rKa')) g('rKa').textContent=fmt(Ka,3);
    if(g('rPtop')) g('rPtop').textContent=fmt(pTop)+' kPa';
    if(g('rPbase')) g('rPbase').textContent=fmt(pBase)+' kPa';
    if(g('rWtop')) g('rWtop').textContent=fmt(wTop)+' kN/m';
    if(g('rWbase')) g('rWbase').textContent=fmt(wBase)+' kN/m';
    if(g('rHres')) g('rHres').textContent=fmt(Rtot)+' kN';
    if(g('rM')) g('rM').textContent=fmt(Mtot)+' kN·m';
    if(g('rY')) g('rY').textContent=fmt(y)+' m acima da base';
    if(g('rTf')) g('rTf').textContent=fmt(Rtot/9.80665)+' tf';
    if(g('cH')) g('cH').textContent=fmt(H)+' m';
    if(g('cS')) g('cS').textContent=fmt(s)+' m';
    if(g('cWtop')) g('cWtop').textContent=fmt(wTop)+' kN/m';
    if(g('cWbase')) g('cWbase').textContent=fmt(wBase)+' kN/m';
    if(g('cR')) g('cR').textContent=fmt(Rtot)+' kN';
    if(g('cM')) g('cM').textContent=fmt(Mtot)+' kN·m';
    if(g('cWaterBase')) g('cWaterBase').textContent=fmt(pWaterBase*s)+' kN/m';
    if(g('cRtot')) g('cRtot').textContent=fmt(Rtot)+' kN';
    if(g('cMtot')) g('cMtot').textContent=fmt(Mtot)+' kN·m';

    const preset=SOILS[g('soloPreset')?.value];
    const soilName=preset?.name || 'Solo personalizado';
    const soilNote=preset?.note || 'Parâmetros inseridos manualmente. Verifique a compatibilidade com a investigação geotécnica.';
    if(g('soloInfo')) g('soloInfo').innerHTML=`<span class="badge">Solo atual</span> <b>${soilName}</b><br>γ = <b>${fmt(gamma,1)} kN/m³</b>, φ = <b>${fmt(phi,1)}°</b>, c = <b>${fmt(c,1)} kPa</b>, Ka = <b>${fmt(Ka,3)}</b>.<br>${soilNote}`;
    if(g('soilRecommendation')) {
      const key=g('soloPreset')?.value;
      g('soilRecommendation').className='note '+((key==='argila_mole'||key==='aterro_solto')?'danger':'ok');
      g('soilRecommendation').innerHTML=`<b>${soilName}:</b> ${soilNote}<br>Com os dados atuais, a carga horizontal de solo + sobrecarga na base do pilar é <b>${fmt(wBase)} kN/m</b>.`;
    }

    // Peso próprio aproximado por módulo
    const tBlock=(num('bloco')||20)/100, panelWidth=Math.max(0,s-0.20);
    const Wmasonry=tBlock*H*panelWidth*num('gammaMasonry');
    const Wpillar=0.20*0.45*H*num('gammaConc');
    const [bSup,hSup]=parseSection('20 x 30'), [bInt,hInt]=parseSection('20 x 30');
    const Wbeams=(bSup*hSup*s+bInt*hInt*s)*num('gammaConc');
    const B=num('bfund'), tf=num('tfund');
    const Wfoundation=B*tf*s*num('gammaConc');
    const V=Wmasonry+Wpillar+Wbeams+Wfoundation+num('Nadd');

    const mu=num('mu'), sigAdm=num('sigAdm');
    const FSslide=Rtot>0?mu*V/Rtot:999;
    const FSover=Mtot>0?V*(B/2)/Mtot:999;
    const ecc=V>0?Mtot/V:0;
    const qavg=B*s>0?V/(B*s):0;
    const qmax=B>0?qavg*(1+6*ecc/B):0;
    const qmin=B>0?qavg*(1-6*ecc/B):0;

    const a=num('pileSpacing'), pileDelta=a>0?Mtot/a:0;
    const N1=V/2+pileDelta, N2=V/2-pileDelta, Hpile=Rtot/2;
    const uplift=Math.max(0,-N2);
    const compCap=num('pileCompCap'), tensCap=num('pileTensCap');

    if(g('rV')) g('rV').textContent=fmt(V)+' kN';
    if(g('rRtot')) g('rRtot').textContent=fmt(Rtot)+' kN';
    if(g('rMtot')) g('rMtot').textContent=fmt(Mtot)+' kN·m';
    if(g('rWater')) g('rWater').textContent=fmt(Rw)+' kN';
    if(g('rFSslide')) g('rFSslide').textContent=fmt(FSslide,2);
    if(g('rFSover')) g('rFSover').textContent=fmt(FSover,2);
    if(g('rEcc')) g('rEcc').textContent=fmt(ecc,3)+' m';
    if(g('rQbaseFound')) g('rQbaseFound').textContent=fmt(qmax)+' / '+fmt(qmin)+' kPa';
    if(g('rPileMax')) g('rPileMax').textContent=fmt(N1)+' kN';
    if(g('rPileMin')) g('rPileMin').textContent=N2>=0?fmt(N2)+' kN comp.':fmt(uplift)+' kN arranc.';
    if(g('rPileH')) g('rPileH').textContent=fmt(Hpile)+' kN';
    if(g('rPileA')) g('rPileA').textContent=fmt(a)+' m';

    if(g('foundationStatus')) {
      const fsRef=1.50;
      let html=`<b>Triagem conceitual:</b><br>
        • Deslizamento: FS = <span class="${FSslide>=fsRef?'status-ok':'status-bad'}">${fmt(FSslide,2)}</span>.<br>
        • Tombamento da base corrida: FS = <span class="${FSover>=fsRef?'status-ok':'status-bad'}">${fmt(FSover,2)}</span> (hipótese simplificada de V centrada em B).<br>
        • Contato: σmáx = <b>${fmt(qmax)} kPa</b>, σmín = <b>${fmt(qmin)} kPa</b>, σadm preliminar = <b>${fmt(sigAdm)} kPa</b>.<br>
        • Duas brocas: N1 ≈ <b>${fmt(N1)} kN</b>; N2 ≈ <b>${N2>=0?fmt(N2)+' kN em compressão':fmt(uplift)+' kN de arrancamento'}</b>.`;
      if(qmin<0 || qmax>sigAdm) html += `<br><b>Atenção:</b> a sapata/viga de ${fmt(B)} m, isoladamente, não fecha bem nesta triagem. O par de brocas e/ou maior braço resistente passa a ser estruturalmente relevante.`;
      if(compCap>0) html += `<br>• Compressão informada: <span class="${N1<=compCap?'status-ok':'status-bad'}">${N1<=compCap?'atende':'não atende'}</span>.`;
      if(tensCap>0) html += `<br>• Arrancamento informado: <span class="${uplift<=tensCap?'status-ok':'status-bad'}">${uplift<=tensCap?'atende':'não atende'}</span>.`;
      g('foundationStatus').innerHTML=html;
    }

    // Atualiza desenho
    if(g('uH')) g('uH').textContent='H = '+fmt(H)+' m';
    if(g('uSoil')) g('uSoil').textContent=soilName;
    if(g('uSoil2')) g('uSoil2').textContent='γ='+fmt(gamma,1)+' | φ='+fmt(phi,1)+'° | Ka='+fmt(Ka,3);
    if(g('uPilar')) g('uPilar').textContent='Pilar 20 × 45 cm';
    if(g('uCinta')) g('uCinta').textContent='Cinta em z ≈ 2,00 m';
    if(g('uBase')) g('uBase').textContent='Fundação B = '+fmt(B)+' m';
    if(g('uTopLoad')) g('uTopLoad').textContent='topo '+fmt(wTop)+' kN/m';
    if(g('uBaseLoad')) g('uBaseLoad').textContent='base '+fmt(wBase+pWaterBase*s)+' kN/m';
    if(g('uPileA')) g('uPileA').textContent='a = '+fmt(a)+' m';
    if(g('uPileD')) g('uPileD').textContent='Brocas Ø '+fmt(num('pileD'))+' m';
    if(g('uN1')) g('uN1').textContent='N1 ≈ '+fmt(N1)+' kN';
    if(g('uN2')) g('uN2').textContent='N2 ≈ '+(N2>=0?fmt(N2)+' kN':fmt(uplift)+' kN ↑');
    if(g('uForce')) g('uForce').textContent='Htot ≈ '+fmt(Rtot)+' kN';

    // Diagrama original
    if(g('poly')) {
      const wBaseDraw=wBase+pWaterBase*s;
      const xTop=170+Math.min(260,Math.max(20,wTop*3.1));
      const xBase=170+Math.min(340,Math.max(40,wBaseDraw*3.1));
      g('poly').setAttribute('points',`170,50 ${xTop},50 ${xBase},310 170,310`);
      g('topArrow').setAttribute('x2',xTop); g('baseArrow').setAttribute('x2',xBase);
      g('tTop').setAttribute('x',Math.min(520,xTop+8)); g('tBase').setAttribute('x',Math.min(520,xBase+8));
      g('tTop').textContent=fmt(wTop)+' kN/m'; g('tBase').textContent=fmt(wBaseDraw)+' kN/m'; g('tH').textContent='H = '+fmt(H)+' m';
    }

    if(g('memorial')) g('memorial').innerHTML=`
      <b>Rankine:</b> Ka = tan²(45° − φ/2) = <b>${fmt(Ka,3)}</b>.<br>
      <b>Solo + sobrecarga:</b> carga no pilar de <b>${fmt(wTop)} kN/m</b> no topo até <b>${fmt(wBase)} kN/m</b> na base; R = <b>${fmt(R)} kN</b>; M = <b>${fmt(M)} kN·m</b>.<br>
      <b>Água:</b> Hw = ${fmt(Hw)} m; Rw = <b>${fmt(Rw)} kN</b>; Mw = <b>${fmt(Mw)} kN·m</b>. Nesta triagem, a água é somada sem reduzir o peso efetivo do solo, de forma conservadora.<br>
      <b>Total:</b> H = <b>${fmt(Rtot)} kN</b>; M = <b>${fmt(Mtot)} kN·m</b>; resultante equivalente a ${fmt(y)} m acima da base.<br><br>
      <b>Base corrida – triagem:</b> V ≈ ${fmt(V)} kN; FSdesl ≈ ${fmt(FSslide,2)}; FStomb ≈ ${fmt(FSover,2)}; e ≈ ${fmt(ecc,3)} m; σmáx/σmín ≈ ${fmt(qmax)}/${fmt(qmin)} kPa.<br>
      <b>Duas brocas:</b> para a = ${fmt(a)} m, N1 ≈ ${fmt(N1)} kN e N2 ≈ ${fmt(N2)} kN. Se N2 for negativo, seu módulo exige resistência ao arrancamento naquela broca.<br><br>
      <b>CYPECAD:</b> lançar solo + sobrecarga como carga trapezoidal de ${fmt(wTop)} a ${fmt(wBase)} kN/m ao longo de ${fmt(H)} m. Se Hw &gt; 0, acrescentar pressão hidrostática triangular de zero no nível d'água até ${fmt(pWaterBase*s)} kN/m na base.`;
  }

  window.calc = upgradedCalc;
  if(g('soloPreset')) g('soloPreset').addEventListener('change',applyPreset);
  ['H','s','gamma','phi','q','coesao','kaman','kamode','bfund','tfund','sigAdm','mu','gammaConc','gammaMasonry','Nadd','Hw','pileD','pileSpacing','pileCompCap','pileTensCap','soloObs']
    .forEach(id => g(id)?.addEventListener('input',upgradedCalc));

  // inicia com o preset do solo do projeto
  if(g('soloPreset')) applyPreset(); else upgradedCalc();
})();
